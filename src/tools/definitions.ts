// tools.ts — Agent SDK style
import { tool } from '@openrouter/agent';
import { z } from 'zod';
import { runBash, readFile, writeFile, editFile, spawnSubAgent, searchCodebase, gitStatus, gitDiff, gitAdd, gitCommit } from './implementations.js';
import { RISKY_TOOLS } from '../core/constants.js';
import type { AgentContext } from '../core/context.js';

export function createTools(ctx: AgentContext) {
  const runBashTool = tool({
    name: 'run_bash',
    description:
      'Execute a shell command in the current working directory. Use this for listing files, searching code (grep/find), checking git status, running scripts, or any other shell operation. Returns combined stdout/stderr. Prefer read_file over `cat` for reading a single file, and prefer replace_string_in_file over shell text-manipulation (sed/awk) for editing.',
    inputSchema: z.object({
      command: z.string().describe('A single shell command to execute, e.g. "ls -la" or "grep -rn TODO src/"'),
    }),
    execute: async ({ command }) => {
      const allowed = await ctx.requestApproval({
        tool: 'run_bash',
        summary: `Execute: ${command}`,
        risk: 'exec',
        args: { command },
        cwd: ctx.cwd,
      });
      if (!allowed) return { error: 'User denied this action.' };
      return { output: runBash(ctx, command) };
    },
  });

  const readFileTool = tool({
    name: 'read_file',
    description:
      'Read the full contents of a single file at the given path and return it as text. Use this before editing a file to see its exact current content.',
    inputSchema: z.object({
      path: z.string().describe('Relative or absolute path to the file to read.'),
    }),
    execute: async ({ path }) => ({ content: readFile(ctx, path) }),
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
      const allowed = await ctx.requestApproval({
        tool: 'write_file',
        summary: `Write file: ${path}`,
        risk: 'write',
        args: { path, content },
        cwd: ctx.cwd,
      });
      if (!allowed) return { error: 'User denied this action.' };
      return { result: writeFile(ctx, path, content) };
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
      const allowed = await ctx.requestApproval({
        tool: 'replace_string_in_file',
        summary: `Edit file: ${path}`,
        risk: 'write',
        args: { path, stringToReplace, newString },
        cwd: ctx.cwd,
      });
      if (!allowed) return { error: 'User denied this action.' };
      return { result: editFile(ctx, path, stringToReplace, newString) };
    },
  });

  const spawnSubAgentTool = tool({
    name: 'spawn_sub_agent',
    description:
      "Delegate a self-contained investigative task to a sub-agent with a fresh, isolated context. Use this for tasks that would pollute your context with a lot of intermediate noise — e.g. 'search the codebase for all usages of X', 'read through these 5 files and summarize the auth flow', 'find where Y is configured'. The sub-agent has read-only tools (read_file, run_bash) and returns a single summarized answer — you will NOT see its intermediate steps. Do not use this for tasks that require writing/editing files, or for simple single-file lookups you can do directly.",
    inputSchema: z.object({
      task: z.string().describe('A clear, self-contained description of what the sub-agent should find/do and report back. It has no knowledge of the current conversation, so include all necessary context.'),
    }),
    execute: async ({ task }) => ({ result: await spawnSubAgent(ctx, task) }),
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
      result: searchCodebase(ctx, pattern, path ?? '.', maxResults ?? 60),
    }),
  });

  const gitStatusTool = tool({
    name: 'git_status',
    description:
      'Show the current git repository status including branch, staged changes, unstaged changes, and untracked files. Run this before committing to see what has changed. Returns the raw `git status --porcelain=v1 --branch` output.',
    inputSchema: z.object({}),
    execute: async () => ({ output: gitStatus(ctx) }),
  });

  const gitDiffTool = tool({
    name: 'git_diff',
    description:
      'Show a diff of changes in the repository. Use `staged: true` to see staged changes (what will be committed), or `staged: false` (default) to see unstaged working tree changes. Optionally limit to specific files with `paths`. Output is truncated at 50,000 characters with a notice if truncated.',
    inputSchema: z.object({
      staged: z.boolean().optional().default(false).describe('Show staged changes instead of working tree changes.'),
      paths: z.array(z.string()).optional().describe('Limit diff to these file paths.'),
    }),
    execute: async ({ staged, paths }) => ({ output: gitDiff(ctx, staged ?? false, paths ?? []) }),
  });

  const gitAddTool = tool({
    name: 'git_add',
    description:
      'Stage files for commit. Provide a list of file or directory paths to stage. Each path is validated to be inside the repository. Staging everything requires explicitly passing ["."]. Returns a confirmation with the number of files staged. Warns if staging files that look like secrets (.env, *.pem, id_rsa).',
    inputSchema: z.object({
      paths: z.array(z.string()).min(1).describe('File or directory paths to stage. Use ["."] to stage all changes explicitly.'),
    }),
    execute: async ({ paths }) => ({ output: gitAdd(ctx, paths) }),
  });

  const gitCommitTool = tool({
    name: 'git_commit',
    description:
      'Create a commit from currently staged changes. The message should have a short imperative subject line (50-72 chars) and an optional body. Before committing, run git_status and git_diff with staged:true to verify what will be committed. Commits only staged files — never auto-stages. Rejects empty messages and commits with nothing staged. Returns the commit hash, branch, and file summary on success.',
    inputSchema: z.object({
      message: z.string().min(1).describe('Commit message (subject line + optional body).'),
    }),
    execute: async ({ message }) => ({ output: gitCommit(ctx, message) }),
  });

  return [
    runBashTool,
    readFileTool,
    writeFileTool,
    replaceStringInFileTool,
    spawnSubAgentTool,
    searchCodeTool,
    gitStatusTool,
    gitDiffTool,
    gitAddTool,
    gitCommitTool,
  ];
}