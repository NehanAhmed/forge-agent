# Forge [![npm](https://img.shields.io/npm/v/@nehanahmed/forge)](https://www.npmjs.com/package/@nehanahmed/forge)

Forge is a coding agent that runs in your terminal. Describe what you want done and it
will read the code, run commands, edit files, and report back — asking for your approval
before it runs a shell command or changes a file.

Tasks are the default way to work. By default each one gets its own git worktree and
branch, so you can queue several jobs at once without them stepping on your working copy,
then review the diff and merge the one you want. Chat is still there when you just want to
talk to the agent one message at a time.

Worktrees need a git repository. If one cannot be created, the task runs in your checkout
instead, where an approved edit changes your files directly.

## Requirements

- Node.js 22 or newer
- An OpenRouter API key
- [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) on your `PATH` — used by the
  code search tool. Everything else works without it.

## Install

```sh
npm install --global @nehanahmed/forge
forge config set-key <your-openrouter-key>
```

The key is saved to `~/.forge/config.json`. Forge sets owner-only permissions when it
creates the file, but if the file already exists its permissions are left unchanged — run
`chmod 600 ~/.forge/config.json` first if other users can read it. You can also set
`OPENROUTER_API_KEY` in your shell, or in a `.env` file in the project you run Forge from.

Install ripgrep with the package manager you already use:

```sh
winget install --id BurntSushi.ripgrep.MSVC -e   # Windows
brew install ripgrep                            # macOS
sudo apt install ripgrep                        # Debian / Ubuntu
```

## First run

```sh
cd path/to/your-project
forge
```

Commit or stash your work first. Each task branches from `HEAD`, so uncommitted and
untracked changes are not visible inside it, and merging refuses a main working tree with
tracked changes.

Forge opens the dashboard. Type a goal, for example `Find and fix the race in the login
flow`, and press Enter. The task appears in the list with its progress and log; approvals
show up in the inbox (`a`). When the task finishes, press Tab (or Esc) to move focus to the
list, then review it with `D`, merge it with `m`, or discard it with `x`.

The default model is NVIDIA Nemotron 3 Ultra on OpenRouter's free tier. Run `/models` in
chat to pick another one.

### Dashboard

| Input | What it does |
| --- | --- |
| plain text | Start a task with that goal |
| `/new [--read-only] [--shared] [--policy <p>] <goal>` | Start a task with explicit options |
| `/open <n>` | Open a task and its log |
| `/approve <n>` / `/deny <n>` | Answer the oldest pending approval for a task |
| `/diff <n>` | Show the task's diff |
| `/merge <n>` / `/discard <n>` | Merge the branch, or delete it and its worktree |
| `/resume <n>` / `/cancel <n>` | Resume an interrupted task, or cancel a task and its children |
| `/help` / `/quit` | Show commands / leave |

Keys: `↑`/`↓` to move, `←`/`→` to fold a task tree, `Enter` to open a task, `a` for
approvals, `Tab` to switch between list and input, `?` for the full key map, `q` to quit.
Destructive actions ask for a `y`/`n` confirmation.

### Chat

```sh
forge chat
forge chat --resume            # latest session in this directory
forge chat --resume <id>       # a specific session
```

Chat streams replies and tool calls inline, and shows token use and estimated cost for the
session. Commands: `/help`, `/clear`, `/new`, `/sessions`, `/models`, `/model <id>`,
`/exit`.

## What it does

- Reads and searches your code, and can delegate read-only research to a sub-agent so the
  noise stays out of the main conversation.
- Runs shell commands and edits files, with approval.
- Handles the git basics itself: status, diff, stage, commit. It never pushes, resets, or
  amends.
- Splits large jobs into child tasks, with limits on depth and count per tree.
- Keeps task state on disk, so a restart does not lose queued work.

## Safety

- Shell commands and file writes go through an approval policy: `ask` (default),
  `auto_in_worktree` (writes inside the task's worktree and allowlisted test/build commands
  are auto-approved), or `read_only` (read and search tools only). The chat UI and dashboard
  both ask; read-only tasks simply cannot write.
- Commands run with your user permissions. There is no sandbox, so read a command before
  you approve it.
- Task branches must be `agent/task-*`, and merges only happen from the dashboard after a
  clean-tree check. Git hooks run normally.
- Forge sends model traffic to OpenRouter. Shell commands and git hooks run on your machine
  and may make their own network requests.

## Configuration

Settings live in `~/.forge/config.json` and are all optional. The file controls UI density,
ASCII mode, timestamps, cost labels, alternate-screen use, and child-task limits. See
[docs/configuration.md](docs/configuration.md) for every key and its default.

## Where your data lives

| Path | Contents |
| --- | --- |
| `.agent-sessions/` in the project | Chat session state |
| `~/.forge/tasks/` | Task state and logs |
| `~/.forge/worktrees/` | Task worktrees and `agent/task-*` branches |
| `~/.forge/meta/meta.json` | Session titles and model choices |
| `~/.forge/config.json` | API key and UI settings |

Add `.agent-sessions/` to your `.gitignore` if you use chat; everything else is stored
outside the project. Deleting a task's worktree from the dashboard also removes its branch.

## Development

```sh
pnpm install
pnpm build      # clean + tsc + shebang; also the typecheck
pnpm test       # node:test via tsx, no API key needed
npm link        # use the local build as `forge`
```

`pnpm dev` watches `src/cli/app.tsx` and needs `dist/cli/app.js` to exist, so run `pnpm
build` once first. Run tests from the repository root.

Contributor workflow, package rules, and the release process are in
[AGENTS.md](AGENTS.md). For a tour of the code, start with
[docs/architecture.md](docs/architecture.md).

## License

MIT. See [LICENSE](LICENSE).
