require('dotenv').config();
const { ethers, JsonRpcProvider } = require('ethers');

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_URL = process.env.INFURA_URL;  // Your Infura project ID
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Replace INFURA_URL with your actual Infura URL
const provider = new JsonRpcProvider(INFURA_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Define contract ABI
const pingPongAbi = [
  "function ping() external",
  "event Ping()",
  "function pinger() view returns (address)"
];

// Create a contract instance
const pingPongContract = new ethers.Contract(CONTRACT_ADDRESS, pingPongAbi, wallet);

async function sendPing() {
  try {
    // Ensure the wallet is the pinger
    const pinger = await pingPongContract.pinger();
    if (pinger !== wallet.address) {
      console.log(`Error: The current pinger is ${pinger}, and you are ${wallet.address}.`);
      return;
    }

    // Send the ping transaction
    const tx = await pingPongContract.ping();
    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction mined in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error(`Error sending ping: ${error.message}`);
  }
}

// Execute the ping
sendPing();
