import Web3 from 'web3';
import { TransferSchedulerContractAddress, transferSchedulerABI, ScheduledTransfer, TransferScheduledEventLog } from 'transfer-scheduler-sdk';
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
    if (!process.env.RPC_URL) {
        throw new Error(`RPC_URL is required`)
    }
    const websocketProvider = process.env.RPC_URL
    const web3 = new Web3(new Web3.providers.WebsocketProvider(websocketProvider));
    web3.eth.handleRevert = true;
    const accounts = await web3.eth.getAccounts();
    const address = accounts[3];
    console.log(`ETH balance for address index 0:`, await web3.eth.getBalance(address));

    const transferSchedulerContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);

    const subscription = await transferSchedulerContract.events.TransferScheduled({
        fromBlock: "latest"
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
        // TODO: Move to Temporal
        // TODO: call contract to check if [address][nonce].completed isn't already true (if replaying old events)

        let currentTime = Math.floor(new Date().getTime() / 1000);
        if (currentTime < Number(transferScheduledEventLog.notAfterDate)) {
            while (currentTime < Number(transferScheduledEventLog.notBeforeDate)) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentTime = Math.floor(new Date().getTime() / 1000);
                console.log("Queued Transfer too early. Current Time:", currentTime, "NotBeforeDate:", transferScheduledEventLog.notBeforeDate, "Nonce:", transferScheduledEventLog.nonce, "waiting 10seconds...");
            }

            console.log("Queued Transfer ready. Nonce:", transferScheduledEventLog.nonce);

            // MaxPriorityFeePerGas: 1000000000n
            // MaxFeePerGas: 1000036300n
            // Base fee: 18150n

            // MaxPriorityFeePerGas: 2500000000n
            // MaxFeePerGas: 2500007776n
            // Base fee: 3888n
            // 3403

            // MaxPriorityFeePerGas: 2500000000n
            // MaxFeePerGas: 2503150130n
            // Base fee: 1575065
            // 1378351

            //`max_priority_fee_per_gas` greater than `max_fee_per_gas`

            let isCallSuccessful = false;
            while (!isCallSuccessful) {

                const feeData = await web3.eth.calculateFeeData();
                console.log('MaxPriorityFeePerGas:', feeData.maxPriorityFeePerGas);
                console.log('MaxFeePerGas:', feeData.maxFeePerGas);
                console.log('Base fee:', feeData.baseFeePerGas);
                await web3.eth.getBlock("pending").then((block) => console.log(Number(block.baseFeePerGas)));

                try {
                    // Simulate contract execution with eth_call first
                    await transferSchedulerContract.methods.executeScheduledTransfer(scheduledTransfer,
                        transferScheduledEventLog.signature
                    ).call({
                        from: address,
                        gas: web3.utils.toHex(170000),
                        //maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('0.001', 'gwei')),
                        //maxFeePerGas: web3.utils.toHex(web3.utils.toWei('0.1', 'gwei')),
                    });
                    console.log('Contract simulation successful for Nonce:', transferScheduledEventLog.nonce);
                    isCallSuccessful = true;
                } catch (error) {
                    console.log('Contract simulation failed:', error);
                    console.log('Waiting 1 minute before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Sleep for 1 minute
                }
            }

            //TODO: Fine tune max gas fee
            const tx = await transferSchedulerContract.methods.executeScheduledTransfer(scheduledTransfer, transferScheduledEventLog.signature).send({
                from: address,
            });
            console.log("Transfer executed for Nonce:", transferScheduledEventLog.nonce, "TxHash:", tx.transactionHash);

        } else {
            console.log("Queued Transfer too late. Current Time:", currentTime, "NotAfterDate:", transferScheduledEventLog.notAfterDate, "Nonce:", transferScheduledEventLog.nonce);
        }
    });
}

main();
