import { http, createConfig } from 'wagmi'
import { arbitrum, base, polygon, sepolia, mainnet } from 'wagmi/chains'
import { coinbaseWallet, injected, safe } from 'wagmi/connectors'

export const config = createConfig({
  chains: [arbitrum, base, polygon, sepolia],
  connectors: [
    injected(),
    coinbaseWallet(),
    safe({
      allowedDomains: [/app.safe.global$/],
    }),
    //walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [base.id]: http('https://base.drpc.org'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [sepolia.id]: http('https://sepolia.drpc.org'),
  },
})

export const mainnetConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
})