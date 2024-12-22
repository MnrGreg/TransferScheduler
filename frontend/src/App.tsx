import React, { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWatchContractEvent } from 'wagmi';
import { QueueTransferTransaction } from './SendTransaction';
import { readContract } from '@wagmi/core';
import { abi } from './abi';
import { config } from './wagmi';
import { TransferSchedulerContractAddress } from './constants'
import { getContractEvents } from 'viem/actions';
import { formatGwei } from 'viem'

type QueuedTransferRecord = {
  nonce: bigint;
  blockNumber: number;
};

type QueuedTransferRecords = QueuedTransferRecord[];

type TransferScheduledEventLog = {
  owner: `0x${string}`; // address type in TypeScript for Ethereum
  nonce: bigint;        // uint96
  token: `0x${string}`; // address
  to: `0x${string}`;    // address
  amount: bigint;       // uint128
  notBeforeDate: number; // uint40
  notAfterDate: number;  // uint40
  maxBaseFee: number;    // uint40
  signature: `0x${string}`; // bytes
};

type TransferScheduledEventLogs = TransferScheduledEventLog[];

export async function getTokenSymbol(tokenAddress: `0x${string}`): Promise<string> {

  // Fetch token name if we have a valid token address
  const tokenContract = await readContract(config, {
    abi: [{
      name: 'symbol',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }],
    }],
    address: tokenAddress,
    functionName: 'symbol',
  });

  try {
    const tokenSymbol = await tokenContract;
    return tokenSymbol;
  } catch (error) {
    console.error('Error fetching token symbol:', error);
    return tokenAddress; // Fallback to address if symbol fetch fails
  }
}

export async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  try {
    const data = await readContract(config, {
      address: tokenAddress,
      abi: [{
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint8' }],
      }],
      functionName: 'decimals',
    }) as number;
    return data;
  } catch (error) {
    console.error('Error fetching token decimals:', error);
    return 18; // Default to 18 decimals if there's an error
  }
}


