# MEMORY.md — Roll-and-Move

本文件记录 Roll-and-Move 游戏项目的重要背景信息，以及**讨论过但暂时不会推进**的内容。已落实的决策（见 AGENTS.md）不在此重复。

所使用的自然语言：中文（简体）

## 当前文件结构（与代码同步）

```
Roll-and-Move/
├── index.html               # 入口页面（字体/样式/小屏拦截样式）
├── package.json / tsconfig.json / vite.config.ts
└── src/
    ├── main.ts              # Phaser 启动 + 小屏检测拦截（宽<768 或 高<600 完全阻止）
    ├── i18n/                # 语言文件 en.json / zh-CN.json（双语）
    ├── scenes/
    │   ├── LoadingScene.ts  # 局外：加载进度条（等待字体加载）
    │   ├── MenuScene.ts     # 局外：纸面背景 + 开始/语言切换
    │   └── GameScene.ts     # 局内：棋盘 + 控件 + 骰子 + 缩放
    ├── game/
    │   ├── board.ts         # 5×5 蛇形路径、手绘风格子绘制、棋子
    │   ├── dice.ts          # 骰子：点击 → 上抛旋转 → 落定（1-6）
    │   └── turn.ts          # 回合状态机：2 玩家、每轮最多 3 次掷骰
    ├── ui/
    │   └── paperButton.ts   # 纸面风格按钮组件
    └── style/
        └── draw.ts          # 手绘风绘制工具（抖动线条、纸纹纹理、箭头）

Core/（仓库根目录，可复用逻辑，供所有游戏使用）
├── device/screen.ts         # 小屏检测
├── i18n/LanguageManager.ts  # 双语语言管理器
├── zoom/ZoomController.ts   # 内置缩放逻辑
└── style/paper.ts           # 纸面风格主题（颜色/字体）
```

## 讨论过但暂不推进

- 联机（局域网/远程，主机权威）：第二期再做
- 手柄支持：后续版本
- 特殊格子（前进/后退/回起点）：后续版本
