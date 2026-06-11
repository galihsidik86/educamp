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
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // @ts-expect-error: vitest extends vite config
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
