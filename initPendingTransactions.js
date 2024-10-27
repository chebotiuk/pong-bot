require('dotenv').config();
const { ethers } = require('ethers');
const { getLatest } = require('./db');

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function getFollowingTransactions(transactionHash, contractAddress) {
  try {
      // Step 1: Get transaction details to find the block number
      const tx = await provider.getTransaction(transactionHash);
      
      if (!tx || !tx.blockNumber) {
          console.error("Transaction not found or does not have a block number.");
          return;
      }

      console.log(`Last recieved transaction (txHash ${transactionHash}) block number is: ${tx.blockNumber}`);

      const startBlockNumber = tx.blockNumber + 1; // Start from the next block

      let followingTransactions = [];

      const blocksToCheck = 10; // Adjust this number as needed

      for (let i = 0; i < blocksToCheck; i++) {
          const block = await provider.getBlock(startBlockNumber + i);
          if (!block || !block.transactions) continue; // Skip if no transactions

          // Fetch transactions for the block
          const blockWithTxs = await Promise.all(
              block.transactions.map(txHash => provider.getTransaction(txHash))
          );

          // Filter for transactions to the contract address
          const txsInBlock = blockWithTxs
              .filter(t => t && t.to && t.to.toLowerCase() === contractAddress.toLowerCase())
              .map(t => t.hash);

          followingTransactions.push(...txsInBlock);
      }

      return followingTransactions;
  } catch (error) {
      console.error("Error fetching transactions:", error);
  }
}

async function initPendingTransactions() {
    try {
      const latestTransaction = await getLatest('txStatus');

      console.log('Latest recieved transaction', latestTransaction);

      const txs = await getFollowingTransactions(latestTransaction.txHash, CONTRACT_ADDRESS);
      console.log("Following transaction hashes:", txs);

      return txs;
    } catch (error) {
      console.error('Error while waiting:', error);
      throw error;
    }
};

module.exports = { initPendingTransactions };
