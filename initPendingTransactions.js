require('dotenv').config();
const { ethers } = require('ethers');
const { getLatest, queryRecordByPartitionKey, upsertRecord, readRecord, deleteRecord } = require('./db');
const { extractTxData } = require('./decodeTx');
const { INFURA_COST_eth_blockNumber, INFURA_COST_eth_getTransactionByHash, DAILY_CREDITS } = require('./credits');
const { emitter } = require('./eventEmitter');

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

      console.log(`Last received transaction (txHash ${transactionHash}) block number is: ${tx.blockNumber}`);

      const scanBlockBias = Number(await readRecord('Block', { prop: 'txScanningLastBlockNumber' })) || 0;
      const startBlockNumber = tx.blockNumber + 1; // Start from the next block
      const latestBlockNumber = await provider.getBlockNumber(); // Get the latest block number
      const blocksToScan = latestBlockNumber - startBlockNumber; // Calculate the number of blocks to check
      console.log('Blocks to scan: ' + blocksToScan)

      // Retrieving credit amount per day for INFURA provider, allocating 80% for scanning missed blocks while server off
      const totalCallsAllowed = Math.round(DAILY_CREDITS * 0.8 / (INFURA_COST_eth_blockNumber + INFURA_COST_eth_getTransactionByHash));
      console.log('Total calls amount allocated for missed transactions scanning per 24h: ' + totalCallsAllowed);
      const scanTimeoutOffset = (1440 * 60 * 1000) / totalCallsAllowed; // 24 house in milliseconds / totalCallsAllowed
      console.log('Scan timeout offset in munutes: ', 1440 / totalCallsAllowed);

      for (let i = scanBlockBias; i <= blocksToScan; i++) {
        console.log(
          'Blocks to scan: ' + blocksToScan,
          'Current iteration: ' + i
        );
        await new Promise(resolve => setTimeout(resolve, scanTimeoutOffset));

        try {
          const block = await provider.getBlock(startBlockNumber + i);
          if (!block || !block.transactions) return; // Skip if no transactions

          // Fetch transactions for the block
          const blockWithTxs = await Promise.all(
              block.transactions.map(txHash => provider.getTransaction(txHash))
          );

          // Filter for transactions to the contract address
          const txsInBlock = blockWithTxs
              .filter(t => {
                const isPingTx = extractTxData(t.data)?.name === 'ping';
                return t && (t.to && t.to.toLowerCase() === contractAddress.toLowerCase()) && isPingTx
              })
              .map(t => t.hash);

          // Filter transactions that has been already processed
          let filteredTxs = await Promise.all(
            txsInBlock.map(async (tx) => {
              const txStatus = await queryRecordByPartitionKey('txStatus', 'txHash', tx);
              return txStatus ? null : tx;
            })
          );
          filteredTxs = filteredTxs.filter(tx => tx !== null);
    
          console.log("Unprocessed transaction hashes:", filteredTxs);
          for (const txHash of filteredTxs) {
            emitter.emit('transaction_found', { txHash });
          } 
        } catch (error) {
          if (error.message.includes('exceeded maximum retry limit')) {
            console.error('Daily request count exceeded. Retrying after 12 hours...');
            await upsertRecord('Block', {
              prop: 'txScanningLastBlockNumber',
              value: i + '',
            })

            // Wait for 12 hours (12 * 60 * 60 * 1000 milliseconds)
            await new Promise(resolve => setTimeout(resolve, 12 * 60 * 60 * 1000));
            return getFollowingTransactions(transactionHash, contractAddress);
          } else {
            console.error("Error fetching the block", error);
            throw error;
          }
        }
      }

      // Cleanup markers
      await deleteRecord('Block', 'txScanningLastBlockNumber');
  } catch (error) {
      console.error("Error fetching transactions:", error);
  }
}

async function initPendingTransactions() {
    try {
      const latestTransaction = await getLatest('txStatus');
      console.log('Latest recieved transaction', latestTransaction);

      if (!latestTransaction) {
        console.log('No pending transactions found');
        return;
      }

      await getFollowingTransactions(latestTransaction.txHash, CONTRACT_ADDRESS);
    } catch (error) {
      console.error('Error while waiting:', error);
      throw error;
    }
};

module.exports = { initPendingTransactions };

