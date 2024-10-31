require('dotenv').config();
const { ethers } = require('ethers');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const { initBlock } = require('./initBlock');
const { upsertRecord } = require('./db');
const { initPendingTransactions } = require('./initPendingTransactions');
const { emitter } = require('./eventEmitter');

const provider = new ethers.WebSocketProvider(process.env.INFURA_WS_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // 0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d

const sqs = new SQSClient({ region: 'us-east-1' });
const queueUrl = process.env.SQS_QUEUE_URL;

async function init() {
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  const abi = [
    "event Ping()"
  ];
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  emitter.on('transaction_found', ({ txHash }) => {
    processTransaction(txHash);
  });
  
  contract.on('Ping', async (event) => {
    const txHash = event.log.transactionHash;
    if (txHash) {
      console.log(`Ping detected! Transaction: ${txHash}`);
      await processTransaction(txHash);
    } else {
      console.error("Error: txHash is undefined.");
    }
  });
}

async function sendMessageToSQS(txHash) {
  const params = {
    MessageBody: JSON.stringify({ txHash }),
    QueueUrl: queueUrl,
    MessageGroupId: 'PingMessages'  // MessageGroupId required for FIFO queue
  };
  
  try {
    const command = new SendMessageCommand(params);
    const result = await sqs.send(command);
    console.log(`Message sent to SQS. MessageId: ${result.MessageId}`);
  } catch (error) {
    console.error(`Error sending message to SQS: ${error}`);
  }
}

async function processTransaction(txHash) {
  await sendMessageToSQS(txHash);

  const unixTimestamp = Math.floor(Date.now() / 1000);
  await upsertRecord('txStatus', {
    txHash,
    value: 'recieved',
    timestamp: unixTimestamp,
  });
}

initBlock()
.then(init)
.then(() => {
  console.log('Bot is running and waiting for Ping events...');
}).catch(err => {
  console.error('Error during initialization:', err);
});

initPendingTransactions();

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
