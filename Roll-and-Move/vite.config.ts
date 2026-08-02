import { defineConfig } from 'vite';
import { appendFileSync, readFileSync } from 'node:fs';

// self-signed dev cert (repo certs/, gitignored); WebRTC requires a secure
// context, so the dev server must run over HTTPS
const https = {
  key: readFileSync(new URL('../certs/key.pem', import.meta.url)),
  cert: readFileSync(new URL('../certs/cert.pem', import.meta.url)),
};

export default defineConfig({
  base: './',
  server: {
    host: true, // reachable from tablets on the LAN
    port: 5173,
    https,
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
