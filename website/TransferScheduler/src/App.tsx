import React from 'react';
import { useAccount, useConnect, useDisconnect, useWatchContractEvent } from 'wagmi';
import { SendTransaction } from './send-transaction';
import { readContract } from '@wagmi/core';
import { abi } from './abi';
import { config } from './wagmi';
import { TransferSchedulerContract } from './constants'


const GetUncompletedTransfers = () => {
  const { address } = useAccount();
  const [transfers, setTransfers] = React.useState(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function fetchTransfers() {
      if (address) {
        try {

          const transfers = await readContract(config, {
            abi,
            address: TransferSchedulerContract,
            functionName: 'getTransfers',
            args: [address, false],
          });
          setTransfers(transfers);
        } catch (err: any) {
          setError(err);
        }
      }
    }
    fetchTransfers();
  }, [address]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{transfers ? JSON.stringify(transfers.map((bigint) => bigint.toString())) : 'Loading...'}</div>
};

const GetCompletedTransfers = () => {
  const { address } = useAccount();
  const [transfers, setTransfers] = React.useState(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function fetchTransfers() {
      if (address) {
        try {
          const transfers = await readContract(config, {
            abi,
            address: TransferSchedulerContract,
            functionName: 'getTransfers',
            args: [address, true],
          });
          setTransfers(transfers);
        } catch (err: any) {
          setError(err);
        }
      }
    }
    fetchTransfers();
  }, [address]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{transfers ? JSON.stringify(transfers.map((bigint) => bigint.toString())) : 'Loading...'}</div>
};

function App() {
  const { address, chainId, status: accountStatus } = useAccount();
  const { connect, connectors, error: connectError, status: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [eventLogs, setEventLogs] = React.useState<any | null>(null);

  function stringifyWithBigInt(obj) {
    return JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  }

  useWatchContractEvent({
    address: TransferSchedulerContract,
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
            <h3>Authorize Permit2 Contract</h3>
            <button type="button">Authorize</button>
          </div>

          <div>
            <h3>Queue Transfer Transaction</h3>
            <SendTransaction />
          </div>

          <div>
            <h3>Event Logs Topic: TransferScheduled</h3>
            {stringifyWithBigInt(eventLogs) || 'watching...'}
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