# MEMORY.md

本文件记录项目的重要背景信息，以及**讨论过但暂时不会推进**的内容。已落实的决策（见 README、AGENTS.md、LICENSE）不在此重复。

所使用的自然语言：中文（简体）

## 项目方向（背景）

- Paper Cloud Games 主要做**桌游**（board games），与普通网页小游戏相比会有一些不同的特性（如多人回合制、房间/联机、共享游戏状态等——具体特性尚未设计，待游戏项目启动时再定）。
- 当前 README 保持通用表述（"网页端桌面游戏"），将来可能需要补充"主要收录桌游"的说明——**暂不修改**。

## 讨论过但暂不推进

1. **GitHub 组织 vs monorepo**：已决定先采用 monorepo（单仓库、统一提交/CI/许可证）。将来出现以下情况时可转向 GitHub 组织（组织名建议用 Mooling Studio）：
   - 出现多个维护者或外部贡献者变多
   - 某个游戏体量巨大、需要独立发布节奏
   - 出现非游戏类的姊妹项目（如共享引擎库）

2. **游戏子目录不单独 `git init`**：嵌套 `.git` 会破坏 monorepo 结构（外层仓库会将其视为 gitlink）；将来若需拆分，用 `git subtree split` 保留历史。

3. **技术栈**：未定。候选方案：纯原生 HTML/CSS/JS（零依赖）、Phaser 等游戏引擎、React/Vue 等框架。待第一个游戏启动时决定。

4. **第一个游戏**：未定。曾提议从简单游戏起步（贪吃蛇、2048、打砖块、俄罗斯方块等经典练手类）。

5. ~~游戏列表与技术栈不写入 README~~（已作废）：项目已发布到 GitHub，README 已包含游戏列表与快速开始（2026-08-02）。
6. **monorepo 包管理工具（如 pnpm workspace）与共享包结构**：待出现第二个游戏或共享包时再定（需用户确认）。
7. **小屏完全拦截（手机等）**：测试期间**暂时移除**，测试完成后恢复（根 AGENTS.md 已同步标注；`Core/device/screen.ts` 的 `isSmallScreen` 保留备用）。
8. **联机架构变更（2026-08-02）**：废弃 WebRTC P2P（安全上下文/flag/NAT 门槛过高），改为**服务器中继**（`SignalingServer/` 托管游戏 + 全量消息转发，主机权威保留）；WebSocket 无需安全上下文，Chrome flag/自签名证书方案全部废弃。云部署（Podman + Nginx）待本地中继验证通过后进行。
9. **生产部署（2026-08-02）**：`https://clemooling.top/play/roll-and-move/`——Podman 容器（`SignalingServer/Dockerfile`，绑定 127.0.0.1:8787）+ 服务器 nginx 前缀剥离反代（`/play/roll-and-move/` → `:8787/`，`proxyWebsockets`）；Termux 无法构建容器镜像（无 podman），改为服务器上 `podman build`；NixOS `cache.nixos.org` 不稳定，构建需临时加 USTC 镜像 `--option substituters`；镜像更新流程：本地 `npm run build` → 打包 → scp → 服务器 `podman build -t paper-cloud:latest` → 重建容器。

## 当前测试设备

- 小米平板5 + 安卓16，Chrome 浏览器
