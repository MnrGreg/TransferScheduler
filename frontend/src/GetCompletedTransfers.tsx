import React from 'react';
import { useAccount, useWatchContractEvent } from 'wagmi';
import { readContract, getEnsName } from '@wagmi/core';
import { config, mainnetConfig } from './wagmi';
import { TransferSchedulerContractAddress, transferSchedulerABI, QueuedTransferRecords, Status, TransferScheduledEventLog } from 'transfer-scheduler-sdk';
import { getTokenSymbol, getTokenDecimals } from './App';
import { getContractEvents } from 'viem/actions';
import { formatGwei } from 'viem'

type TransferScheduledEventLogs = TransferScheduledEventLog[];

export const GetCompletedTransfers = () => {
    const { address } = useAccount();
    const [transfers, setTransfers] = React.useState<QueuedTransferRecords | null>(null);
    const [eventLogs, setEventLogs] = React.useState<TransferScheduledEventLogs | null>(null);
    const [error, setError] = React.useState<Error | null>(null);
    const [updateTrigger, setUpdateTrigger] = React.useState(0);
    const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});
    const [tokenDecimals, setTokenDecimals] = React.useState<Record<string, number>>({});
    const [ensNames, setEnsNames] = React.useState<Record<string, string | null>>({});

    useWatchContractEvent({
        address: TransferSchedulerContractAddress,
        abi: transferSchedulerABI,
        eventName: 'TransferScheduled',
        args: {
            owner: address
        },
        poll: true,
        pollingInterval: 5_00,
        onLogs: () => setUpdateTrigger(prev => prev + 1),
    });

    useWatchContractEvent({
        address: TransferSchedulerContractAddress,
        abi: transferSchedulerABI,
        eventName: 'TransferExecuted',
        args: {
            owner: address
        },
        poll: true,
        pollingInterval: 5_00,
        onLogs: () => setUpdateTrigger(prev => prev + 1),
    });

    React.useEffect(() => {
        async function fetchTransfers() {
            if (address) {
                try {
                    const transfersResult = await readContract(config, {
                        abi: transferSchedulerABI,
                        address: TransferSchedulerContractAddress,
                        functionName: 'getScheduledTransfers',
                        args: [address, Status.completed],
                    });
                    const mutableTransfers = [...transfersResult];
                    setTransfers(mutableTransfers);
                } catch (err: any) {
                    setError(err);
                }
            }
        }
        fetchTransfers();
    }, [address, updateTrigger]); // Ensure address is a dependency

    React.useEffect(() => {
        async function fetchEvents() {
            if (!transfers) {
                return;
            }
            const transferScheduledEventLogs: TransferScheduledEventLog[] = [];
            // for each transfer, use the blockNumber to get the contract event detail for the nonce
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

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {
                eventLogs && eventLogs.length > 0 ? (
                    <table style={{ borderCollapse: 'collapse', maxWidth: '600px', fontSize: '0.6rem', boxSizing: 'border-box', tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                {Object.keys(eventLogs[0])
                                    .filter(key => key !== 'owner' && key !== 'signature')
                                    .map((key) => (
                                        <th key={key} style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>
                                            {key}
                                        </th>
                                    ))}
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
                                                width: (key === 'amount' || key === 'token') ? '10%' : '16%',
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <span style={{ fontSize: '0.875rem' }}>Watching...</span>
                )
            }
        </div >
    );
};