/**
 * Paper Cloud Games — relay server.
 *
 * Hosts the game (static files) and relays ALL messages between a room's
 * host and guest over WebSocket. The host still runs the authoritative game
 * logic; this server only forwards data (no WebRTC involved).
 *
 * Env:
 *   PORT        listen port (default 8787)
 *   PUBLIC_DIR  directory of static files to serve (e.g. the game build);
 *               omit for relay-only mode (local dev)
 *
 * Info page: http://<addr>:8787/
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, type WebSocket } from 'ws';

const PORT = Number(process.env.PORT ?? 8787);
const PUBLIC_DIR = process.env.PUBLIC_DIR;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = (req.url ?? '/').split('?')[0];
  if (url === '/' || url === '/info') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(infoPage());
    return;
  }
  if (PUBLIC_DIR) {
    // serve the static game build (path traversal guarded)
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(PUBLIC_DIR, rel === '/' ? 'index.html' : rel);
    try {
      let data = await readFile(file);
      let type = MIME[extname(file)] ?? 'application/octet-stream';
      if (!MIME[extname(file)] && !extname(file)) {
        // extension-less path: try index.html (SPA fallback)
        file = join(file, 'index.html');
        data = await readFile(file);
        type = MIME['.html'];
      }
      res.writeHead(200, { 'content-type': type });
      res.end(data);
      return;
    } catch {
      // fall through to 404
    }
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

interface Room {
  host: WebSocket;
  guest: WebSocket | null;
}
const rooms = new Map<string, Room>();

function send(ws: WebSocket, msg: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function newCode(): string {
  let code: string;
  do {
    code = String(1000 + Math.floor(Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

wss.on('connection', (ws) => {
  let roomCode: string | null = null;
  let role: 'host' | 'guest' | null = null;

  ws.on('message', (raw) => {
    let msg: { t?: string; code?: unknown; data?: unknown };
    try {
      msg = JSON.parse(String(raw)) as typeof msg;
    } catch {
      return;
    }
    if (msg.t === 'create') {
      roomCode = newCode();
      role = 'host';
      rooms.set(roomCode, { host: ws, guest: null });
      send(ws, { t: 'created', code: roomCode });
    } else if (msg.t === 'join' && typeof msg.code === 'string') {
      const room = rooms.get(msg.code);
      if (!room || room.guest) {
        send(ws, { t: 'error', msg: 'room not available' });
        return;
      }
      roomCode = msg.code;
      role = 'guest';
      room.guest = ws;
      send(ws, { t: 'joined' });
      send(room.host, { t: 'peer-ready' });
    } else if (roomCode) {
      // relay every other message (game data, state, actions) to the peer
      const room = rooms.get(roomCode);
      if (!room) return;
      const peer = role === 'host' ? room.guest : room.host;
      if (peer) send(peer, msg);
    }
  });

  ws.on('close', () => {
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (role === 'host') {
      rooms.delete(roomCode);
      if (room.guest) send(room.guest, { t: 'peer-left' });
    } else {
      room.guest = null;
      send(room.host, { t: 'peer-left' });
    }
  });
});

function infoPage(): string {
  const addrs: string[] = [];
  for (const [name, ifaces] of Object.entries(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.internal) continue;
      addrs.push(`${name}: ${iface.family === 'IPv6' ? `[${iface.address}]` : iface.address}`);
    }
  }
  const list = addrs.length
    ? addrs.map((a) => `<li><code>${a}</code></li>`).join('\n')
    : '<li>(no non-internal addresses detected)</li>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Paper Cloud — Relay Server</title></head>
<body style="font-family:monospace;background:#f6f1e5;color:#3b372e;padding:24px;line-height:1.8">
<h2>Paper Cloud Games — Relay Server</h2>
<p>Server port: <b>${PORT}</b></p>
<p>Server addresses (send the IPv6 one to your friend):</p>
<ul>${list}</ul>
<p>Enter in the game as: <code>[fe80::1]:8787</code> or <code>localhost:8787</code> (same-machine testing)</p>
</body></html>`;
}

server.listen(PORT, '::', () => {
  console.log(`[relay] listening on :::${PORT} (IPv6+IPv4)${PUBLIC_DIR ? `, serving ${PUBLIC_DIR}` : ''}`);
});
