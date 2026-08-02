import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true, // reachable from tablets on the LAN
    port: 5173,
    fs: { allow: ['..'] }, // allow importing Core/ outside the project root
  },
  build: { outDir: 'dist' },
});
