import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWatchContractEvent } from 'wagmi';
import { QueueTransferTransaction } from './send-transaction';
import { readContract } from '@wagmi/core';
import { abi } from './abi';
import { config } from './wagmi';
import { TransferSchedulerContractAddress } from './constants'
import { getContractEvents } from 'viem/actions';

const GetScheduledTransferContractAllowance = ({ relayGasToken }: { relayGasToken: `0x${string}` | null }) => {
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
          setTransfers(transfers);
        } catch (err: any) {
          setError(err);
        }
      }
    }
    fetchTransfers();

    async function fetchEvents() {
      if (!transfers) {
        return <div>watching...</div>;
      }
      console.log("Uncompleted transfers:", transfers);
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
        })
        // TODO: handle multiple events
        if (logs[0].args.nonce.toString() === nonce) {
          console.log(logs[0].args);
          setEventLogs(logs[0].args);
        }
      }
    }
    fetchEvents();
  }, [address, updateTrigger]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
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
            {Object.entries(eventLogs)
              .filter(([key]) => key !== 'owner' && key !== 'signature')
              .map(([key, value], index) => (
                <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {key === 'notBeforeDate' || key === 'notAfterDate'
                    ? new Date(Number(value) * 1000).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })
                    : typeof value === 'bigint' ? value.toString() : value.toString()}
                </td>
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
          setTransfers(transfers);
        } catch (err: any) {
          setError(err);
        }
      }
    }
    fetchTransfers();

    async function fetchEvents() {
      if (!transfers) {
        return <div>watching...</div>;
      }
      console.log("Completed transfers:", transfers);
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
        })
        // TODO: handle multiple events
        if (logs[0].args.nonce.toString() === nonce) {
          console.log(logs[0].args);
          setEventLogs(logs[0].args);
        }
      }
    }
    fetchEvents();
  }, [address, updateTrigger]);

  // for each transfer, use the blockNumber to get the contract event detail for the nonce


  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {
        eventLogs ? (
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
                  .map(([key, value], index) => (
                    <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {key === 'notBeforeDate' || key === 'notAfterDate'
                        ? new Date(Number(value) * 1000).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        })
                        : typeof value === 'bigint' ? value.toString() : value.toString()}
                    </td>
                  ))}
              </tr>
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
  const [relayGasToken, setRelayGasToken] = React.useState<`0x${string}` | null>(null);
  const [relayGasTokenName, setRelayGasTokenName] = React.useState<string>('');
  const [relayGasCommissionPercentage, setRelayGasCommissionPercentage] = useState<number | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchRelayGasToken = async () => {
    try {
      const token = await readContract(config, {
        abi,
        address: TransferSchedulerContractAddress,
        functionName: 'getGasToken',
      });
      setRelayGasToken(token);

      // Fetch token name if we have a valid token address
      if (token) {
        const tokenName = await readContract(config, {
          abi: [{
            name: 'name',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'string' }],
          }],
          address: token,
          functionName: 'name',
        });
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
                      .map(([key, value], index) => (
                        <td key={index} style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {key === 'notBeforeDate' || key === 'notAfterDate'
                            ? new Date(Number(value) * 1000).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZoneName: 'short'
                            })
                            : typeof value === 'bigint' ? value.toString() : value.toString()}
                        </td>
                      ))}
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