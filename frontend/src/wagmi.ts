import { http, createConfig } from 'wagmi'
import { base, foundry } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, foundry],
  connectors: [
    injected(),
    coinbaseWallet(),
    //walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [base.id]: http(),
    [foundry.id]: http('http://localhost:8545'),
  },
})