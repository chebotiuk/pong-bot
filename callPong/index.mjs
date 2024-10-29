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

async function isTransactionMined(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log('Reciept for transaction ' + txHash, receipt);

  if (receipt === null) {
      console.log(`Transaction ${txHash} is still pending.`);
      return false;  // Transaction has not been mined yet
  } else if (receipt.status === 1) {
      console.log(`Transaction ${txHash} was successfully mined.`);
      return true;   // Transaction was mined successfully
  } else {
      console.log(`Transaction ${txHash} failed.`);
      throw new Error('Transaction ${txHash} failed.');  // Transaction was mined but failed
  }
}

async function resendTransactionWithHigherGas(txHash, nonce) {
  try {
    const gasPrice = await provider.getGasPrice();
    const higherGasPrice = gasPrice.mul(ethers.BigNumber.from(2)); // Increment price twice

    const tx = await contract.pong(txHash, {
      nonce: nonce,
      gasPrice: higherGasPrice
    });
    
    await tx.wait(); // Wait for the transaction to be mined
    console.log(`Resent pong() for transaction ${txHash} with higher gas price: ${higherGasPrice.toString()}`);
  } catch (error) {
    console.error(`Error while resending transaction ${txHash}:`, error);
    throw error; // Re-throw error for handling in main handler
  }
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
      
      const hasBeenResponded = txStatus?.value === 'resp_tx_mined';
      if (hasBeenResponded) {
        console.log(`Transaction ${txHash} has been already processed & pong response sended, stopping function.`)
        await deleteSQSMessage(record);
        return;
      }

      const hasBeenSent = txStatus?.value.includes('resp_tx_sent'); // format resp_tx_sent:nonce
      console.log('Response has been sent', hasBeenSent);
      // Check if the previous transaction was mined. Lambda has a 5-minute timeout, but Ethereum transactions typically mine in ~15 seconds. 
      // If a transaction record has "resp_tx_sent" status, it wasn't mined during the last function execution. 
      // To avoid competing transactions with identical nonces and prevent stalls, increase the gas fee.
      if (hasBeenSent) {
        const isMined = await isTransactionMined(txHash);
        if (!isMined) {
          const nonce = txStatus?.value.split(':')[1];
          console.log(
            'Response tx has been sent already but still havent been mined, sending new transaction with higher fee & same nonce ' + nonce
          );
          await resendTransactionWithHigherGas(txHash, newGasPrice);
        }

        // if transaction has been already mined - do nothing
      } else {
        const tx = await contract.pong(txHash);
        await updateRecord(
          'txStatus',
          { txHash, timestamp: txStatus.timestamp },
          'SET #value = :value',
          { ':value': 'resp_tx_sent:' + tx.nonce},
          { '#value': 'value' }
        );
  
        await tx.wait(); // Wait for the transaction to be mined
        console.log(`pong() called for transaction: ${txHash}`);
      }

      await updateRecord(
        'txStatus',
        { txHash, timestamp: txStatus.timestamp },
        'SET #value = :value',
        { ':value': 'resp_tx_mined' },
        { '#value': 'value' }
      );
      
      await deleteSQSMessage(record);
    } catch (error) {
      console.error(`Error processing transaction ${txHash}:`, error);
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
