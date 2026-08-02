/**
 * Paper Cloud Games — WebRTC signaling server.
 *
 * Rooms pair a host and a guest; the server relays SDP/ICE 'signal' messages
 * between them. All game data flows over the peers' own WebRTC DataChannel
 * (IPv6 P2P), never through this server.
 *
 * Run: node server.ts   (PORT env to override, default 8787)
 * Info page: http://<addr>:8787/  — shows the server's network addresses.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, type WebSocket } from 'ws';

const PORT = Number(process.env.PORT ?? 8787);

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/' || req.url === '/info') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(infoPage());
    return;
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
    } else if (msg.t === 'signal' && roomCode) {
      const room = rooms.get(roomCode);
      if (!room) return;
      const peer = role === 'host' ? room.guest : room.host;
      if (peer) send(peer, { t: 'signal', data: msg.data });
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
    : '<li>（未检测到非内部地址）</li>';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>Paper Cloud — 信令服务器</title></head>
<body style="font-family:monospace;background:#f6f1e5;color:#3b372e;padding:24px;line-height:1.8">
<h2>Paper Cloud Games — 信令服务器</h2>
<p>服务器端口：<b>${PORT}</b></p>
<p>网页端服务器地址（把 IPv6 地址发给朋友，替换成你的实际地址）：</p>
<ul>${list}</ul>
<p>网页端填写示例：<code>[fe80::1]:8787</code> 或 <code>localhost:8787</code>（同机测试）</p>
</body></html>`;
}

server.listen(PORT, '::', () => {
  console.log(`[signaling] listening on :::${PORT} (IPv6+IPv4)`);
});
