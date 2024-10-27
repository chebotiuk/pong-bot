import { ethers } from 'ethers';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { queryRecordByPartitionKey, updateRecord } from './db.mjs';

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
    try {
      const messageBody = JSON.parse(record.body);
      const txHash = messageBody.txHash;
      console.log('TxHash:', txHash);
      
      const txStatus = await queryRecordByPartitionKey('txStatus', 'txHash', txHash);

      console.log('txStatus:', txStatus);
      
      const hasBeenResponded = txStatus?.value === 'responded';
      if (hasBeenResponded) {
        console.log(`Transaction ${txHash} has been already processed & pong response sended, stopping function.`)
        await deleteSQSMessage(record);
        return;
      }

      const tx = await contract.pong(txHash);
      await tx.wait(); // Wait for the transaction to be mined
      console.log(`pong() called for transaction: ${txHash}`);

      await updateRecord(
        'txStatus',
        { txHash, timestamp: txStatus.timestamp },
        'SET #value = :value',
        { ':value': 'responded' },
        { '#value': 'value' }
      );
      
      await deleteSQSMessage(record);
    } catch (error) {
      console.error(`Error processing transaction ${txHash}:`, error);
      const unixTimestamp = Math.floor(Date.now() / 1000);
      await updateRecord(
        'txStatus',
        { txHash, timestamp: txStatus.timestamp },
        'SET #value = :value',
        { ':value': 'Error while processing transaction: ' + (error.message || error.messageBody || 'Unknown error') },
        { '#value': 'value' }
      );

      // Optional: Send notification to incident observation tool
      throw error;
    }
  }
};
