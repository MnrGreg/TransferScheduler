import Web3, { WebSocketProvider, } from 'web3';
import { ContractLogsSubscription } from 'web3-eth-contract';
import { TransferSchedulerContractAddress, transferSchedulerABI, TransferScheduledEventLog, AddressNonceRecord } from 'transfer-scheduler-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

let web3: Web3;
let websocketProvider: WebSocketProvider;
let transferSchedulerContract: any;
let subscription: ContractLogsSubscription;
let pingInterval: NodeJS.Timeout;
let address: string;
let account: any;
let relayGasUsage: number;

async function startWebsocketPingInterval() {
    pingInterval = setInterval(async () => {
        try {
            const response = await web3.eth.getBlockNumber();
            //console.log(`# ${new Date().toISOString()} # Provider: ${websocketProvider.getStatus()} Subscription: ${subscription.id} Current Block number: ${response}`);
        } catch (error) {
            console.warn(`# ${new Date().toISOString()} # Ping failed, connection might be inactive: ${error}`);
            cleanup();
            await resetProviderAndResubscribe();
        }
    }, 10000);
}

function cleanup() {
    clearInterval(pingInterval);
    if (subscription) {
        console.log("provider status:", websocketProvider.getStatus());
        subscription.unsubscribe();
        console.log("subscription listeners:", subscription.listeners);
        console.log("provider status:", websocketProvider.getStatus());
    }
    if (websocketProvider) {
        websocketProvider.disconnect(1000, 'Disconnect complete');
    }
}

