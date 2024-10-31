require('dotenv').config();
const { ethers } = require('ethers');

// Example ABI
const abi = [
  "event Pong()",
  "function pong(bytes32 _txHash) external",
  "function ping() external",
  "event Ping()",
  "function pinger() view returns (address)"
];

// Initialize the Interface
const iface = new ethers.Interface(abi);

// Decode the transaction data
//
// const decodedData = iface.parseTransaction({ data: '0x05ba79a2e27b32b7316f516abb81d7c0652977ca3ad89526ab3070e6d9eeea7b5099d347' });
// console.log(decodedData.fragment.name);

function extractTxData(data) { return iface.parseTransaction({ data }) };

module.exports = {
  extractTxData,
};
