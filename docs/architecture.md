# Architecture

Forge is a CLI-only TypeScript application. There is no server and no background daemon:
a single process owns the terminal, the task queue, and every agent run. The dashboard and
the chat UI are two front ends over the same core.

Start here if you are changing the code. The short version is:

```
src/cli   → Ink screens and input handling
src/ui    → pure, testable layout and interaction logic
src/core  → agent runtime, tasks, approvals, git, persistence
src/tools → tool schemas and their implementations
```

## Process entry

```
forge
└─ src/cli/app.tsx
   ├─ config set-key <key>  → write ~/.forge/config.json, exit
   ├─ chat                  → Ink chat UI → runAgent()
   └─ (default)             → TaskManager + Dashboard → runAgentHeadless() per task
```

- `config set-key` is handled before Ink starts, so it works in any terminal.
- **Chat** (`forge chat`) keeps one conversation per session. Sessions are stored in the
  project directory, so `--resume` picks up the latest one there.
- **Dashboard** (`forge`, the default) requires an interactive terminal. It validates the
  API key before switching the terminal to the alternate screen, constructs `TaskManager`,
  renders the dashboard, then starts the queue. Tasks that were queued when the previous
  process exited resume after the UI is mounted.
- On exit, `TaskManager.shutdown({ graceMs })` stops dequeuing, releases pending
  approvals, aborts active runs, and marks unfinished tasks as interrupted and resumable.

## Task engine

`src/core/task-manager.ts` coordinates everything. It owns the task map, the log buffers,
the approval inbox, the queue, and the event stream (`task:created`, `task:status`,
`task:log`, `task:usage`, `approval:requested`, `approval:resolved`, `task:review`). The
dashboard subscribes to those events instead of polling.

### Scheduling

- FIFO queue with a default concurrency of **2** (`new TaskManager({ concurrency })`).
- A per-working-directory **write lock** serializes write-capable tasks, so two agents never
  edit the same files at once. Read-only tasks skip the lock.
- A rate-limit pause parks the queue and resumes it when the window expires.
- Each task tree gets a shared budget of **60 requests and 1M tokens**, and each run is
  capped at **50 steps**.
- Child tasks use `spawn_task`, `wait_for_tasks`, and `get_task`. Limits come from
  `~/.forge/config.json` (`children.maxDepth` 2, `maxPerTask` 4, `maxPerTree` 10).
  `wait_for_tasks` releases the parent's slot so children can actually run.

### Lifecycle

| State | Meaning |
| --- | --- |
| `queued` | Waiting for a slot |
| `running` | The agent loop is executing |
| `waiting_approval` | Blocked on a tool that needs a decision |
| `done` | Finished successfully |
| `failed` | Stopped with an error; resumable |
| `cancelled` | Stopped by the user |

Transitions are enforced in `src/core/task.ts`: `queued → running → done | failed |
cancelled`, with `running ↔ waiting_approval` while approvals are pending. Resuming a failed
task returns it to `queued`.

### Approvals

Every tool that can change state goes through `executeWithPolicy` in
`src/core/approvals.ts`. The policy is per task:

- `ask` — prompt for `run_bash`, file writes, `git_add`, and `git_commit`.
- `auto_in_worktree` — auto-approve file writes inside the task's working directory and
  shell commands on a short allowlist (test runners, linters, builds, read-only git).
  Everything else still asks.
- `read_only` — the tool set itself is trimmed to read, search, `git_status`, and
  `git_diff`, so writes are impossible rather than merely refused.

Read tools and `git_status`/`git_diff` never prompt. In chat, approval is a `y`/`n` prompt.
In the dashboard, requests land in the approvals inbox (`a`).

### Worktrees

Tasks with `isolation: 'worktree'` (the default for write-capable work) get:

- A worktree under `~/.forge/worktrees/` on a branch named `agent/task-*`.
- A checkpoint commit of any remaining changes when the task finishes, so work is not lost
  to a dirty worktree. A failing hook marks the task `needs_attention` instead of discarding
  the changes.
- Review operations in `src/core/worktree.ts`: diff against the base commit, merge into the
  base branch, or discard the worktree and branch.

Guards are deliberately strict: worktrees must sit under the managed directory, branches
must start with `agent/`, merges require a clean tree and the expected base branch, and
checkpoint commits run hooks normally (no `--no-verify`). Orphaned worktrees found at
startup are reported, never deleted automatically.

### Headless runs

`src/core/headless.ts` runs one task: prompt assembly, model calls, tool execution, retries
with backoff, budget checks, abort handling, and a final summary. Streaming text is
coalesced by `StreamCoalescer` (flush at 512 characters or 120 ms) so tokens do not become
one log write and one re-render each.

## Persistence

- `~/.forge/tasks/` holds a task index and one append-only JSON-lines log per task. Writes
  are atomic (temp file + rename) and debounced by 500 ms.
- Logs are also kept in a 2,000-entry in-memory ring for the UI; the selected task's log is
  the only one read for display.
- On startup, tasks that were `running` when the process died are reconciled to a resumable
  state rather than silently reported as done.
- Chat sessions use `createStateAccessor` (`src/core/state.ts`), which compacts long
  conversations and stores todos separately from the message history.

## Tools

`src/tools/definitions.ts` declares the schemas; `implementations.ts` does the work.

| Tool | Risk |
| --- | --- |
| `read_file`, `search_code`, `git_status`, `git_diff` | read |
| `run_bash` | exec |
| `write_file`, `replace_string_in_file` | write |
| `git_add`, `git_commit` | write |
| `spawn_sub_agent` | read-only child agent |
| `spawn_task`, `wait_for_tasks`, `get_task` | task control |

`search_code` shells out to `rg`, so ripgrep must be installed. Path arguments are resolved
inside the task's working directory, and git paths are validated against the repository
root before they reach git.

## TUI

The dashboard is split so most behavior can be tested without a terminal:

- **Pure logic** in `src/ui/`: cell-accurate text handling (`text.ts`), layout math
  (`layout.ts`), selection (`selection.ts`), key routing (`keymap.ts`), theme and glyphs
  (`theme.ts`, `status-glyphs.ts`), log rendering (`log-view.ts`), the command parser, and
  the task tree builder.
- **Components** in `src/cli/components/dashboard/`: `Dashboard` owns the single `useInput`
  handler and all UI state; `TaskList`, `TaskDetail`, `HeaderBar`, `InputBar`, `KeyBar`,
  `TooSmall`, and the help/approvals/diff overlays are presentational. Hooks
  (`useTaskStore`, `useTaskLogs`, `useClock`) connect them to the manager.
- Layout adapts at 64+ columns (list + detail), 50–63 columns (single pane), and below
  50×10 (a recovery screen). Rows never wrap.
- Accessibility: semantic color slots, `NO_COLOR`, ASCII glyph mode, `INK_SCREEN_READER`
  for a linear layout, a visible selection marker, and ARIA roles on the list and input.

## Conventions

- ESM only, `NodeNext` resolution: relative imports need a `.js` suffix, including from
  `.tsx`. Tests and scripts are not typechecked; `pnpm build` is the typecheck.
- New tools need a schema, an implementation, and approval wiring — never call a write
  operation directly from a tool.
- Put interaction rules in `src/ui` and keep Ink components thin.
- Tests use `node:test` through `tsx` and run from the repository root. `tests/*.test.ts`
  covers the pure UI modules, the task engine, tools, and the dashboard components.

See [../AGENTS.md](../AGENTS.md) for commands, merge rules, and the release process.
