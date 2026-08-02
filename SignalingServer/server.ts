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
 *   CONFIG_FILE path to a JSON config file (default ./config.json)
 *
 * Config file (config.json):
 *   { "authToken": "..." }  — when set, production mode is on and the
 *   /info and /stats pages require the token via the X-Auth-Token header.
 *   Without the file (or with an empty token) everything stays open (dev).
 *
 * Info page: http://<addr>:8787/  (production: token required)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { join, normalize, extname } from 'node:path';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, type WebSocket } from 'ws';

const PORT = Number(process.env.PORT ?? 8787);
const PUBLIC_DIR = process.env.PUBLIC_DIR;

// ---- production mode (token from the config file) ----
let authToken = '';
try {
  const cfg = JSON.parse(
    readFileSync(process.env.CONFIG_FILE ?? join(process.cwd(), 'config.json'), 'utf8'),
  ) as { authToken?: unknown };
  if (typeof cfg.authToken === 'string') authToken = cfg.authToken;
} catch {
  /* no config file -> dev mode, everything open */
}
const prod = authToken.length > 0;

function authed(req: IncomingMessage): boolean {
  const t = req.headers['x-auth-token'];
  if (typeof t !== 'string' || t.length !== authToken.length) return false;
  return timingSafeEqual(Buffer.from(t), Buffer.from(authToken));
}

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
  const [path, query] = (req.url ?? '/').split('?');
  // /stats reports how many rooms are currently open (host in lobby or
  // mid-game) — the deployment script waits until this is 0 before
  // recreating the container so players are never cut off mid-session.
  if (path === '/stats') {
    if (prod && !authed(req)) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ activeRooms: rooms.size }));
    return;
  }
  // /info is the server info page; / is the game when PUBLIC_DIR is set.
  // Production: /info needs the token — unauthenticated visitors get the
  // login shell (token input); ?raw=1 with a valid token returns the body.
  if (path === '/info' || (!PUBLIC_DIR && path === '/')) {
    if (!prod) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(infoPage(rooms.size));
      return;
    }
    if (query === 'raw=1') {
      if (!authed(req)) {
        res.writeHead(401, { 'content-type': 'text/plain' });
        res.end('unauthorized');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(infoBody(rooms.size));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(authed(req) ? infoPage(rooms.size) : loginShell());
    return;
  }
  if (PUBLIC_DIR) {
    // serve the static game build (path traversal guarded)
    const rel = normalize(path).replace(/^(\.[.]?[/\\])+/, '');
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
      if (roomCode) return; // already in a room — ignore (double-tap protection)
      roomCode = newCode();
      role = 'host';
      rooms.set(roomCode, { host: ws, guest: null });
      send(ws, { t: 'created', code: roomCode });
    } else if (msg.t === 'join' && typeof msg.code === 'string') {
      if (roomCode) return; // already in a room — ignore
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
    // the room always dies when either side leaves — no stale rooms, no re-joins
    rooms.delete(roomCode);
    if (role === 'host') {
      if (room.guest) send(room.guest, { t: 'peer-left' });
    } else {
      send(room.host, { t: 'peer-left' });
    }
  });
});

function infoBody(activeRooms: number): string {
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
  return `<p>Active rooms: <b>${activeRooms}</b></p>
<p>Server port: <b>${PORT}</b></p>
<p>Server addresses:</p>
<ul>${list}</ul>
<p>The game's online setup page defaults its server address to the page's own host.</p>`;
}

function infoPage(activeRooms: number): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Paper Cloud — Relay Server</title></head>
<body style="font-family:monospace;background:#f6f1e5;color:#3b372e;padding:24px;line-height:1.8">
<h2>Paper Cloud Games — Relay Server</h2>
${infoBody(activeRooms)}
</body></html>`;
}

function loginShell(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Paper Cloud — Relay Server</title></head>
<body style="font-family:monospace;background:#f6f1e5;color:#3b372e;padding:24px;line-height:1.8">
<h2>Paper Cloud Games — Relay Server</h2>
<p>Restricted area — enter the access token:</p>
<label>Token: <input id="token" type="password"></label>
<button onclick="submitToken()">View</button>
<p id="err" style="color:#a33"></p>
<div id="info"></div>
<script>
const KEY = 'relay-token';
async function load() {
  const t = localStorage.getItem(KEY) || '';
  if (!t) return;
  const r = await fetch('/info?raw=1', { headers: { 'X-Auth-Token': t } });
  if (r.ok) show(await r.text());
}
async function submitToken() {
  const t = document.getElementById('token').value.trim();
  const r = await fetch('/info?raw=1', { headers: { 'X-Auth-Token': t } });
  if (!r.ok) { document.getElementById('err').textContent = 'invalid token'; return; }
  try { localStorage.setItem(KEY, t); } catch {}
  show(await r.text());
}
function show(html) {
  document.getElementById('err').textContent = '';
  document.getElementById('token').style.display = 'none';
  document.getElementById('info').innerHTML = html;
}
load();
</script></body></html>`;
}

server.listen(PORT, '::', () => {
  console.log(`[relay] listening on :::${PORT} (IPv6+IPv4)${PUBLIC_DIR ? `, serving ${PUBLIC_DIR}` : ''}`);
});
