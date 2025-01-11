import { useAccount, useConnect, useDisconnect, useSwitchChain, useEnsName } from 'wagmi';
import { QueueTransferTransaction } from './SendTransaction';
import { GetUncompletedTransfers } from './GetUncompletedTransfers';
import { GetCompletedTransfers } from './GetCompletedTransfers';
import { readContract } from '@wagmi/core';
import { config, mainnetConfig } from './wagmi';
import { TransferSchedulerContractAddress } from '@mnrgreg/transfer-scheduler-sdk';


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