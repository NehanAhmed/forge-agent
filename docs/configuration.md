# Configuration

Forge keeps its settings in one global file:

```
~/.forge/config.json
```

The file is optional. If it is missing or contains invalid JSON, Forge runs with the
defaults below. `forge config set-key` creates it with owner-only permissions (`0600`) and
preserves whatever else is already there.

A complete file looks like this:

```json
{
  "children": {
    "maxDepth": 2,
    "maxPerTask": 4,
    "maxPerTree": 10
  },
  "ui": {
    "ascii": false,
    "timestamps": true,
    "showCost": true,
    "compactLog": true,
    "alternateScreen": true,
    "logWindow": 2000
  }
}
```

Settings apply to the next `forge` process you start.

## Child task limits

Child tasks are created by the agent with `spawn_task`, not by hand.

| Key | Default | Meaning |
| --- | --- | --- |
| `children.maxDepth` | `2` | How many levels of children a task tree may have |
| `children.maxPerTask` | `4` | Direct children one task may spawn |
| `children.maxPerTree` | `10` | Total tasks in one tree, including the root |

## Interface

These affect the dashboard only; chat ignores them.

| Key | Default | Meaning |
| --- | --- | --- |
| `ui.ascii` | `false` | Use plain ASCII glyphs instead of Unicode |
| `ui.timestamps` | `true` | Show a timestamp on each log line |
| `ui.showCost` | `true` | Show accumulated cost in task details |
| `ui.compactLog` | `true` | One line per log entry; `false` starts in wrapped mode |
| `ui.alternateScreen` | `true` | Run the dashboard in the alternate terminal buffer |
| `ui.logWindow` | `2000` | Log entries kept per task for display |

Values of the wrong type fall back to the default; `logWindow` must be a positive number.

Two keys are read from the file but not yet connected to behavior: `ui.bell` (default
`false`) and `ui.renderBatchMs` (default `50`). Leave them out unless you are working on
the code.

## Environment variables

| Variable | Effect |
| --- | --- |
| `OPENROUTER_API_KEY` | API key. Overrides the key in `~/.forge/config.json` |
| `NO_COLOR` | Any value disables color output; selection stays visible |
| `INK_SCREEN_READER` | `true` switches to a linear, ASCII, no-animation layout |

The dashboard also needs a real TTY. Redirected output exits with a message instead of
rendering a broken screen.

## API key resolution

Forge checks these in order and uses the first key it finds:

1. `OPENROUTER_API_KEY` in a `.env` file in the current directory (Forge loads it with
   override enabled, so it wins over a key already exported in your shell).
2. `OPENROUTER_API_KEY` in the environment.
3. `apiKey` in `~/.forge/config.json`, written by `forge config set-key`.

If none is found, the process exits with an error that names both options.

## Limits fixed in code

These are not configurable through `config.json` today; change them in the source if you
need to.

| Limit | Value | Where |
| --- | --- | --- |
| Concurrent tasks | `2` | `TaskManager` constructor |
| Steps per agent run | `50` | `src/core/headless.ts` |
| Requests per task tree | `60` | `TREE_BUDGET_LIMITS`, `src/core/task-manager.ts` |
| Tokens per task tree | `1,000,000` | `TREE_BUDGET_LIMITS`, `src/core/task-manager.ts` |
| In-memory log entries | `2000` | `TaskManager` |
| Task state save debounce | `500 ms` | `TaskManager` |

## What lives where

| Path | Contents | Scope |
| --- | --- | --- |
| `~/.forge/config.json` | API key and settings | Global |
| `~/.forge/tasks/` | Task index, per-task logs and session state | Global |
| `~/.forge/worktrees/` | Task worktrees and `agent/task-*` branches | Global |
| `~/.forge/meta/meta.json` | Chat session titles and chosen models | Global |
| `.agent-sessions/` | Chat session state | Per project |

Forge does not stage or commit any of these. It does create `.agent-sessions/` inside the
project, so add that directory to `.gitignore`. Deleting a task's state directory
(`~/.forge/tasks/<taskId>/`) removes its session state only; the task index and log stay in
`~/.forge/tasks/`. Use `/discard <n>` in the dashboard to remove the task's worktree and
branch.
