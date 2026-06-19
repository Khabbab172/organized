import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward /search → http://localhost:8080/search
      '/search': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Forward /pdfs/... → http://localhost:8080/pdfs/...
      '/pdfs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
