import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs (e.g. 192.168.1.7) so mobile phones can scan and access
    port: 5173,
  },
})
