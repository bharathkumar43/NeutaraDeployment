/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    port: 3201,
    proxy: {
      '/api': { target: 'http://localhost:3200', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3200', changeOrigin: true },
    },
  },
});
