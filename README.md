# TransferScheduler Contract

## Overview
The TransferScheduler is a public goods smart contract to facilitate scheduled ERC20 token transfers on the Ethereum blockchains. It allows users to queue transfers that will be executed at a specified future time, ensuring that transactions occur automatically without the need for manual intervention. This offers:

- **Better Capital Efficiency**: Users retain control of their ERC20 tokens until the scheduled transaction date, allowing them to accrue interest and rewards or utilize funds for other purposes in the interim.
- **Onchain Transparency**: Senders and Recipients can view upcoming transfers directly on the blockchain, enhancing financial transparency.
- **Convenience**: This allows users to plan and automate payments, improving convenience. Ideal for routine payments, such as remittances, DAO disbursements, and small business payroll.

## Features
- **Non-Monotonic Nonces**: Allows for flexible scheduling of transactions at arbitrary points in time, independent of previous transactions.
- **Relayer gas compensation**: The contract compensates relayers for gas fees in WETH and includes a percentage of the gas fees as reward, incentivizing relayers to perform the transfers.
- **Gas Price Threshold**: Transfers will not be executed if the network gas price is higher than a specified threshold (maxBaseFee).
- **Event Watching**: The relay worker watches for [TransferScheduled](cci:2://file:///./frontend/src/App.tsx:9:0-9:62) events emitted by the TransferScheduler contract.

## Types
```typescript
type ScheduledTransfer = {
    owner: `0x${string}`;
    nonce: number;
    token: `0x${string}`;
    to: `0x${string}`;
    amount: number;
    spender: `0x${string}`;
    notBeforeDate: number;
    notAfterDate: number;
    maxBaseFee: number;
};
```

## Components
### Smart Contract
The core functionality is implemented in the TransferScheduler smart contract, which includes methods for:
- Queuing signed scheduled transfers. 70k gas
- Executing scheduled transfers based on predefined conditions. 130k gas

### Client SDK
The client SDK provides a JavaScript library for interacting with the TransferScheduler contract. It includes functions for:
- Queuing a signed scheduled transfer.
- Watching for [TransferScheduled](cci:2://file:///./frontend/src/App.tsx:9:0-9:62) events.
- Types for creating and signing scheduled transfers.

### Relay Worker
The relay worker is responsible for:
- Listening for [TransferScheduled](cci:2://file:///./frontend/src/App.tsx:9:0-9:62) events.
- Writing event entries to a queue.
- Waiting until the specified `notBeforeDate` before executing the transfer.
- Executing the transfer with a pre-signed signature.

### Frontend
The frontend provides an example user interface for creating and signing scheduled transfers, and watching for [TransferScheduled](cci:2://file:///./frontend/src/App.tsx:9:0-9:62) events. Example published at [https://mnrgreg.github.io/TransferScheduler/](https://mnrgreg.github.io/TransferScheduler/) for Sepolia.

<!-- 
## Usage
### Running the Relay Worker
To start the relay worker, run:
```bash
cd relay
RPC_URL=ws://localhost:8545 PRIVATE_KEY=<your-private-key> ts-node relay-worker.ts
```

### Deploying the Contract
To deploy the TransferScheduler contract, use the following command:
```bash
forge script contracts/scripts/DeployTransferSchedulerProxy.s.sol --broadcast --rpc-url <your-rpc-url>
``` -->

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
