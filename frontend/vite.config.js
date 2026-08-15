import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // <--- TAMBAHIN INI BIAR WEBSOCKET IKUT DI-PROXY
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
