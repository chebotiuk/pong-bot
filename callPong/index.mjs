import { ethers } from 'ethers';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';

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

export const handler = async (event) => {
    // Iterate through each SQS message
    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        
        const txHash = messageBody.txHash; // Assuming your message has txHash

        try {
            const tx = await contract.pong(txHash);
            await tx.wait(); // Wait for the transaction to be mined
            console.log(`pong() called for transaction: ${txHash}`);
            
            // Delete the message from the queue after successful processing
            const deleteParams = {
                QueueUrl: queueUrl,
                ReceiptHandle: record.receiptHandle
            };
            const deleteCommand = new DeleteMessageCommand(deleteParams);
            await sqs.send(deleteCommand);
            console.log(`Message deleted from queue: ${record.messageId}`);
        } catch (error) {
            console.error(`Error processing transaction ${txHash}:`, error);
            throw error;
        }
    }
};
