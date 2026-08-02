# AGENTS.md — Roll-and-Move

This file documents the design and coding standards for the Roll-and-Move game subproject. The repository root `AGENTS.md` applies as well; this file only adds game-specific rules.

## Game Overview

Roll-and-Move (走格子) is a 2-player same-screen board game. Players take turns rolling a classic six-sided die; the rolled number decides how many cells the player moves along the board path. The first player to reach the finish wins.

## Game Design (confirmed)

### Meta (out-of-game)

- On entry: loading screen with a progress bar
- Menu: background + UI controls (e.g. start button)

### In-game

- A solid-color **safe canvas** area hosts the board; necessary operation controls are placed around it
- **Board**: 5×5 square cells (the whole board is square), numbered 1–25 in **snake (boustrophedon) order**; start cell at top-left, finish cell at bottom-right
- **Players**: 2, same screen
- **Dice**: classic six-sided (1–6). Tap the die to roll — animation: jumps upward, spins, then lands showing the result. The actual result is a random number. **Each player may roll up to 3 times per turn and decides whether to reroll; the last roll's result is the step count**
- **Movement**: the piece moves the rolled step count with animation
- **Win condition**: reaching the finish cell wins; overflow steps are ignored
- No special cells in this version

### Visual style

- **Paper design style** (brand core): hand-drawn feel — paper-white/beige base, slightly irregular ink lines, printed colors, light paper texture

### Scope

- Phase 1: same-screen multiplayer only (LAN/remote host-authoritative networking comes later)
- Input priority per root guidelines: multi-touch > keyboard/mouse > gamepad (gamepad later)
- Small screens: completely block entry with a friendly message
- Zoom: browser zoom + built-in in-game zoom system (per root guidelines)

## Conventions

- Follow the root `AGENTS.md` conventions (semantic commits, development process, etc.); use `Roll-and-Move` as the commit scope
- Tech stack: TypeScript + Vite + Phaser 4 (root convention)
- **UI text**: bilingual (中文 + English), with dedicated language files (JSON, e.g. `src/i18n/en.json`, `src/i18n/zh-CN.json`); default language follows the browser, with a manual toggle
- **Fonts**: loaded online — Chinese: LXGW WenKai (霞鹜文楷, https://github.com/lxgw/LxgwWenKai); English: a hand-drawn Google Font (e.g. Patrick Hand); with system font fallbacks
- **Small screen blocking**: block entry when the viewport width < 768 or height < 600 (decided by the AI, user delegates)
