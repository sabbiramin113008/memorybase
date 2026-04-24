// @ts-check
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5273,
    proxy: {
      '/api': 'http://localhost:8120',
      '/events': 'http://localhost:8120',
      '/mcp': 'http://localhost:8120',
    },
  },
})
