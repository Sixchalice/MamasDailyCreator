import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget =
    process.env.API_PROXY_TARGET ||
    env.VITE_API_BASE_URL ||
    'http://127.0.0.1:9000';

  return {
    plugins: [react()],
    // Docker's overlay fs can't rename dirs inside image-layer node_modules (EXDEV), which 504s deps.
    cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
    build: {
      outDir: 'build',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
