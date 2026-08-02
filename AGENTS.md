# AGENTS.md

This file documents the coding standards and AI collaboration guidelines for the Paper Cloud Games repository. Both human developers and AI coding assistants should follow it.

## Coding Standards

### MEMORY.md Usage

- `MEMORY.md` at the repository root records important project background and decisions that have been discussed but are **not** being acted on yet (deferred decisions).
- When a discussion concludes with something that is decided but not implemented right away, record it in `MEMORY.md`.
- `MEMORY.md` content is written in **Simplified Chinese** (自然语言：中文（简体）内容).
- Keep entries concise and factual. Decisions already implemented belong in `README.md` / `AGENTS.md` / `LICENSE`, not in `MEMORY.md`.

### Development Process

- Before writing any code, a clear, implementable technical plan and design must be established, with no unresolved parts left open.
- If any part of the plan remains unclear or undecided, ask the user until they explicitly confirm and instruct to start writing code.
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
- `scope` is optional, e.g. `docs`, `games/xxx`
- Breaking changes: add `!` after `type` (e.g. `feat!:`), and describe the `BREAKING CHANGE` in the body or footer

**Versioning follows Semantic Versioning (SemVer)**

- Version format: `MAJOR.MINOR.PATCH`
- `MAJOR`: incompatible API changes (breaking changes)
- `MINOR`: backward-compatible new features
- `PATCH`: backward-compatible bug fixes
- During `0.x` (pre-1.0.0): `MINOR` increments may include breaking changes
- Version tags use the `v` prefix, e.g. `v0.1.0`

**Miscellaneous**

- Each game subproject must maintain its own `AGENTS.md` in its directory (to be added when creating the game project).
