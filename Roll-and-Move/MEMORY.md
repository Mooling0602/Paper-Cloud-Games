# MEMORY.md — Roll-and-Move

本文件记录 Roll-and-Move 游戏项目的重要背景信息，以及**讨论过但暂时不会推进**的内容。已落实的决策（见 AGENTS.md）不在此重复。

所使用的自然语言：中文（简体）

## 当前文件结构（与代码同步）

```
Roll-and-Move/
├── index.html               # 入口页面（字体加载）
├── package.json / tsconfig.json / vite.config.ts
└── src/
    ├── main.ts              # 启动：小屏拦截（宽<768 或 高<600 完全阻止）、加载→菜单→游戏流程、全屏、调试信息
    ├── style.css            # 纸面风格全部样式（DOM 原生）
    ├── debug.ts             # 调试上报（dev server 日志）
    ├── i18n/                # 语言文件 en.json / zh-CN.json（双语）
    ├── logic/               # 纯逻辑（无渲染依赖）
    │   ├── board.ts         # 5×5 蛇形路径计算
    │   └── turn.ts          # 回合状态机：2 玩家、每轮最多 3 次掷骰
    └── ui/                  # DOM 视图层
        ├── paper.ts         # DOM 工具：元素创建、纸面按钮、i18n 刷新
        ├── loading.ts       # 局外：加载进度条（等待字体）
        ├── menu.ts          # 局外：菜单（开始/语言切换/署名）
        └── game.ts          # 局内：CSS Grid 棋盘、骰子、控件、回合流程

Core/（仓库根目录，可复用逻辑，供所有游戏使用）
├── device/screen.ts         # 小屏检测
├── device/fullscreen.ts     # 全屏工具
├── i18n/LanguageManager.ts  # 双语语言管理器
├── zoom/ZoomController.ts   # 内置缩放逻辑
└── style/paper.ts           # 纸面风格主题（颜色/字体）
```

## 技术栈变更记录

- **2026-08-02**：废弃 Phaser 4，改为 Web 原生技术栈（DOM/CSS/TypeScript），根 AGENTS.md 已同步更新约定

## 讨论过但暂不推进

- 联机（局域网/远程，主机权威）：第二期再做
- 手柄支持：后续版本
- 特殊格子（前进/后退/回起点）：后续版本
