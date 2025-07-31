import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // makes sure Vite serves from the root where index.html lives
  
  // Development server configuration
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy API calls to our Express server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Build configuration for production
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
