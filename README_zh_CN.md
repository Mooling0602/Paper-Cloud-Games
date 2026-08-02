# 纸云游戏（Paper Cloud Games）

**语言：[English](README.md) | [简体中文](README_zh_CN.md)**

## 关于本项目

**纸云游戏（Paper Cloud Games）** 仅为本项目的名称，**并非**任何组织或公司的名称。鉴于搜索引擎未给出有效结果，如有组织或公司已在本项目前使用此名称，可与本项目作者协商修改。

纸云游戏收录使用 AI 辅助编程完成的网页端桌游（以桌面设备为主，兼顾较小屏幕），并以 [MIT 协议](LICENSE) 进行开源。

## 游戏

- **Roll-and-Move** — 双人掷骰走格桌游，支持同屏本地对战与联机对战（见 [Roll-and-Move/README.md](Roll-and-Move/README.md)）

## 快速开始

前置要求：Node.js ≥ 22

```bash
# 1. 运行游戏（开发服务器）
cd Roll-and-Move
npm install
npm run dev              # http://localhost:5173

# 2. 运行中继服务器（联机必需）
cd ../SignalingServer
npm install
node server.ts           # ws://localhost:8787
```

打开 http://localhost:5173 即可同屏游玩。联机时在游戏的联机设置页填写中继服务器地址（如 `localhost:8787`），其他设备通过服务器的局域网/IPv6 地址访问。

## 项目结构

```
Core/            跨游戏共享的可复用逻辑（i18n、设备检测、缩放、纸面风格）
Roll-and-Move/   第一款游戏——掷骰走格桌游
SignalingServer/ 联机中继服务器（托管游戏构建产物 + 消息转发）
```

## 归属

本项目归属于 **木泠工作室（Mooling Studio）**，实际上为木泠本人，即 [github.com/Mooling0602](https://github.com/Mooling0602)。

## 开源协议

[MIT](LICENSE)
