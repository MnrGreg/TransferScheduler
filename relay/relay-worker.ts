import Web3, { WebSocketProvider } from 'web3';
import { TransferSchedulerContractAddress, transferSchedulerABI, TransferScheduledEventLog, AddressNonceRecord } from 'transfer-scheduler-sdk';
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
    if (!process.env.RPC_URL || !process.env.PRIVATE_KEY || !process.env.MAX_PRIORITY_FEE_PER_GAS) {
        throw new Error(`RPC_URL, PRIVATE_KEY, MAX_PRIORITY_FEE_PER_GAS envs required`)
    }

    let headers = {};
    if (!process.env.RPC_URL_HEADER_KEY || !process.env.RPC_URL_HEADER_VALUE) headers = {}
    else headers = {
        [process.env.RPC_URL_HEADER_KEY]: process.env.RPC_URL_HEADER_VALUE
    }
    const websocketProvider = new WebSocketProvider(
        process.env.RPC_URL,
        {
            headers: headers
        },
        {
            delay: 500,
            autoReconnect: true,
            maxAttempts: 10,
        },
    );
    const web3 = new Web3(websocketProvider);

    web3.eth.handleRevert = true;
    const account = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)[0];
    const address = account.address;
    console.log(`ETH balance for address ${address}`, await web3.eth.getBalance(address));

    const transferSchedulerContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);

    const relayGasUsage = await transferSchedulerContract.methods.getRelayGasUsage().call();
    if (!relayGasUsage) {
        throw new Error('Relay gas usage not set');
    }

    const subscription = await transferSchedulerContract.events.TransferScheduled({
        fromBlock: "latest",
    });

    subscription.on("connected", function (subscriptionId) {
        console.log("Connected to events: ", subscriptionId);
    });

    subscription.on('data', async function (event) {
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
        }
        // TODO: Use to long running workflow orchestrator tooling

        const addressNonceRecord: AddressNonceRecord = await transferSchedulerContract.methods.transfers(transferScheduledEventLog.owner, transferScheduledEventLog.nonce).call();
        if (addressNonceRecord.exists && addressNonceRecord.completed) {
            console.log("Queued Transfer already executed. Nonce:", transferScheduledEventLog.nonce);
            return;
        }

        let currentTime = Math.floor(new Date().getTime() / 1000);
        if (currentTime < Number(transferScheduledEventLog.notAfterDate)) {
            while (currentTime < Number(transferScheduledEventLog.notBeforeDate)) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentTime = Math.floor(new Date().getTime() / 1000);
                console.log("Queued Transfer too early. Current Time:", currentTime, "NotBeforeDate:", transferScheduledEventLog.notBeforeDate, "Nonce:", transferScheduledEventLog.nonce, "waiting 10seconds...");
            }

            console.log("Queued Transfer ready. Nonce:", transferScheduledEventLog.nonce);

            const feeData = await web3.eth.calculateFeeData();
            console.log('MaxPriorityFeePerGas:', feeData.maxPriorityFeePerGas);
            console.log('MaxFeePerGas:', feeData.maxFeePerGas);
            console.log('Base fee:', feeData.baseFeePerGas);
            if (!feeData.maxPriorityFeePerGas || !feeData.maxFeePerGas) {
                console.log('Fee data not available. Waiting 1 minute...');
                return;
            }

            let isCallSuccessful = false;
            while (!isCallSuccessful) {

                try {

                    // Simulate contract execution with eth_call first
                    // ToDO add accessList
                    await transferSchedulerContract.methods.executeScheduledTransfer(scheduledTransfer,
                        transferScheduledEventLog.signature
                    ).call({
                        from: address,
                        gas: web3.utils.toHex(relayGasUsage),
                        maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
                        maxFeePerGas: feeData.maxFeePerGas.toString()
                    });
                    console.log('Contract simulation successful for Nonce:', transferScheduledEventLog.nonce);
                    isCallSuccessful = true;
                } catch (error) {
                    console.log('Contract simulation failed for Nonce:', transferScheduledEventLog.nonce, 'Error:', error);
                    console.log('Waiting 1 minute before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Sleep for 1 minute
                }
            }

            const tx = await transferSchedulerContract.methods.executeScheduledTransfer(scheduledTransfer, transferScheduledEventLog.signature).send({
                from: address,
                gas: web3.utils.toHex(relayGasUsage),
                maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
                maxFeePerGas: feeData.maxFeePerGas.toString()
            });
            console.log("Transfer executed for Nonce:", transferScheduledEventLog.nonce, "TxHash:", tx.transactionHash);

        } else {
            console.log("Queued Transfer too late. Current Time:", currentTime, "NotAfterDate:", transferScheduledEventLog.notAfterDate, "Nonce:", transferScheduledEventLog.nonce);
        }
    });

    subscription.on("error", function (error) {
        console.error("Error receiving event data: ", error);
    });

    websocketProvider.on('disconnect', () => {
        console.error("websocketProvider disconnected");
    })
}

main();
