# PingPong Ethereum Bot

This repository contains a serverless bot for interacting with the Ethereum blockchain using AWS services. The bot listens for ping transactions and responds with pong transactions while managing potential issues like gas price spikes and transaction failures.

## Overview
- To run server use `npm start` command

- **Contracts**: The `contracts` folder contains the Solidity smart contract (`PingPong.sol`) used for testing. The compiled JSON artifact is located in the `build/contracts` directory.
  
- **callPong**: This folder contains the Lambda function code that handles ping transactions and sends pong responses.

- **dlqHandler**: This folder contains the Lambda function code that processes the Dead Letter Queue (DLQ).

## Environment Variables

To run the project, you need to set the following environment variables in your `.env` file or your deployment environment:

- **AWS_ACCESS_KEY_ID**: Your AWS access key ID for authenticating AWS services.
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret access key for authenticating AWS services.
- **SQS_QUEUE_URL**: The URL of the main SQS FIFO queue for ping transactions.
- **INFURA_URL**: Your Infura endpoint URL for Ethereum JSON-RPC.
- **INFURA_WS_URL**: Your Infura WebSocket URL for Ethereum.
- **PRIVATE_KEY**: The private key of the wallet that will send transactions.
- **CONTRACT_ADDRESS**: The deployed smart contract address. For testing purposes, use `compile-and-deploy` command ot deploy a test contract into Sepolia network.
- **DLQ_URL**: The URL of the Dead Letter Queue (DLQ) for handling failed messages.

## Project Setup

1. **AWS EC2**: Use an EC2 instance for the server component of the application.

2. **SQS Queues**: 
   - You will need two SQS queues:
     - A **main SQS FIFO queue** for processing ping transactions.
     - A **Dead Letter Queue (DLQ)** for handling failed messages.

3. **AWS Lambda Functions**: 
   - Set up two Lambda functions:
     - One for sending pong events (`callPong`).
     - Another for handling messages in the DLQ (`dlqHandler`).

## Deployment

### Deploying the Smart Contract

To deploy the smart contract, run the `deployContract.js` script:

```bash
node deployContract.js
```

Make sure to have the necessary environment variables set up.

### Running the Bot

The bot listens for messages from the main SQS queue and processes them accordingly. The handler is set up in the `callPong/index.mjs` file.

### Managing Transactions

The bot includes logic to handle situations where transactions may become stuck due to gas price spikes. The bot will check the status of transactions and resend them if necessary.

## Testing

The `contracts` folder contains the `PingPong.sol` contract for testing purposes. You can run tests using Truffle or another testing framework of your choice.

## Credits

This project is built using the following technologies:
- [Ethereum](https://ethereum.org/)
- [AWS](https://aws.amazon.com/)
- [ethers.js](https://docs.ethers.io/v5/)
- [Node.js](https://nodejs.org/)

