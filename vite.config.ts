import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  build: {
    outDir: '../dist'
  },
  server: {
    port: 5174,
    host: 'localhost',
    allowedHosts: [
      'talent-swipe-4.preview.emergentagent.com'
    ]
  }
})
