import { ethers } from 'ethers';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { queryRecordsByPartitionKey, upsertRecord } from './db.mjs';

// Initialize the SQS client
const sqs = new SQSClient({ region: 'us-east-1' }); // Specify your region
const queueUrl = process.env.SQS_QUEUE_URL; // Your SQS Queue URL
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const abi = [
  "event Ping()",
  "function pong(bytes32 _txHash) external"
];

// Initialize provider and wallet for interacting with the Ethereum contract
const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

async function deleteSQSMessage(record) {
  // Delete the message from the queue after successful processing
  const deleteParams = {
    QueueUrl: queueUrl,
    ReceiptHandle: record.receiptHandle
  };
  const deleteCommand = new DeleteMessageCommand(deleteParams);
  await sqs.send(deleteCommand);
  console.log(`Message deleted from queue: ${record.messageId}`);
}

export const handler = async (event) => {
  // Iterate through each SQS message
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    const txHash = messageBody.txHash; // Assuming your message has txHash
    console.log('TxHash:', txHash);
    
    const txStatus = await queryRecordsByPartitionKey('txStatus', 'txHash', txHash);

    console.log('txStatus:', txStatus);
    
    const hasBeenResponded = txStatus?.value === 'responded';
    if (hasBeenResponded) {
      console.log(`Transaction ${txHash} has been already processed & pong response sended, stopping function.`)
      await deleteSQSMessage(record);
      return;
    }

    try {
      const tx = await contract.pong(txHash);
      await tx.wait(); // Wait for the transaction to be mined
      console.log(`pong() called for transaction: ${txHash}`);

      const unixTimestamp = Math.floor(Date.now() / 1000);
      await upsertRecord('txStatus', {
        txHash,
        value: 'responded',
        timestamp: unixTimestamp,
      });
      
      await deleteSQSMessage(record);
    } catch (error) {
      console.error(`Error processing transaction ${txHash}:`, error);
      throw error;
    }
  }
};
