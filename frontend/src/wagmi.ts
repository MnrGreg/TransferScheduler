import { http, createConfig } from 'wagmi'
import { foundry, mainnet, sepolia, base } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, foundry],
  connectors: [
    injected(),
    coinbaseWallet(),
    //walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [foundry.id]: http('http://localhost:8545'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
  },
})