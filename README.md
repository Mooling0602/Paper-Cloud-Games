# Paper Cloud Games

**Languages: [English](README.md) | [简体中文](README_zh_CN.md)**

## About

**Paper Cloud Games** is the name of this project only — it is **not** the name of any organization or company. Since no valid search results were found for this name, if any organization or company has already used it before this project, please contact the project author to negotiate a change.

Paper Cloud Games collects web-based board games (desktop-first, with smaller screens in mind) created with AI-assisted programming, and open-sources them under the [MIT License](LICENSE).

## Games

- **Roll-and-Move** — a two-player dice-and-path board game, playable on one screen or online with a friend (see [Roll-and-Move/README.md](Roll-and-Move/README.md))

## Getting Started

Prerequisites: Node.js ≥ 22

```bash
# 1. Run the game (dev server)
cd Roll-and-Move
npm install
npm run dev              # http://localhost:5173

# 2. Run the relay server (required for online play)
cd ../SignalingServer
npm install
node server.ts           # ws://localhost:8787
```

Open http://localhost:5173 to play locally on one screen. For online play, enter the relay address (e.g. `localhost:8787`) on the game's online setup page — every other device reaches it via the server's LAN/IPv6 address.

## Project Layout

```
Core/            reusable logic shared across games (i18n, device detection, zoom, paper style)
Roll-and-Move/   the first game — a dice-and-path board game
SignalingServer/ relay server for online play (hosts the game build + forwards messages)
```

## Ownership

This project belongs to **Mooling Studio**, which is actually [Mooling](https://github.com/Mooling0602) himself, see [github.com/Mooling0602](https://github.com/Mooling0602).

## License

[MIT](LICENSE)
