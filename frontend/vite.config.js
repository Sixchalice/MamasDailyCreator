import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    proxy: {
        '/api': {
            target: process.env.VITE_API_BASE_URL,
            changeOrigin: true,
        },
    },
  }
})
