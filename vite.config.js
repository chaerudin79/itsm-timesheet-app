import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Force Vite restart
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    watch: {
      usePolling: true // Force reliable file watching on Windows
    }
  }
})
