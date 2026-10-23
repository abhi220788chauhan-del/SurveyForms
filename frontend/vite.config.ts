import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Forms API used by the dev-server proxy (npm run dev in ../backend).
  const target = env.DEV_API_PROXY_TARGET || 'http://localhost:4000';
  return {
    plugins: [react()],
    // strictPort: a silent fallback to 5175 would be an origin the API doesn't allow (CORS/403).
    server: { port: 5174, strictPort: true, proxy: { '/api': { target, changeOrigin: false } } },
    preview: { port: 4174, proxy: { '/api': { target, changeOrigin: false } } },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
