import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/TransferScheduler/",
  build: {
    rollupOptions: {
      external: [
        "transfer-scheduler-sdk"
      ],
    },
  },
})
