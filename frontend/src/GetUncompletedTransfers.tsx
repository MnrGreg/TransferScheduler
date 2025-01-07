import React from 'react';
import { useAccount, useWatchContractEvent, useWaitForTransactionReceipt } from 'wagmi';
import { readContract, getEnsName } from '@wagmi/core';
import { config, mainnetConfig } from './wagmi';
import { TransferSchedulerContractAddress, transferSchedulerABI, QueuedTransferRecords, Status, TransferScheduledEventLog } from 'transfer-scheduler-sdk';
import { getTokenSymbol, getTokenDecimals } from './App';
import { getContractEvents } from 'viem/actions';
import { formatGwei } from 'viem'
import { writeContract, simulateContract } from '@wagmi/core';

type TransferScheduledEventLogs = TransferScheduledEventLog[];

export const GetUncompletedTransfers = () => {
    const { address } = useAccount();
    const [transfers, setTransfers] = React.useState<QueuedTransferRecords | null>(null);
    const [eventLogs, setEventLogs] = React.useState<TransferScheduledEventLogs | null>(null);
    const [error, setError] = React.useState<Error | null>(null);
    const [hash, setHash] = React.useState<`0x${string}` | undefined>();
    const [isPending, setIsPending] = React.useState(false);
    const [updateTrigger, setUpdateTrigger] = React.useState(0);
    const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});
    const [tokenDecimals, setTokenDecimals] = React.useState<Record<string, number>>({});
    const [ensNames, setEnsNames] = React.useState<Record<string, string | null>>({});
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useWatchContractEvent({
        address: TransferSchedulerContractAddress,
        abi: transferSchedulerABI,
        eventName: 'TransferScheduled',
        poll: true,
        pollingInterval: 5_00,
        onLogs: () => setUpdateTrigger(prev => prev + 1),
    });

    useWatchContractEvent({
        address: TransferSchedulerContractAddress,
        abi: transferSchedulerABI,
        eventName: 'TransferExecuted',
        poll: true,
        pollingInterval: 5_00,
        onLogs: () => setUpdateTrigger(prev => prev + 1),
    });


    if (!address) {
        console.error('Address is required');
        return;
    }

    React.useEffect(() => {
        async function fetchTransfers() {
            if (address) {
                try {
                    const transfersResult = await readContract(config, {
                        abi: transferSchedulerABI,
                        address: TransferSchedulerContractAddress,
                        functionName: 'getScheduledTransfers',
                        args: [address, Status.notCompleted],
                    });
                    const mutableTransfers = [...transfersResult];
                    setTransfers(mutableTransfers);
                    console.log("Uncompleted transfers:", transfers);
                } catch (err: any) {
                    setError(err);
                }
            }
        }
        fetchTransfers();
    }, [address, updateTrigger]);

    React.useEffect(() => {
        if (isConfirmed) {
            setUpdateTrigger(prev => prev + 1)
        }
    }, [isConfirmed]);

    React.useEffect(() => {
        async function fetchEvents() {
            if (!transfers) {
                return;
            }
            console.log("Uncompleted transfers:", transfers);
            const transferScheduledEventLogs: TransferScheduledEventLog[] = [];
            for (let i = 0; i < transfers.length; i++) {
                const transfer = transfers[i];
                const nonce = transfer.nonce.toString();
                const blockNumber = transfer.blockNumber.toString();
                const logs = await getContractEvents(config.getClient(), {
                    address: TransferSchedulerContractAddress,
                    abi: transferSchedulerABI,
                    eventName: 'TransferScheduled',
                    args: {
                        owner: address,
                    },
                    fromBlock: BigInt(blockNumber),
                    toBlock: BigInt(blockNumber),
                    strict: true
                });
                // Collect all matching logs
                logs.forEach(log => {
                    if (log.args.nonce.toString() === nonce) {
                        transferScheduledEventLogs.push(log.args);
                    }
                });
            }
            setEventLogs(transferScheduledEventLogs);
        }
        fetchEvents();
    }, [transfers]);

    React.useEffect(() => {
        async function fetchTokenInfo() {
            if (!eventLogs) return;

            const newTokenSymbols: Record<string, string> = {};
            const newTokenDecimals: Record<string, number> = {};

            for (const log of eventLogs) {
                if (!tokenSymbols[log.token]) {
                    // Fetch both symbol and decimals concurrently
                    const [symbol, decimals] = await Promise.all([
                        getTokenSymbol(log.token),
                        getTokenDecimals(log.token)
                    ]);
                    newTokenSymbols[log.token] = symbol;
                    newTokenDecimals[log.token] = decimals;
                }
            }

            setTokenNames(prev => ({ ...prev, ...newTokenSymbols }));
            setTokenDecimals(prev => ({ ...prev, ...newTokenDecimals }));
        }

        fetchTokenInfo();
    }, [eventLogs]);

    React.useEffect(() => {
        const fetchENSNames = async () => {
            if (!eventLogs) return;
            const names: Record<string, string | null> = {};
            for (const log of eventLogs) {
                const ensName = await getEnsName(mainnetConfig, { address: log.to });
                names[log.to] = ensName as string;
            }
            setEnsNames(names);
        };
        fetchENSNames();
    }, [eventLogs]);

    const handleCancel = async (nonce: bigint) => {
        try {
            setIsPending(true);
            const { request } = await simulateContract(config, {
                abi: transferSchedulerABI,
                address: TransferSchedulerContractAddress,
                functionName: 'cancelScheduledTransfer',
                args: [
                    address as `0x${string}`,
                    nonce,
                ],
                type: 'eip1559',
            });

            const txHash = await writeContract(config, request);
            console.log('Transaction Hash:', txHash);
            setHash(txHash);
        } catch (err: any) {
            console.error('Error cancelling transfer:', err);
            setError(err);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {
                eventLogs && eventLogs.length > 0 ? (
                    <table style={{ borderCollapse: 'collapse', width: '600px', fontSize: '0.6rem', boxSizing: 'border-box', tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                {Object.keys(eventLogs[0])
                                    .filter(key => key !== 'owner' && key !== 'signature')
                                    .map((key) => (
                                        <th key={key} style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>
                                            {key}
                                        </th>
                                    ))}
                                <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>
                                    action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {eventLogs.map((log, index) => (
                                <tr key={index}>
                                    {Object.entries(log)
                                        .filter(([key]) => key !== 'owner' && key !== 'signature')
                                        .map(([key, value], index: number) => (
                                            <td key={index} style={{
                                                border: '1px solid #ccc',
                                                padding: '4px',
                                                width: (key === 'amount' || key === 'token') ? '8%' : '14%',
                                                overflow: 'hidden',
                                                textOverflow: 'clip',
                                                whiteSpace: 'normal',
                                                wordBreak: 'break-all'
                                            }}>
                                                {key === 'token' ? (
                                                    <span title={value.toString()}>
                                                        {tokenSymbols[value.toString()] || value.toString()}
                                                    </span>
                                                ) : key === 'amount' ? (
                                                    <span title={value.toString()}>
                                                        {(Number(value) / Math.pow(10, tokenDecimals[log.token] || 18)).toString()}
                                                    </span>
                                                ) : key === 'to' ? (
                                                    <span title={value.toString()}>
                                                        {ensNames[log.to] || log.to}
                                                    </span>
                                                ) : key === 'maxBaseFee' ? (
                                                    <span title={value.toString()}>
                                                        {formatGwei(BigInt(value))}
                                                    </span>
                                                ) : key === 'notBeforeDate' || key === 'notAfterDate' ? (
                                                    new Date(Number(value) * 1000).toLocaleString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZoneName: 'short'
                                                    })
                                                ) : typeof value === 'bigint' ? (
                                                    value.toString()
                                                ) : (
                                                    value.toString()
                                                )}
                                            </td>
                                        ))}
                                    <td style={{ border: '1px solid #ccc', padding: '0px', textAlign: 'center' }}>
                                        <button style={{
                                            padding: '0px',
                                            width: '100%',
                                            height: '50px',
                                            fontSize: '0.6rem'
                                        }} disabled={isPending} onClick={() => handleCancel(log.nonce)}>
                                            {isPending ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <span style={{ fontSize: '0.875rem' }}>Watching...</span>
                )}
            {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error.message}</div>}
            {hash && <div>Transaction hash: {hash}</div>}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Transaction confirmed.</div>}
        </div>
    );
};