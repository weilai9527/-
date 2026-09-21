import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/huobao-canvas',
  cacheDir: 'node_modules/.vite-dev',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'https://api.chatfire.site',
        changeOrigin: true
      }
    }
  }
})
