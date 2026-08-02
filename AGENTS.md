# AGENTS.md

This file documents the coding standards and AI collaboration guidelines for the Paper Cloud Games repository. Both human developers and AI coding assistants should follow it.

## Coding Standards

### MEMORY.md Usage

- `MEMORY.md` at the repository root records important project background and decisions that have been discussed but are **not** being acted on yet (deferred decisions).
- When a discussion concludes with something that is decided but not implemented right away, record it in `MEMORY.md`.
- `MEMORY.md` states the natural language it uses in its own content.
- Keep entries concise and factual. Decisions already implemented belong in `README.md` / `AGENTS.md` / `LICENSE`, not in `MEMORY.md`.

### Development Process

- Before writing any code, a clear, implementable technical plan and design must be established, with no unresolved parts left open.
- If any part of the plan remains unclear or undecided, ask the user until they explicitly confirm and instruct to start writing code.
- Any naming or convention (规范) must be proposed to and explicitly confirmed by the user before being adopted; do not establish conventions on your own.
- Project file trees (directory structures) must not be written into long-term files (e.g. AGENTS.md, README.md); if needed, record them in memory files instead.
- Game subprojects may have their own `MEMORY.md`.
- This rule does not apply when the user explicitly lets the AI agent decide on its own.

### Semantic Commits and Version Management

**Commit messages follow Conventional Commits**

- Format: `<type>(<scope>): <description>`
- `type` must be one of the following:
  - `feat`: a new feature
  - `fix`: a bug fix
  - `docs`: documentation (README, LICENSE, AGENTS.md, etc.)
  - `style`: formatting or style changes (no logic change)
  - `refactor`: refactoring (no feature change, no bug fix)
  - `perf`: performance improvement
  - `test`: tests
  - `build`: build system or dependency changes
  - `ci`: CI configuration changes
  - `chore`: miscellaneous changes (not covered by the above)
  - `revert`: revert a commit
- `scope` is optional, e.g. `docs`, `Roll-and-Move`
- Breaking changes: add `!` after `type` (e.g. `feat!:`), and describe the `BREAKING CHANGE` in the body or footer

**Versioning follows Semantic Versioning (SemVer)**

- Version format: `MAJOR.MINOR.PATCH`
- `MAJOR`: incompatible API changes (breaking changes)
- `MINOR`: backward-compatible new features
- `PATCH`: backward-compatible bug fixes
- During `0.x` (pre-1.0.0): `MINOR` increments may include breaking changes
- Version tags use the `v` prefix, e.g. `v0.1.0`

**Miscellaneous**

- Game subprojects live directly at the repository root as `<Game-Name>/` directories (e.g. `Roll-and-Move/`), named in English, **case-sensitive** (case preserved exactly as decided); no `games/` parent directory.
- Each game subproject must maintain its own `AGENTS.md` in its directory (to be added when creating the game project).

## Technology Stack

- Language: **TypeScript**
- Build tooling: **Vite**
- **No game engine**: UI controls and game elements are written with web-native technology (DOM/CSS/TypeScript); canvas is only used when a specific game genuinely needs it
- Reusable logic shared across games lives in `Core/` at the repository root (device detection, i18n manager, zoom controller, paper style theme)
- Games are standalone Vite projects in their `<Game-Name>/` directory; monorepo workspace tooling (e.g. pnpm workspaces) is deferred until a second game or a shared package appears
- Online multiplayer signaling: `SignalingServer/` at the repository root (Node.js + ws, dual-stack IPv6/IPv4); game data flows over the peers' own WebRTC DataChannel (IPv6 P2P, host-authoritative)

## Design Guidelines

- **Game types**: mainly board games (桌游). Requirements:
  - Touch-friendly, supporting multi-touch
  - Same-screen multiplayer (multiple players on one device)
  - LAN or remote online multiplayer
- **Online multiplayer**: host-authoritative — the host (房主) runs the server side as the host machine, so the server logic is embedded in the webpage; no separate server deployment- **Primary target**: tablets (convenient for same-screen multiplayer); local keyboard/mouse and gamepad support are also required
- **Adaptation priority**: multi-touch > keyboard/mouse > gamepad (gamepad must support multiple devices for split-play)
- **Small screens (phones, etc.)**: lowest priority; detect the device screen size and **completely block entry** with a friendly message — mobile users cannot use the game
- **Testing**: tablets of any OS, any PC, and the Chrome browser
- **Layout**: games must be responsive to the web page size, with good zoom/scale adjustment support
- **Zoom strategy**: browser zoom by default, plus a built-in in-game zoom system that is always available; when browser zoom conflicts with game interaction (per game), disable browser zoom and use the built-in zoom instead
  - Browser touch pinch zoom must be disabled within the game area (e.g. `touch-action`) to avoid conflicts with multi-touch gameplay; keyboard/mouse browser zoom (Ctrl+±, Ctrl+wheel) is preserved
  - The built-in zoom scales the game view: anchored at the viewport center, with percentage steps (e.g. 100% → 125% → 150% …), showing the current level and a "reset to 100%" control
  - Division of labor: browser zoom = page level, built-in zoom = game view level; the game view should fill the viewport, and the built-in zoom scales the rendered view within it
