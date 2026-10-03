# Forge — Agent Instructions

Forge is a terminal-based AI coding agent (CLI + TUI). Built with TypeScript, Ink (React TUI), and the `@openrouter/agent` SDK.

## Quick Start

```bash
pnpm install
pnpm build          # compiles to dist/
forge config set-key <OPENROUTER_KEY>  # one-time setup
forge               # run agent in current directory
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm build` | TypeScript → `dist/` + adds shebang to CLI entry |
| `pnpm dev` | Watch mode with `tsx` (auto-rebuilds on change) |
| `pnpm eval` | Runs evaluation (runner not yet implemented) |
| `forge` | Start new session in `cwd` |
| `forge --resume [ID]` | Resume latest or specific session |
| `forge config set-key <key>` | Save OpenRouter key to `~/.forge/config.json` |

## Architecture Overview

- **Entry**: `src/cli/app.tsx` — Ink TUI, handles CLI args (`config set-key`, `--resume`), renders chat, manages confirmations
- **Agent loop**: `src/cli/agent-cli.ts` — wraps `@openrouter/agent` `callModel()`, streams reasoning/tool calls/assistant text
- **Tools**: `src/tools/definitions.ts` — 6 tools (`run_bash`, `read_file`, `write_file`, `replace_string_in_file`, `spawn_sub_agent`, `search_code`)
- **State**: `src/core/state.ts` — persists `ConversationState` to `.agent-sessions/<id>.state.json`; metadata in `.forge/meta/meta.json`
- **Constants**: `src/core/constants.ts` — model, system prompt, iteration limits, risky tool list

## Critical Conventions

- **ESM only** (`"type": "module"` in package.json); all imports use `.js` extensions
- **Strict TS**: `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`
- **Risky tools require confirmation**: `run_bash`, `write_file`, `replace_string_in_file` prompt `y/n` in TUI
- **Session persistence**: Automatic per session ID; `.agent-sessions/` lives in the **working directory**, not the repo
- **API key**: Stored in `~/.forge/config.json` (never commit)
- **Requires `rg` (ripgrep)** on PATH for `search_code` tool

## Development Notes

- `postbuild` script (`scripts/add-shebang.js`) prepends `#!/usr/bin/env node` to `dist/cli/app.js` for `npm link` / global install
- No automated test suite (`test` script exits 1)
- `pnpm eval` references `evals/runner.ts` which does not exist yet
- Model default: `qwen/qwen3.8-27b:free` (see `MODEL` in constants)
- Max iterations: 20 (main), 10 (sub-agent)
- Compaction triggers at 15k tokens, keeps 5 recent messages

## File Layout

```
src/
  cli/
    app.tsx          # TUI, CLI entry, session handling
    agent-cli.ts     # Agent orchestration, streaming callbacks
  core/
    client.ts        # OpenRouter client wrapper
    constants.ts     # Model, prompts, limits, tool lists
    state.ts         # Session persistence, compaction
    compaction.ts    # Token-based history compaction
  tools/
    definitions.ts   # Tool schemas + confirmation wiring
    implementations.ts  # Tool logic (bash, fs, grep, sub-agent)
    helpers.ts       # Session title derivation
  types/index.ts     # Shared message types
```

## Common Pitfalls

- Forgetting `pnpm build` after edits — CLI runs from `dist/`, not `src/`
- Missing `rg` — `search_code` tool fails silently without it
- Editing `dist/` directly — changes lost on rebuild
- Not setting API key — agent errors on first model call