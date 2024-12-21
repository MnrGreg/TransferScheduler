import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWatchContractEvent } from 'wagmi';
import { QueueTransferTransaction } from './send-transaction';
import { readContract } from '@wagmi/core';
import { abi } from './abi';
import { config } from './wagmi';
import { TransferSchedulerContractAddress } from './constants'
import { getContractEvents } from 'viem/actions';

async function getTokenSymbol(tokenAddress: string): Promise<string> {

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

const GetScheduledTransferContractAllowance = ({ relayGasToken }: { relayGasToken: string | null }) => {
  const { address } = useAccount();
  const [error, setError] = React.useState<Error | null>(null);
  const [allowance, setGasTokenAllowance] = React.useState<bigint | null>(null);

  React.useEffect(() => {
    async function fetchAllowance() {
      if (address && relayGasToken) {
        try {
          const allowanceResult = await readContract(config, {
            abi: [{
              name: 'allowance',
              type: 'function',
              stateMutability: 'view',
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
              ],
              outputs: [{ type: 'uint256' }],
            }],
            address: relayGasToken,
            functionName: 'allowance',
            args: [address, TransferSchedulerContractAddress],
          });
          setGasTokenAllowance(allowanceResult);
        } catch (err: any) {
          setError(err);
        }
      }
    }
    fetchAllowance();
  }, [address, relayGasToken]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>Gas token allowance: {allowance ? allowance.toString() : 'Loading...'}</div>
};

const GetUncompletedTransfers = () => {
  type queuedTransferRecords = {
    nonce: BigInt;
    blockNumber: BigInt;
  }[];

  const { address } = useAccount();
  const [transfers, setTransfers] = React.useState<queuedTransferRecords | null>(null);
  const [eventLogs, setEventLogs] = React.useState<any | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});

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
          const transfers = await readContract(config, {
            abi,
            address: TransferSchedulerContractAddress,
            functionName: 'getScheduledTransfers',
            args: [address, false],
          });
          setTransfers(transfers); // Convert to mutable array
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
      const allEventLogs = [];
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
            allEventLogs.push(log.args);
          }
        });
      }
      setEventLogs(allEventLogs);
    }
    fetchEvents();
  }, [transfers]);

  React.useEffect(() => {
    async function fetchTokenSymbol() {
      const newTokenSymbols: Record<string, string> = {};
      for (const [key, value] of Object.entries(eventLogs)) {
        if (key === 'token' && !tokenSymbols[value.toString()]) {
          newTokenSymbols[value.toString()] = await getTokenSymbol(value.toString());
        }
      }
      setTokenNames(prev => ({ ...prev, ...newTokenSymbols }));
    }
    fetchTokenSymbol();
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
                    .map(([key, value], index) => (
                      <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {key === 'token' ? (
                          <span title={value.toString()}>
                            {tokenSymbols[value.toString()] || value.toString()}
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
  type queuedTransferRecords = {
    nonce: BigInt;
    blockNumber: BigInt;
  }[];

  const { address } = useAccount();
  const [transfers, setTransfers] = React.useState<queuedTransferRecords | null>(null);
  const [eventLogs, setEventLogs] = React.useState<any | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});

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
          const transfers = await readContract(config, {
            abi,
            address: TransferSchedulerContractAddress,
            functionName: 'getScheduledTransfers',
            args: [address, true],
          });
          setTransfers(transfers); // Convert to mutable array
        } catch (err: any) {
          setError(err);
        }
      }
    }
    fetchTransfers();
  }, [address]); // Ensure address is a dependency

  React.useEffect(() => {
    async function fetchEvents() {
      if (!transfers) {
        return;
      }
      console.log("Completed transfers:", transfers);
      const allEventLogs = [];
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
            allEventLogs.push(log.args);
          }
        });
      }
      setEventLogs(allEventLogs);
    }
    fetchEvents();
  }, [transfers]);

  // for each transfer, use the blockNumber to get the contract event detail for the nonce
  useEffect(() => {
    async function fetchTokenSymbol() {
      const newTokenSymbols: Record<string, string> = {};
      for (const [key, value] of Object.entries(eventLogs)) {
        if (key === 'token' && !tokenSymbols[value.toString()]) {
          newTokenSymbols[value.toString()] = await getTokenSymbol(value.toString());
        }
      }
      setTokenNames(prev => ({ ...prev, ...newTokenSymbols }));
    }
    fetchTokenSymbol();
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
                    .map(([key, value], index) => (
                      <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {key === 'token' ? (
                          <span title={value.toString()}>
                            {tokenSymbols[value.toString()] || value.toString()}
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
  const [eventLogs, setEventLogs] = React.useState<any | null>(null);
  const [relayGasToken, setRelayGasToken] = React.useState<string | null>(null);
  const [relayGasTokenName, setRelayGasTokenName] = React.useState<string>('');
  const [relayGasCommissionPercentage, setRelayGasCommissionPercentage] = useState<number | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [tokenSymbols, setTokenNames] = React.useState<Record<string, string>>({});

  const fetchRelayGasToken = async () => {
    try {
      const token = await readContract(config, {
        abi,
        address: TransferSchedulerContractAddress,
        functionName: 'getGasToken',
      });
      setRelayGasToken(token);

      if (token) {
        const tokenName = await getTokenSymbol(token);
        setRelayGasTokenName(tokenName);
      }
    } catch (err) {
      console.error('Error fetching relay gas token:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch relay gas token'));
    }
  };

  useEffect(() => {
    fetchRelayGasToken();
  }, []); // Empty dependency array means this runs once on mount

  const fetchRelayGasCommissionPercentage = async () => {
    try {
      const percentage = await readContract(config, {
        abi,
        address: TransferSchedulerContractAddress,
        functionName: 'getGasCommissionPercentage',
      });
      setRelayGasCommissionPercentage(Number(percentage));
    } catch (err) {
      console.error('Error fetching relay gas commission percentage:', err);
    }
  };

  useEffect(() => {
    fetchRelayGasCommissionPercentage();
  }, []);

  useEffect(() => {
    async function fetchTokenSymbol() {
      const newTokenSymbols: Record<string, string> = {};
      for (const [key, value] of Object.entries(eventLogs)) {
        if (key === 'token' && !tokenSymbols[value.toString()]) {
          newTokenSymbols[value.toString()] = await getTokenSymbol(value.toString());
        }
      }
      setTokenNames(prev => ({ ...prev, ...newTokenSymbols }));
    }
    fetchTokenSymbol();
  }, [eventLogs]);

  useWatchContractEvent({
    address: TransferSchedulerContractAddress,
    abi,
    eventName: 'TransferScheduled',
    args: {
      owner: address
    },
    onLogs(logs) {
      console.log(logs[0].args);
      setEventLogs(logs[0].args);
    }
  })

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
            <h3>TransferSchedule Allowance</h3>
            <div>Gas token: {relayGasToken} ({relayGasTokenName})</div>
            <GetScheduledTransferContractAllowance relayGasToken={relayGasToken} />
            <div>Relayer gas fee: block.basefee * gas * {relayGasCommissionPercentage}%</div>
          </div>

          <div>
            <h3>Queue Transfer Transaction</h3>
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
                  <tr>
                    {Object.entries(eventLogs)
                      .filter(([key]) => key !== 'owner' && key !== 'signature')
                      .map(([key, value], index) => {
                        return (
                          <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                            {key === 'token' ? (
                              <span title={value.toString()}>
                                {tokenSymbols[value.toString()] || value.toString()}
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
                        );
                      })}
                  </tr>
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