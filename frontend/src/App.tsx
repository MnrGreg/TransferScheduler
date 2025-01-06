import React from 'react';
import { useAccount, useConnect, useDisconnect, useWatchContractEvent, useSwitchChain, useEnsName } from 'wagmi';
import { QueueTransferTransaction } from './SendTransaction';
import { readContract } from '@wagmi/core';
import { config, mainnetConfig } from './wagmi';
import { TransferSchedulerContractAddress, transferSchedulerABI, QueuedTransferRecords, TransferScheduledEventLog, Status } from 'transfer-scheduler-sdk';
import { getContractEvents } from 'viem/actions';
import { formatGwei } from 'viem'

type TransferScheduledEventLogs = TransferScheduledEventLog[];

export async function getTokenSymbol(tokenAddress: `0x${string}`): Promise<string> {
  // Fetch token name if we have a valid token address
  try {
    return await readContract(config, {
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
  } catch (error) {
    console.error('Error fetching token symbol:', error);
    return tokenAddress; // Fallback to address if symbol fetch fails
  }
}

export async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  try {
    return await readContract(config, {
      address: tokenAddress,
      abi: [{
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint8' }],
      }],
      functionName: 'decimals',
    }) as number;;
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

  if (error) {
    return <div>Error: {error.message}</div>;
  }

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

function App() {
  const { address, chainId, status: accountStatus, chain } = useAccount({ config: config });
  const { connect, connectors, error: connectError, status: isConnecting } = useConnect({ config: config });
  const { disconnect } = useDisconnect();
  const { chains, switchChainAsync, status: switchChainStatus } = useSwitchChain({ config: config });
  const { data: ensName } = useEnsName({ config: mainnetConfig, address: address })

  return (
    <>
      <div style={{ padding: '0px', maxWidth: '600px', margin: '0 auto', textAlign: 'left', border: 'none' }}>
        <h3 style={{ fontSize: '0.875rem', padding: '0px', marginTop: '0px', marginBottom: '4px' }}>TransferScheduler Contract: {TransferSchedulerContractAddress}</h3>

        <div style={{ fontSize: '0.875rem', padding: '0px', marginTop: '0px', marginBottom: '0px' }}>Chain: {chain?.name} | {chainId} | {accountStatus} {accountStatus === 'connected' && (
          <button type="button" onClick={() => disconnect()} style={{ margin: '4px 0', padding: '0px', marginTop: '0px', marginBottom: '0px' }}>
            Disconnect
          </button>
        )}</div>
        {accountStatus === 'connected' && (
          <div style={{ fontSize: '0.875rem', padding: '0px', marginTop: '0px', marginBottom: '0px' }}>
            Select chain: {chains.map((chain) => (
              <button key={chain.id} onClick={async () => {
                await switchChainAsync({ chainId: chain.id });
              }}>
                {chain.name}
              </button>
            ))}
          </div>
        )
        }
        {accountStatus === 'connected' && (
          < div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', padding: '0px', marginTop: '0px', marginBottom: '10px' }}>
            Wallet address: &nbsp; {address && <div>{ensName ? `${ensName}` : address} </div>}
          </div>
        )
        }
      </div >

      {accountStatus !== 'connected' && (
        <div style={{ padding: '6px', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.875rem' }}>Connect</h3>
          {connectors.map((connector) => (
            <button key={connector.id} onClick={() => connect({ connector })} type="button" style={{ margin: '8px 0' }}>
              {connector.name}
            </button>
          ))}
          {isConnecting && <div style={{ fontSize: '0.875rem' }}>Connecting...</div>}
          {connectError && <div style={{ fontSize: '0.875rem' }}>{connectError.message}</div>}
        </div>
      )
      }

      {(accountStatus === 'connected' && switchChainStatus !== 'pending') && (
        <div style={{ padding: '0px', maxWidth: '600px', margin: '0 auto', textAlign: 'left', border: 'none' }}>
          <QueueTransferTransaction />
          <h3 style={{ fontSize: '0.875rem', border: 'none' }}><span title="getTransfers(complete=false)">Uncompleted Scheduled Transfers</span></h3>
          <GetUncompletedTransfers />
          <h3 style={{ fontSize: '0.875rem', border: 'none' }}><span title="getTransfers(complete=true)">Completed Scheduled Transfers</span></h3>
          <GetCompletedTransfers />
        </div>
      )
      }
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <iframe style={{ border: 'none' }} src="https://ghbtns.com/github-btn.html?user=MnrGreg&repo=TransferScheduler&type=star&count=false" width="52" height="20" title="GitHub"></iframe>
      </div>
    </>
  );
}

export default App;