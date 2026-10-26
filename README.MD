# Forge [![npm](https://img.shields.io/npm/v/@nehanahmed/forge)](https://www.npmjs.com/package/@nehanahmed/forge)
Forge is a terminal-based AI coding agent that works in your current project directory. It can inspect and search a codebase, run shell commands, edit files, and delegate read-only investigations to a read-only sub-agent.

![Forge](./public/opengraph-image.png)

Forge uses OpenRouter and saves conversation sessions locally so you can resume work later.

## Requirements

- Node.js 20 or newer
- An OpenRouter API key
- `ripgrep` (`rg`) installed and available on your `PATH` for code search

## Install

Install the published package globally:

```sh
npm install --global @nehanahmed/forge
```

Or build and link a local checkout:

```sh
git clone https://github.com/NehanAhmed/forge-agent.git
cd forge-agent
pnpm install
pnpm build
npm link
```

The `forge` command is then available in your terminal.

### Install ripgrep

Forge uses ripgrep for code search. Install it with the package manager for your operating system, then confirm `rg --version` works in a new terminal:

```powershell
winget install --id BurntSushi.ripgrep.MSVC -e
```

```sh
brew install ripgrep
```

On Debian or Ubuntu:

```sh
sudo apt install ripgrep
```

### Set your API key

After installing Forge, configure your OpenRouter API key before starting it:

```sh
forge config set-key YOUR_NEW_OPENROUTER_API_KEY
```

Replace `YOUR_NEW_OPENROUTER_API_KEY` with your key. Forge saves it in `~/.forge/config.json`. Keep the key private and do not commit it or the config file to version control.

## Use

Start Forge from the directory you want it to work in:

```sh
cd path/to/your-project
forge
```

This opens the **dashboard**, where you can queue tasks, watch their logs, and
approve tool calls while work runs in the background. Type a goal at the prompt,
for example: `Find and fix the bug in the login flow.`

The original single-conversation interface is still available:

```sh
forge chat
forge chat --resume
forge chat --resume SESSION_ID
```

The chat UI streams its response and tool activity inline, and displays token
usage and estimated cost for the current session. Resuming restores the latest
saved chat session, or the one whose ID you pass.

## Chat in-session commands

| Command | Action |
| --- | --- |
| `/help` | Show available commands |
| `/sessions` | List saved sessions |
| `/new` | Start a new session |
| `/clear` | Clear the current display and usage counters |
| `/models` | Open the model picker |
| `/model <id>` | Switch to a specific model |
| `/exit` | Exit Forge |

## Capabilities and safety

- Read files and search source code with `rg`.
- Run shell commands and create or edit project files. In the chat UI, Forge asks for confirmation before running shell commands or writing/editing files; respond with `y` or `n`. In the dashboard, the same requests appear in the approvals inbox (`a`).
- Delegate isolated investigations to a read-only sub-agent.
- Save and resume conversations from the project directory.
- **Git operations**: Inspect repository status (`git_status`), view diffs (`git_diff`), stage files (`git_add`), and create commits (`git_commit`) — all without leaving the agent session.

Shell commands run with your operating-system permissions and are not sandboxed. Review commands before confirming them, especially commands that modify files or affect your system.

## Git Tools

Forge includes four git tools that let the agent manage version control directly:

| Tool | Description |
|------|-------------|
| `git_status` | Show the current branch, staged changes, unstaged changes, and untracked files. Runs `git status --porcelain=v1 --branch`. |
| `git_diff` | Show diffs of working tree changes (default) or staged changes (`staged: true`). Optionally limit to specific file paths. Output is truncated at 50,000 characters. |
| `git_add` | Stage files for commit. Takes a list of paths (at least one required). Paths are validated to be inside the repository. Use `["."]` to explicitly stage everything. Warns when staging files that look like secrets (`.env`, `*.pem`, `id_rsa*`). |
| `git_commit` | Create a commit from currently staged changes. Requires a non-empty message. Rejects commits with nothing staged. Returns the commit hash, branch, and file summary. Runs git hooks normally. |

