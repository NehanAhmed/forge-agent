# Architecture Summary

This project consists of the following TypeScript source files, each providing a distinct concern:

1. **agent.ts** – The main entry point for the chat agent; it provides an interactive REPL, manages message history, streams LLM output, executes tool calls (with risk confirmation), and loops until a final answer is produced.

2. **compaction.ts** – Implements `compactionCheck`, a function that compacts conversation history when the estimated token count exceeds a threshold, using the LLM to produce a concise summary while preserving key decisions, file paths, and unresolved tasks.

3. **constant.ts** – Defines global constants: the default model (`nvidia/nemotron-3-ultra-550b-a55b:free`), maximum iterations (10), a set of risky tool names, and the system prompt for the assistant.

4. **openrouter.ts** – Creates and exports a single `OpenRouter` client instance using the `OPENROUTER_API_KEY` environment variable, serving as the gateway to the LLM API.

5. **session.ts** – Provides `loadSession` and `saveSession` functions that persist conversation state to a `.agent-session.json` file, along with the `Message` type used throughout the codebase.

6. **toolHelper.ts** – Exposes utility functions for shell execution, file I/O, and file editing, plus a `toolExecutors` record that maps tool names (`run_bash`, `read_file`, `write_file`, `replace_string_in_file`) to their implementations.

7. **tools.ts** – Exports a constant array of tool definitions describing the available functions (`run_bash`, `read_file`, `write_file`, `replace_string_in_file`), including their names, descriptions, and JSON schema for parameter validation.