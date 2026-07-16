import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  envDir: root,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@ds': root,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    fs: {
      // allow imports from the design-system at repo root
      allow: [root],
    },
    proxy: {
      // Mirror nginx prod: /api/auth/login → api:4000/auth/login
      // Override target via VITE_API_PROXY_TARGET env (e.g. when port 4000 sudah dipakai)
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    // Sourcemap dimatikan: produksi target shared hosting (low memory).
    // Aktifkan via `VITE_SOURCEMAP=1` saat butuh debug bundle.
    sourcemap: process.env.VITE_SOURCEMAP === '1',
    // Code-split vendor chunks utk memori build lebih kecil + chunk SPA <500KB
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          lucide: ['lucide-react'],
          xlsx: ['xlsx'],
          qrcode: ['qrcode.react'],
        },
      },
    },
  },
  // @ts-expect-error: vitest extends vite config
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
