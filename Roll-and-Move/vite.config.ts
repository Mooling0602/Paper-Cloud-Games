import { defineConfig } from 'vite';
import { appendFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  server: {
    host: true, // reachable from tablets on the LAN
    port: 5173,
    fs: { allow: ['..'] }, // allow importing Core/ outside the project root
  },
  build: { outDir: 'dist' },
  plugins: [
    {
      // Dev-only: the game posts layout/error info to /__debug and we append
      // it to debug.log so the developer can read what the tablet reports.
      name: 'debug-log',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/__debug') {
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', () => {
              try {
                const line = JSON.stringify({ t: new Date().toISOString(), ...JSON.parse(body) });
                appendFileSync('debug.log', line + '\n');
              } catch {
                /* ignore malformed */
              }
              res.statusCode = 200;
              res.end('ok');
            });
            return;
          }
          next();
        });
      },
    },
  ],
});
