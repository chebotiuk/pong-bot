// deploy.js
require("dotenv").config();
const { ethers, JsonRpcProvider } = require("ethers");
const compiledJson = require("./build/contracts/PingPong");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_URL = process.env.INFURA_URL;  // Your Infura project ID

async function main() {
  // Connect to the Sepolia testnet
  const provider = new JsonRpcProvider(INFURA_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Create a contract factory
  const factory = new ethers.ContractFactory(compiledJson.abi, compiledJson.bytecode, wallet);

  // Deploy the contract
  const contract = await factory.deploy();  // Here, you deploy the contract

  console.log("Response:", contract);
  console.log("Contract deployed at address:", contract.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
