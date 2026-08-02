# Roll-and-Move

**Languages: [English](README.md) | [简体中文](README_zh_CN.md)**

A two-player dice-and-path board game. Players take turns rolling a classic six-sided die and moving along a 5×5 snake path from the start (top-left) to the finish (bottom-right); the first to arrive wins. Each turn a player may roll up to 3 times and keeps the last result.

Built with **TypeScript + Vite**, web-native DOM/CSS (no game engine). Paper hand-drawn style, bilingual UI (Simplified Chinese / English).

## Features

- Local same-screen play for two players
- Online play via the relay server (host-authoritative; host = red, guest = blue)
- Up to 3 rolls per turn with reroll / confirm decisions; automatic move after the last roll
- Persistent saves: local game survives refresh (only dice state resets); online disconnects auto-save for manual recovery
- Built-in zoom, fullscreen toggle, keyboard support (Space = roll / confirm)

## Development

Prerequisites: Node.js ≥ 22

```bash
npm install
npm run dev        # http://localhost:5173 (LAN: http://<ip>:5173)
```

For online play, also run the relay server:

```bash
cd ../SignalingServer
npm install
node server.ts
```

Then open the game's online setup page and enter the relay address (e.g. `localhost:8787` or `<server-ip>:8787`). The address defaults to the page's own host.

## Build

```bash
npm run build      # outputs to dist/
```

## Deployment (manual)

The game is fully static, and the relay server can also host the built files — one process serves both the page and the WebSocket.

1. **Build the game:**

   ```bash
   npm run build
   ```

2. **Run the relay server with the build as its public directory:**

   ```bash
   cd ../SignalingServer
   npm install
   PUBLIC_DIR=../Roll-and-Move/dist PORT=8787 node server.ts
   ```

3. **Reverse-proxy with Nginx** (WebSocket upgrade required). Example server block:

   ```nginx
   server {
       listen 443 ssl;
       server_name play.example.com;

       ssl_certificate     /etc/letsencrypt/live/play.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/play.example.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:8787;
           proxy_set_header Host $host;
       }
       location /ws {
           proxy_pass http://127.0.0.1:8787;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

   Note: the relay runs over plain WebSocket and works over HTTP too; TLS is still recommended for production.

4. **Play:** open `https://play.example.com` — the online setup page defaults the server address to the page's own hostname.

> Container deployment is available too — a Dockerfile is included in the repo (`SignalingServer/Dockerfile`), the image serves the built game + the WebSocket relay on one port.
>
> **Live instance:** [https://clemooling.top/play/roll-and-move/](https://clemooling.top/play/roll-and-move/) — the online setup page defaults the server address to the page's own host/path automatically.
