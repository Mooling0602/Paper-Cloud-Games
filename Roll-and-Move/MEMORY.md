# MEMORY.md — Roll-and-Move

本文件记录 Roll-and-Move 游戏项目的重要背景信息，以及**讨论过但暂时不会推进**的内容。已落实的决策（见 AGENTS.md）不在此重复。

所使用的自然语言：中文（简体）

## 计划中的文件结构（尚未最终确定，改动后需同步更新）

```
Roll-and-Move/
├── index.html
├── package.json / tsconfig.json / vite.config.ts
└── src/
    ├── main.ts            # Phaser 启动 + 小屏检测拦截
    ├── scenes/
    │   ├── LoadingScene.ts  # 局外：加载进度条
    │   ├── MenuScene.ts     # 局外：纸面背景 + 开始按钮
    │   └── GameScene.ts     # 局内：棋盘 + 操作控件 + 骰子
    ├── game/
    │   ├── board.ts         # 5×5 蛇形路径、格子绘制（手绘风、编号）
    │   ├── dice.ts          # 骰子：点击 → 上抛旋转 → 落定
    │   ├── players.ts       # 2 玩家状态
    │   └── turn.ts          # 回合状态机：掷骰→重投/确认→移动→换人
    ├── i18n/                # 语言文件（en.json / zh-CN.json）
    └── ui/
        ├── controls.ts      # 控件（重投/确认、缩放按钮）
        └── zoom.ts          # 内置缩放（+/−/重置 100%）
```

## 讨论过但暂不推进

- 联机（局域网/远程，主机权威）：第二期再做
- 手柄支持：后续版本
- 特殊格子（前进/后退/回起点）：后续版本