const GetUncompletedTransfers = () => {
  const { address } = useAccount();
  const [transfers, setTransfers] = React.useState<QueuedTransferRecords | null>(null);
  const [eventLogs, setEventLogs] = React.useState<TransferScheduledEventLogs | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});
  const [tokenDecimals, setTokenDecimals] = React.useState<Record<string, number>>({});

  useWatchContractEvent({
    address: TransferSchedulerContractAddress,
    abi,
    eventName: 'TransferScheduled',
    onLogs: () => setUpdateTrigger(prev => prev + 1),
  });

  useWatchContractEvent({
    address: TransferSchedulerContractAddress,
    abi,
    eventName: 'TransferExecuted',
    onLogs: () => setUpdateTrigger(prev => prev + 1),
  });

  React.useEffect(() => {
    async function fetchTransfers() {
      if (address) {
        try {
          const transfersResult = await readContract(config, {
            abi,
            address: TransferSchedulerContractAddress,
            functionName: 'getScheduledTransfers',
            args: [address, false],
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
          abi,
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

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {
        eventLogs && eventLogs.length > 0 ? (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {Object.keys(eventLogs[0])
                  .filter(key => key !== 'owner' && key !== 'signature')
                  .map((key) => (
                    <th key={key} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
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
                      <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {key === 'token' ? (
                          <span title={value.toString()}>
                            {tokenSymbols[value.toString()] || value.toString()}
                          </span>
                        ) : key === 'amount' ? (
                          <span title={value.toString()}>
                            {(Number(value) / Math.pow(10, tokenDecimals[log.token] || 18)).toString()}
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
          'Loading...'
        )}
    </div>
  );
};

const GetCompletedTransfers = () => {
  const { address } = useAccount();
  const [transfers, setTransfers] = React.useState<QueuedTransferRecords | null>(null);
  const [eventLogs, setEventLogs] = React.useState<TransferScheduledEventLogs | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});
  const [tokenDecimals, setTokenDecimals] = React.useState<Record<string, number>>({});

  useWatchContractEvent({
    address: TransferSchedulerContractAddress,
    abi,
    eventName: 'TransferScheduled',
    args: {
      owner: address
    },
    onLogs: () => setUpdateTrigger(prev => prev + 1),
  });

  useWatchContractEvent({
    address: TransferSchedulerContractAddress,
    abi,
    eventName: 'TransferExecuted',
    args: {
      owner: address
    },
    onLogs: () => setUpdateTrigger(prev => prev + 1),
  });

  React.useEffect(() => {
    async function fetchTransfers() {
      if (address) {
        try {
          const transfersResult = await readContract(config, {
            abi,
            address: TransferSchedulerContractAddress,
            functionName: 'getScheduledTransfers',
            args: [address, true],
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
      console.log("Completed transfers:", transfers);
      const transferScheduledEventLogs: TransferScheduledEventLog[] = [];
      // for each transfer, use the blockNumber to get the contract event detail for the nonce
      for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];
        const nonce = transfer.nonce.toString();
        const blockNumber = transfer.blockNumber.toString();
        const logs = await getContractEvents(config.getClient(), {
          address: TransferSchedulerContractAddress,
          abi,
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



  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {
        eventLogs && eventLogs.length > 0 ? (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {Object.keys(eventLogs[0])
                  .filter(key => key !== 'owner' && key !== 'signature')
                  .map((key) => (
                    <th key={key} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
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
                      <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {key === 'token' ? (
                          <span title={value.toString()}>
                            {tokenSymbols[value.toString()] || value.toString()}
                          </span>
                        ) : key === 'amount' ? (
                          <span title={value.toString()}>
                            {(Number(value) / Math.pow(10, tokenDecimals[log.token] || 18)).toString()}
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
          'Loading...'
        )}
    </div >
  );
};

function App() {
  const { address, chainId, status: accountStatus } = useAccount();
  const { connect, connectors, error: connectError, status: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [eventLogs, setEventLogs] = React.useState<TransferScheduledEventLogs | null>(null);

  const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});
  const [tokenDecimals, setTokenDecimals] = React.useState<Record<string, number>>({});



  const transferScheduledEventLogs: TransferScheduledEventLog[] = [];
  useWatchContractEvent({
    address: TransferSchedulerContractAddress,
    abi,
    eventName: 'TransferScheduled',
    args: {
      owner: address
    },
    onLogs(logs) {
      console.log(logs[0].args);
      setEventLogs(transferScheduledEventLogs);
    }
  })

  useEffect(() => {
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


  return (
    <>
      <div>
        <div>
          <h3>Account</h3>
          Status: {accountStatus}
          <br />
          Address: {address}
          <br />
          chainId: {chainId}
        </div>

        {accountStatus === 'connected' && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      {accountStatus !== 'connected' && (
        <div>
          <h3>Connect</h3>
          {connectors.map((connector) => (
            <button key={connector.id} onClick={() => connect({ connector })} type="button">
              {connector.name}
            </button>
          ))}
          {isConnecting && <div>Connecting...</div>}
          {connectError && <div>{connectError.message}</div>}
        </div>
      )}

      {accountStatus === 'connected' && (
        <>

          <div>
            <QueueTransferTransaction />
          </div>

          <div>
            <h3>Event Log Topic: TransferScheduled</h3>
            {eventLogs ? (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {Object.keys(eventLogs)
                      .filter(key => key !== 'owner' && key !== 'signature')
                      .map((key) => (
                        <th key={key} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {eventLogs && eventLogs.map((log: TransferScheduledEventLog, index: number) => (
                    <tr key={index}>
                      {Object.entries(log)
                        .filter(([key]) => key !== 'owner' && key !== 'signature')
                        .map(([key, value], index: number) => (
                          <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                            {key === 'token' ? (
                              <span title={value.toString()}>
                                {tokenSymbols[value.toString()] || value.toString()}
                              </span>
                            ) : key === 'amount' ? (
                              <span title={value.toString()}>
                                {(Number(value) / Math.pow(10, tokenDecimals[log.token] || 18)).toString()}
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
              'watching...'
            )}
          </div>

          <div>
            <h3>Contract State: getTransfers(complete=false)</h3>
            <GetUncompletedTransfers />
          </div>

          <div>
            <h3>Contract State: getTransfers(complete=true)</h3>
            <GetCompletedTransfers />
          </div>
        </>
      )}
    </>
  );
}

export default App;