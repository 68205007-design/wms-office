import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' ทำให้ไฟล์ build ใช้งานได้ทั้งบน GitHub Pages (/repo-name/) และเสิร์ฟจาก backend
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
