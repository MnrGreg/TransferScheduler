import { http, createConfig } from 'wagmi'
import { sepolia, foundry } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia, foundry],
  connectors: [
    injected(),
    coinbaseWallet(),
    //walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [foundry.id]: http('http://localhost:8545'),
  },
})