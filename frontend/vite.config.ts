import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
    mainFields: ['module', 'main'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Vite's http-proxy automatically forwards cookies, but we need to ensure
        // the cookie domain is rewritten so cookies set by backend work with proxy
        cookieDomainRewrite: {
          'localhost:3001': 'localhost:3000',
        },
      },
    },
  },
});