async function handleTransferScheduledEvent(event: any) {
    const transferScheduledEventLog = event.returnValues as TransferScheduledEventLog;

    const scheduledTransfer = {
        owner: transferScheduledEventLog.owner,
        nonce: transferScheduledEventLog.nonce,
        token: transferScheduledEventLog.token,
        to: transferScheduledEventLog.to,
        amount: transferScheduledEventLog.amount,
        spender: TransferSchedulerContractAddress,
        notBeforeDate: transferScheduledEventLog.notBeforeDate,
        notAfterDate: transferScheduledEventLog.notAfterDate,
        maxBaseFee: transferScheduledEventLog.maxBaseFee,
    };
    // TODO: Use long running workflow orchestrator tooling

    const addressNonceRecord: AddressNonceRecord = await transferSchedulerContract.methods
        .transfers(transferScheduledEventLog.owner, transferScheduledEventLog.nonce)
        .call();
    if (addressNonceRecord.exists && addressNonceRecord.completed) {
        console.log("Queued Transfer already executed. Nonce:", transferScheduledEventLog.nonce);
        return;
    }

    let currentTime = Math.floor(new Date().getTime() / 1000);
    if (currentTime < Number(transferScheduledEventLog.notAfterDate)) {
        while (currentTime < Number(transferScheduledEventLog.notBeforeDate)) {
            const waitTime = Number(transferScheduledEventLog.notBeforeDate) - currentTime;
            console.log(
                "Queued Transfer too early. Current Time:",
                currentTime,
                "NotBeforeDate:",
                transferScheduledEventLog.notBeforeDate,
                "Nonce:",
                transferScheduledEventLog.nonce,
                `waiting for ${waitTime} seconds...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
            currentTime = Math.floor(new Date().getTime() / 1000);
        }

        console.log("Queued Transfer ready. Nonce:", transferScheduledEventLog.nonce);

        //let isCallSuccessful = false;
        while (true) {
            try {
                let feeData = await web3.eth.calculateFeeData();
                console.log('MaxPriorityFeePerGas:', feeData.maxPriorityFeePerGas);
                console.log('MaxFeePerGas:', feeData.maxFeePerGas);
                console.log('Base fee:', feeData.baseFeePerGas);
                if (!feeData.maxPriorityFeePerGas || !feeData.maxFeePerGas) {
                    console.log('Fee data not available. Retrying...');
                    continue;
                }
                // Simulate contract execution with eth_call first
                const result = await transferSchedulerContract.methods
                    .executeScheduledTransfer(scheduledTransfer, transferScheduledEventLog.signature)
                    .call({
                        from: address,
                        gas: web3.utils.toHex(relayGasUsage),
                        maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
                        maxFeePerGas: feeData.maxFeePerGas.toString()
                    });
                console.log('Contract simulation successful for Nonce:', transferScheduledEventLog.nonce);

                // if .call was successful, execute the transaction
                if (result) {
                    const tx = await transferSchedulerContract.methods
                        .executeScheduledTransfer(scheduledTransfer, transferScheduledEventLog.signature)
                        .send({
                            from: address,
                            gas: web3.utils.toHex(relayGasUsage),
                            maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
                            maxFeePerGas: feeData.maxFeePerGas.toString()
                        });
                    console.log("Transfer executed for Nonce:", transferScheduledEventLog.nonce, "TxHash:", tx.transactionHash);
                    break;
                }

                //isCallSuccessful = true;
            } catch (error: any) {
                console.error('Contract simulation failed for Nonce:', transferScheduledEventLog.nonce);
                console.error(error.toJSON().innerError)
                console.error('Waiting 1 minute before retrying...');
                await new Promise((resolve) => setTimeout(resolve, 60000)); // Sleep for 1 minute
            }
        }

    } else {
        console.log(
            "Queued Transfer too late. Current Time:",
            currentTime,
            "NotAfterDate:",
            transferScheduledEventLog.notAfterDate,
            "Nonce:",
            transferScheduledEventLog.nonce
        );
    }
}

async function resetProviderAndResubscribe() {
    console.log("Attempting to reset provider and resubscribe...");
    try {
        // Clean up existing provider if necessary
        cleanup();

        // Initialize new WebSocketProvider
        let headers = {};
        if (process.env.RPC_URL_HEADER_KEY && process.env.RPC_URL_HEADER_VALUE) {
            headers = {
                [process.env.RPC_URL_HEADER_KEY]: process.env.RPC_URL_HEADER_VALUE,
            };
        }

        websocketProvider = new WebSocketProvider(
            process.env.RPC_URL!,
            {
                headers: headers,
            },
            {
                delay: 1000,
                autoReconnect: true,
                maxAttempts: 20,
            },
        );

        web3 = new Web3(websocketProvider);

        web3.eth.handleRevert = true;
        // Re-add the account
        account = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY!)[0];
        address = account.address;
        console.log(`ETH balance for address ${address}`, await web3.eth.getBalance(address));

        // Re-instantiate the contract
        transferSchedulerContract = new web3.eth.Contract(
            transferSchedulerABI,
            TransferSchedulerContractAddress
        );

        // Get relayGasUsage again if necessary
        relayGasUsage = await transferSchedulerContract.methods.getRelayGasUsage().call();
        if (!relayGasUsage) {
            throw new Error('Relay gas usage not set');
        }

        // Resubscribe to events
        subscription = transferSchedulerContract.events.TransferScheduled({
            fromBlock: process.env.FROM_BLOCK
        });

        subscription.on("connected", function (subscriptionId: any) {
            console.log("Connected to events: ", subscriptionId);
        });

        subscription.on('data', handleTransferScheduledEvent);

        subscription.on("error", function (error: unknown) {
            console.error("Error receiving event data: ", error);
        });

        // Start the ping interval
        await startWebsocketPingInterval();

        // Add event listeners for 'error' and 'end'
        websocketProvider.on('error', async (error: unknown) => {
            console.error(`Websocket Error: ${error}`);
            cleanup();
            await resetProviderAndResubscribe();
        });

        websocketProvider.on('end', async (error: unknown) => {
            console.error(`Websocket connection ended: ${error}`);
            cleanup();
            await resetProviderAndResubscribe();
        });

    } catch (error) {
        console.error('Error resetting provider and resubscribing:', error);
    }
}

async function main() {
    if (
        !process.env.RPC_URL ||
        !process.env.PRIVATE_KEY ||
        !process.env.MAX_PRIORITY_FEE_PER_GAS ||
        !process.env.FROM_BLOCK
    ) {
        throw new Error(`RPC_URL, PRIVATE_KEY, MAX_PRIORITY_FEE_PER_GAS, FROM_BLOCK envs required`);
    }
    console.log(`RPC_URL: ${process.env.RPC_URL}`);
    console.log(`MAX_PRIORITY_FEE_PER_GAS: ${process.env.MAX_PRIORITY_FEE_PER_GAS}`);
    console.log(`FROM_BLOCK: ${process.env.FROM_BLOCK}`);

    // Initialize the provider
    await resetProviderAndResubscribe();

    // Handle application exit
    process.stdin.resume();

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGUSR1', cleanup);
    process.on('SIGUSR2', cleanup);
}

main();