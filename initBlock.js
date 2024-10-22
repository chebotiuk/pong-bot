require('dotenv').config();
const { ethers } = require('ethers');
const { upsertRecord, readRecord } = require('./db');

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);

/**
 * Get the latest block number from the blockchain.
 * @returns A promise that resolves to the latest block number.
 */
const getLatestBlockNumber = async () => {
    try {
        const latestBlockNumber = await provider.getBlockNumber();
        console.log(`The latest block number is: ${latestBlockNumber}`);
        return latestBlockNumber;
    } catch (error) {
        console.error('Error fetching the latest block number:', error);
        throw error;
    }
};

/**
 * Waits until the current block number is confirmed (i.e., it has been mined).
 * @param desiredBlockNumber - The current block number to wait for.
 * @returns A promise that resolves once the current block has been confirmed.
 */
const waitForBlockToBeMined = async (desiredBlockNumber) => {
    console.log(`Waiting for block ${desiredBlockNumber} to be confirmed...`);
    
    let latestBlockNumber = await getLatestBlockNumber();

    // Wait until the latest block number is at least the current block number
    while (latestBlockNumber < desiredBlockNumber) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before checking again
        latestBlockNumber = await getLatestBlockNumber();
    }

    console.log(`Block ${desiredBlockNumber} has been confirmed.`);
    return latestBlockNumber;
};

// Example usage
(async () => {
    try {
        let desiredBlockNumber;

        const data = await readRecord('Block', { prop: 'initialBlockNumber' });
        if (data) {
          desiredBlockNumber = data.value;
          console.log('Initial block record found in db: ' + desiredBlockNumber)
        } else {
          const currentBlockNumber = await getLatestBlockNumber();
          desiredBlockNumber = currentBlockNumber + 1 // ? get from DB

          await upsertRecord('Block', {
            prop: 'initialBlockNumber',
            value: desiredBlockNumber,
          })
        }

        // Wait until the current block has been confirmed
        await waitForBlockToBeMined(desiredBlockNumber);

        console.log('The current block has been confirmed.');
    } catch (error) {
        console.error('Error while waiting for the block to be confirmed:', error);
    }
})();
