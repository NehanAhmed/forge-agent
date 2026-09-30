// tools.ts — Agent SDK style
import { tool } from '@openrouter/agent';
import { z } from 'zod';
import { runBash, readFile, writeFile, editFile, spawnSubAgent, searchCodebase } from './implementations.js';
import { RISKY_TOOLS } from '../core/constants.js';

export type OnConfirm = (description: string) => Promise<boolean>;

export function createTools(onConfirm: OnConfirm) {
  const runBashTool = tool({
    name: 'run_bash',
    description:
      'Execute a shell command in the current working directory. Use this for listing files, searching code (grep/find), checking git status, running scripts, or any other shell operation. Returns combined stdout/stderr. Prefer read_file over `cat` for reading a single file, and prefer replace_string_in_file over shell text-manipulation (sed/awk) for editing.',
    inputSchema: z.object({
      command: z.string().describe('A single shell command to execute, e.g. "ls -la" or "grep -rn TODO src/"'),
    }),
    execute: async ({ command }) => {
      const allowed = await onConfirm(`run_bash(${command})`);
      if (!allowed) return { error: 'User denied this action.' };
      return { output: runBash(command) };
    },
  });

  const readFileTool = tool({
    name: 'read_file',
    description:
      'Read the full contents of a single file at the given path and return it as text. Use this before editing a file to see its exact current content.',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to read.'),
    }),
    execute: async ({ path }) => ({ content: readFile(path) }),
  });

  const writeFileTool = tool({
    name: 'write_file',
    description:
      'Create a new file or completely overwrite an existing file with the given content. Use this only for creating new files or when the entire file content should be replaced. For modifying part of an existing file, use replace_string_in_file instead — it is safer and preserves everything else in the file.',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to write.'),
      content: z.string().describe('The full content to write to the file, replacing anything already there.'),
    }),
    execute: async ({ path, content }) => {
      const allowed = await onConfirm(`write_file(${path})`);
      if (!allowed) return { error: 'User denied this action.' };
      return { result: writeFile(path, content) };
    },
  });

  const replaceStringInFileTool = tool({
    name: 'replace_string_in_file',
    description:
      'Make a precise, surgical edit to an existing file by replacing one exact occurrence of a string with a new string. This is the preferred way to modify part of a file — it leaves the rest of the file untouched. stringToReplace must match EXACTLY ONE location in the file, character-for-character (including whitespace/indentation). Keep stringToReplace as SHORT as possible: include only the specific text being changed plus the minimum surrounding context needed to make the match unique (e.g. a variable name plus one line of context, not an entire function). If the string appears zero times or multiple times, this tool will fail — read the file first with read_file if unsure of exact formatting, and widen the match only as much as needed to make it unique.',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to edit.'),
      stringToReplace: z.string().describe('The exact existing text to find and replace. Must match exactly one location in the file.'),
      newString: z.string().describe('The text to replace it with.'),
    }),
    execute: async ({ path, stringToReplace, newString }) => {
      const allowed = await onConfirm(`replace_string_in_file(${path})`);
      if (!allowed) return { error: 'User denied this action.' };
      return { result: editFile(path, stringToReplace, newString) };
    },
  });

  const spawnSubAgentTool = tool({
    name: 'spawn_sub_agent',
    description:
      "Delegate a self-contained investigative task to a sub-agent with a fresh, isolated context. Use this for tasks that would pollute your context with a lot of intermediate noise — e.g. 'search the codebase for all usages of X', 'read through these 5 files and summarize the auth flow', 'find where Y is configured'. The sub-agent has read-only tools (read_file, run_bash) and returns a single summarized answer — you will NOT see its intermediate steps. Do not use this for tasks that require writing/editing files, or for simple single-file lookups you can do directly.",
    inputSchema: z.object({
      task: z.string().describe('A clear, self-contained description of what the sub-agent should find/do and report back. It has no knowledge of the current conversation, so include all necessary context.'),
    }),
    execute: async ({ task }) => ({ result: await spawnSubAgent(task) }),
  });

  const searchCodeTool = tool({
    name: 'search_code',
    description:
      'Search the codebase for a text pattern using ripgrep (regex supported). Automatically excludes node_modules, dist, build output, and lockfiles — you do not need to add exclusions yourself. Use this instead of grep/rg via run_bash. Returns matching file paths and line numbers with surrounding context.',
    inputSchema: z.object({
      pattern: z.string().describe('Text or regex pattern to search for.'),
      path: z.string().optional().describe('Directory to search in. Defaults to current directory.'),
      maxResults: z
        .number()
        .optional()
        .describe(
          "Maximum total matches to return (default 60, hard cap 150). Prefer narrowing your search pattern or path over raising this — only increase it if you've confirmed the results are truncated and a narrower search isn't feasible."
        ),
    }),
    execute: async ({ pattern, path, maxResults }) => ({
      result: searchCodebase(pattern, path ?? '.', maxResults ?? 60),
    }),
  });

  return [
    runBashTool,
    readFileTool,
    writeFileTool,
    replaceStringInFileTool,
    spawnSubAgentTool,
    searchCodeTool,
  ];
}