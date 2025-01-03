import { http, createConfig } from 'wagmi'
import { arbitrum, base, sepolia, mainnet } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [arbitrum, base, sepolia],
  connectors: [
    injected(),
    coinbaseWallet(),
    //walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [base.id]: http('https://base.drpc.org'),
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [mainnet.id]: http(),
  },
})

export const mainnetConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
})