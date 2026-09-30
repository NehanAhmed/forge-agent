# Forge
[![npm](https://img.shields.io/npm/v/@nehanahmed/forge)](https://www.npmjs.com/package/@nehanahmed/forge)
\n
Forge is a terminal-based AI coding agent that works in your current project directory. It can inspect and search a codebase, run shell commands, edit files, and delegate read-only investigations to a sub-agent. Risky actions require your confirmation.

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

Enter a task at the prompt, for example: `Find and fix the bug in the login flow.` Forge streams its response and tool activity, and displays token usage and estimated cost for the current session.

Resume the latest session, or a specific session by ID:

```sh
forge --resume
forge --resume SESSION_ID
```

## In-session commands

| Command | Action |
| --- | --- |
| `/help` | Show available commands |
| `/sessions` | List saved sessions |
| `/new` | Start a new session |
| `/clear` | Clear the current display and usage counters |
| `/exit` | Exit Forge |

## Capabilities and safety

- Read files and search source code with `rg`.
- Run shell commands and create or edit project files. Forge asks for confirmation before running shell commands or writing/editing files; respond with `y` or `n` to approve or deny each action.
- Delegate isolated investigations to a read-only sub-agent.
- Save and resume conversations from the project directory.

Shell commands run with your operating-system permissions and are not sandboxed. Review commands before confirming them, especially commands that modify files or affect your system.

## Local data

Conversation state is stored in `.agent-sessions/` under the working directory. Session titles and metadata are stored in `.forge/meta/` under that directory. The API key saved by `forge config set-key` is stored separately in `~/.forge/config.json`.

## Development

```sh
pnpm install
pnpm build
pnpm eval
```

`pnpm build` compiles the TypeScript sources into `dist/`. `pnpm eval` runs the evaluation runner. The package does not currently define an automated test suite.

## License

Forge is released under the MIT License. See [LICENSE](LICENSE).