**Safety notes:**
- All tools run against the workspace root (the agent's working directory).
- Path traversal is blocked — paths must resolve inside the repository.
- Option injection is prevented — `--` is always used before path lists.
- No destructive operations: no `push`, `reset`, `--force`, `--amend`, `--no-verify`, or `commit -a`.
- Git hooks run normally; hook failures are returned as errors.

## Dashboard

When you run `forge` without arguments, it starts in **dashboard mode** — a task-oriented TUI where you type goals and watch tasks run in the background.

### Launching the Dashboard

```sh
forge              # Dashboard mode (default)
forge chat         # Legacy interactive session mode
```

### Dashboard Commands

| Command | Action |
| --- | --- |
| `plain text` | Create a new task with that goal |
| `/open <n>` | Select task and show its log |
| `/cancel <n>` | Cancel a task and all descendants |
| `/approve <n>` | Approve oldest pending approval for task `n` |
| `/approve all` | Approve all pending approvals (requires confirmation) |
| `/deny <n>` | Deny oldest pending approval for task `n` |
| `/diff <n>` | Show the task's diff in a scrollable overlay |
| `/merge <n>` | Merge the task's branch into main (requires confirmation) |
| `/discard <n>` | Discard the task's worktree and branch (requires confirmation) |
| `/resume <n>` | Resume an interrupted task |
| `/collapse <n>` | Collapse a task's children in the tree |
| `/expand <n>` | Expand a task's children in the tree |
| `/new [--read-only] [--shared] [--policy ask\|auto_in_worktree\|read_only] <goal>` | Create a task with explicit options |
| `/help` | List commands |
| `/quit` | Exit the dashboard |

### Keyboard Navigation

The dashboard is keyboard-first; no mouse support is required (Ink has no mouse API).

| Context | Keys | Action |
| --- | --- | --- |
| Global | `Tab` / `Shift+Tab` | Cycle list ↔ input; detail returns to the list |
| Global | `↑` / `↓` | Move selection (list/input) or scroll the log (detail) |
| Global | `PgUp` / `PgDn` | Scroll the log one page |
| Global | `?` (not while typing) | Help overlay |
| Global | `Ctrl+C` | Quit; confirms first when work is active |
| Global | `Esc` | Close overlay → blur input → back to list |
| List | `j` / `k`, `Home` / `End`, `g` / `G` | Move selection / first / last |
| List | `←` / `h`, `→` / `l` | Collapse / expand children |
| List | `Enter` | Open the selected task's detail and log |
| List | `a` | Approvals inbox |
| List | `c` / `r` / `m` / `x` | Cancel / resume / merge / discard |
| List | `D` | Show the task diff |
| List | `s` | Cycle filter: all → active → attention |
| List | `f` / `v` | Follow the log tail / toggle compact-verbose log |
| List | `/` | Focus the input with a `/` command |
| List | `q` | Quit; confirms first when work is active |
| Detail | `j` / `k`, `PgUp` / `PgDn`, `g` / `G` | Scroll / page / top-bottom |
| Detail | `f` / `v` | Follow the log tail / toggle compaction |
| Detail | `Esc` | Back to the list |
| Input | `Enter` | Submit (double-submit guarded) |
| Input | `Esc` | Blur to the list |
| Input | `Ctrl+P` / `Ctrl+N` | Previous / next history entry |
| Input | `Ctrl+U` | Clear the line |
| Approvals | `↑` / `↓`, `Enter` / `y`, `n` / `x`, `A`, `Esc` | Select / approve / deny / approve all / close |
| Approvals (confirm all) | `y`; `n` / `x` / `Esc` | Approve all; cancel (other keys are ignored) |
| Confirm | `y`; `n` / `Esc` / `Enter` | Confirm; cancel |
| Diff | `↑` / `↓`, `PgUp` / `PgDn`, `g` / `G`, `Esc` | Scroll / page / top-bottom / close |

Destructive actions (cancel, merge, discard, quit with active work) show the task,
the consequence, and a `y confirm · n cancel` prompt in the key bar. Only that prompt
accepts `y`/`n`; ordinary typing can never trigger a confirmation.

Pasting multi-line text is supported and is flattened into the input. Broken or
untrusted log strings are stripped of terminal control sequences and truncated by
display cells, so they cannot corrupt the layout.

### Dashboard configuration

Forge reads `~/.forge/config.json`. UI options are optional and default to the values
shown:

```json
{
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

- `ascii: true` swaps unicode glyphs for plain ASCII.
- `timestamps: false` hides log timestamps; `showCost: false` hides cost labels.
- `compactLog: false` starts the log in wrapped/verbose mode (`v` toggles it live).
- `logWindow` caps how many recent log entries are kept for the selected task.
- `NO_COLOR=1` disables semantic colors (the selection marker and labels remain).
- `INK_SCREEN_READER=true` forces a linear single-pane layout, ASCII glyphs, and no
  timer-driven redraws.
- `alternateScreen: false` keeps the dashboard in the normal terminal buffer.

### Child Tasks

Tasks can spawn child tasks using the `spawn_task`, `wait_for_tasks`, and `get_task` tools. These appear nested under their parent with shared budgets and inherit strict policy limits.

## Local data

Chat conversation state is stored in `.agent-sessions/` under the working directory. Session titles and metadata are stored in `.forge/meta/` under that directory.

Dashboard task state and logs are stored under `~/.forge/tasks/`, and isolated task worktrees are created under `~/.forge/worktrees/`, so they remain available when you start Forge from another project. The API key saved by `forge config set-key` is stored in `~/.forge/config.json`; that command preserves any existing UI settings in the same file.

## Development

```sh
pnpm install
pnpm build
pnpm test
```

`pnpm build` compiles the TypeScript sources into `dist/`. `pnpm test` runs the full test suite.

## License

Forge is released under the MIT License. See [LICENSE](LICENSE).
