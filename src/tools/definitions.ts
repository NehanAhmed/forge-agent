// tools.ts — Agent SDK style
import { tool } from '@openrouter/agent';
import { z } from 'zod';
import { runBash, readFile, writeFile, editFile, spawnSubAgent, searchCodebase, gitStatus, gitDiff, gitAdd, gitCommit } from './implementations.js';
import type { AgentContext } from '../core/context.js';
import { executeWithPolicy } from '../core/approvals.js';

export function createTools(ctx: AgentContext) {
  // For read_only policy, expose only safe read tools
  if (ctx.policy === 'read_only') {
    return [
      createReadFileTool(ctx),
      createSearchCodeTool(ctx),
      createGitStatusTool(ctx),
      createGitDiffTool(ctx),
    ];
  }

  return [
    createRunBashTool(ctx),
    createReadFileTool(ctx),
    createWriteFileTool(ctx),
    createReplaceStringTool(ctx),
    createSpawnSubAgentTool(ctx),
    createSearchCodeTool(ctx),
    createGitStatusTool(ctx),
    createGitDiffTool(ctx),
    createGitAddTool(ctx),
    createGitCommitTool(ctx),
  ];
}

function createRunBashTool(ctx: AgentContext) {
  return tool({
    name: 'run_bash',
    description:
      'Execute a shell command in the current working directory. Use this for listing files, searching code (grep/find), checking git status, running scripts, or any other shell operation. Returns combined stdout/stderr. Prefer read_file over `cat` for reading a single file, and prefer replace_string_in_file over shell text-manipulation (sed/awk) for editing.',
    inputSchema: z.object({
      command: z.string().describe('A single shell command to execute, e.g. "ls -la" or "grep -rn TODO src/"'),
    }),
    execute: async ({ command }) => {
      return executeWithPolicy(ctx, 'exec', 'run_bash', { command }, () => ({
        output: runBash(ctx, command),
      }));
    },
  });
}

function createReadFileTool(ctx: AgentContext) {
  return tool({
    name: 'read_file',
    description:
      'Read the full contents of a single file at the given path and return it as text. Use this before editing a file to see its exact current content.',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to read.'),
    }),
    execute: async ({ path }) => ({ content: readFile(ctx, path) }),
  });
}

function createWriteFileTool(ctx: AgentContext) {
  return tool({
    name: 'write_file',
    description:
      'Create a new file or completely overwrite an existing file with the given content. Use this only for creating new files or when the entire file content should be replaced. For modifying part of an existing file, use replace_string_in_file instead — it is safer and preserves everything else in the file.',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to write.'),
      content: z.string().describe('The full content to write to the file, replacing anything already there.'),
    }),
    execute: async ({ path, content }) => {
      return executeWithPolicy(ctx, 'write', 'write_file', { path, content }, () => ({
        result: writeFile(ctx, path, content),
      }));
    },
  });
}

function createReplaceStringTool(ctx: AgentContext) {
  return tool({
    name: 'replace_string_in_file',
    description:
      'Make a precise, surgical edit to an existing file by replacing one exact occurrence of a string with a new string. This is the preferred way to modify part of a file — it leaves the rest of the file untouched. stringToReplace must match EXACTLY ONE location in the file, character-for-character (including whitespace/indentation).',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to edit.'),
      stringToReplace: z.string().describe('The exact existing text to find and replace. Must match exactly one location in the file.'),
      newString: z.string().describe('The text to replace it with.'),
    }),
    execute: async ({ path, stringToReplace, newString }) => {
      return executeWithPolicy(ctx, 'write', 'replace_string_in_file', { path, stringToReplace, newString }, () => ({
        result: editFile(ctx, path, stringToReplace, newString),
      }));
    },
  });
}

function createSpawnSubAgentTool(ctx: AgentContext) {
  return tool({
    name: 'spawn_sub_agent',
    description:
      "Delegate a self-contained investigative task to a sub-agent with a fresh, isolated context. Use this for tasks that would pollute your context with a lot of intermediate noise. The sub-agent has read-only tools and returns a single summarized answer. Do not use this for tasks that require writing/editing files.",
    inputSchema: z.object({
      task: z.string().describe('A clear, self-contained description of what the sub-agent should find/do and report back.'),
    }),
    execute: async ({ task }) => ({ result: await spawnSubAgent(ctx, task) }),
  });
}

function createSearchCodeTool(ctx: AgentContext) {
  return tool({
    name: 'search_code',
    description:
      'Search the codebase for a text pattern using ripgrep (regex supported). Automatically excludes node_modules, dist, build output, and lockfiles.',
    inputSchema: z.object({
      pattern: z.string().describe('Text or regex pattern to search for.'),
      path: z.string().optional().describe('Directory to search in. Defaults to current directory.'),
      maxResults: z.number().optional().describe('Maximum total matches to return (default 60, hard cap 150).'),
    }),
    execute: async ({ pattern, path, maxResults }) => ({
      result: searchCodebase(ctx, pattern, path ?? '.', maxResults ?? 60),
    }),
  });
}

function createGitStatusTool(ctx: AgentContext) {
  return tool({
    name: 'git_status',
    description:
      'Show the current git repository status including branch, staged changes, unstaged changes, and untracked files.',
    inputSchema: z.object({}),
    execute: async () => ({ output: gitStatus(ctx) }),
  });
}

function createGitDiffTool(ctx: AgentContext) {
  return tool({
    name: 'git_diff',
    description:
      'Show a diff of changes in the repository. Use `staged: true` to see staged changes, or `staged: false` (default) to see unstaged working tree changes.',
    inputSchema: z.object({
      staged: z.boolean().optional().default(false).describe('Show staged changes instead of working tree changes.'),
      paths: z.array(z.string()).optional().describe('Limit diff to these file paths.'),
    }),
    execute: async ({ staged, paths }) => ({ output: gitDiff(ctx, staged ?? false, paths ?? []) }),
  });
}

function createGitAddTool(ctx: AgentContext) {
  return tool({
    name: 'git_add',
    description:
      'Stage files for commit. Provide a list of file or directory paths to stage. Each path is validated to be inside the repository.',
    inputSchema: z.object({
      paths: z.array(z.string()).min(1).describe('File or directory paths to stage. Use ["."] to stage all changes explicitly.'),
    }),
    execute: async ({ paths }) => {
      return executeWithPolicy(ctx, 'write', 'git_add', { paths }, () => ({
        output: gitAdd(ctx, paths),
      }));
    },
  });
}

function createGitCommitTool(ctx: AgentContext) {
  return tool({
    name: 'git_commit',
    description:
      'Create a commit from currently staged changes. The message should have a short imperative subject line.',
    inputSchema: z.object({
      message: z.string().min(1).describe('Commit message (subject line + optional body).'),
    }),
    execute: async ({ message }) => {
      return executeWithPolicy(ctx, 'write', 'git_commit', { message }, () => ({
        output: gitCommit(ctx, message),
      }));
    },
  });
}
