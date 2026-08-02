# 掷骰走格（Roll-and-Move）

**语言：[English](README.md) | [简体中文](README_zh_CN.md)**

双人掷骰走格桌游。玩家轮流掷一个经典六面骰子，沿着 5×5 蛇形路径从起点（左上角）走向终点（右下角），先到者获胜。每回合最多可掷 3 次，保留最后一次结果。

使用 **TypeScript + Vite** 构建，基于 Web 原生 DOM/CSS（无游戏引擎）。纸面手绘风格，双语界面（简体中文 / English）。

## 功能

- 同屏双人对战
- 通过中继服务器联机对战（主机权威；主机 = 红方，客机 = 蓝方）
- 每回合最多掷 3 次，可选择重掷或确认；最后一次掷骰后自动走格
- 持久化存档：本地对局刷新后继续（仅骰子状态重置）；联机掉线自动存档，可手动恢复
- 内置缩放、全屏切换、键盘支持（空格 = 掷骰 / 确认）

## 开发

前置要求：Node.js ≥ 22

```bash
npm install
npm run dev        # http://localhost:5173（局域网：http://<ip>:5173）
```

联机游玩还需要运行中继服务器：

```bash
cd ../SignalingServer
npm install
node server.ts
```

然后在游戏的联机设置页填写中继服务器地址（如 `localhost:8787` 或 `<server-ip>:8787`）。地址默认取当前页面自身的主机名。

## 构建

```bash
npm run build      # 输出到 dist/
```

## 部署（手动）

游戏是完全静态的，中继服务器也可以托管构建产物——一个进程同时提供页面和 WebSocket。

1. **构建游戏：**

   ```bash
   npm run build
   ```

2. **将构建产物作为公开目录运行中继服务器：**

   ```bash
   cd ../SignalingServer
   npm install
   PUBLIC_DIR=../Roll-and-Move/dist PORT=8787 node server.ts
   ```

3. **Nginx 反向代理**（需要 WebSocket upgrade）。示例配置：

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

   注意：中继基于普通 WebSocket，HTTP 也能工作；生产环境仍建议启用 TLS。

4. **游玩：** 打开 `https://play.example.com` —— 联机设置页会自动默认当前页面自身的主机名为服务器地址。

> 容器部署也已可用——仓库中包含 Dockerfile（`SignalingServer/Dockerfile`），镜像在一个端口上同时提供游戏页面和 WebSocket 中继。
>
> **线上实例：** [https://clemooling.top/play/roll-and-move/](https://clemooling.top/play/roll-and-move/) —— 联机设置页会自动默认页面自身的主机名与路径。
