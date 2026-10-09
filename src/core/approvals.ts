import type { AgentContext, RiskClass, ApprovalRequest } from './context.js';

// Shell command allowlist for auto_in_worktree policy
export const SHELL_ALLOWLIST = [
  // Test runners
  'npm test',
  'npm run test',
  'pnpm test',
  'pnpm run test',
  'yarn test',
  'pytest',
  'jest',
  'vitest',
  'cargo test',
  'go test',

  // Linters
  'eslint',
  'prettier',
  'ruff',
  'clippy',
  'pylint',
  'flake8',

  // Build commands
  'npm run build',
  'pnpm build',
  'pnpm run build',
  'cargo build',
  'make',
  'make build',
  'tsc',

  // Read-only git
  'git status',
  'git diff',
  'git log',
  'git show',
];

export function isAllowlistedCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  return SHELL_ALLOWLIST.some(allowed =>
    trimmed === allowed.toLowerCase() || trimmed.startsWith(allowed.toLowerCase() + ' ')
  );
}

export function isPathInside(path: string, parentPath: string): boolean {
  const pathModule = require('path');
  const resolvedPath = pathModule.resolve(path);
  const resolvedParent = pathModule.resolve(parentPath);
  return resolvedPath.startsWith(resolvedParent + pathModule.sep) || resolvedPath === resolvedParent;
}

export async function executeWithPolicy(
  ctx: AgentContext,
  risk: RiskClass,
  tool: string,
  args: unknown,
  execute: () => Promise<unknown> | unknown
): Promise<unknown> {
  // Read tools: always allowed
  if (risk === 'read') {
    return execute();
  }

  // Network: always ask (regardless of policy)
  if (risk === 'network') {
    const approved = await ctx.requestApproval({
      tool,
      summary: `Network request`,
      risk,
      args,
      cwd: ctx.cwd,
    });
    if (!approved) {
      return { error: 'User denied this action.' };
    }
    return execute();
  }

  // Read-only policy: write and exec tools not available
  if (ctx.policy === 'read_only') {
    return { error: 'Write/exec tools not available in read-only mode.' };
  }

  // Auto-approve for auto_in_worktree policy
  if (ctx.policy === 'auto_in_worktree' && ctx.taskId) {
    if (risk === 'write') {
      // Check if path is inside worktree
      const path = extractPath(args);
      if (path) {
        // For task operations, we'd need access to task info
        // For now, we'll check if path is inside ctx.cwd
        if (isPathInside(path, ctx.cwd)) {
          return execute();
        }
      }
    }

    if (risk === 'exec') {
      // Check if command is on allowlist
      const command = extractCommand(args);
      if (command && isAllowlistedCommand(command)) {
        return execute();
      }
    }
  }

  // Fallback: ask for approval
  const summary = summarizeAction(tool, args);
  const approved = await ctx.requestApproval({
    tool,
    summary,
    risk,
    args,
    cwd: ctx.cwd,
  });

  if (!approved) {
    return { error: 'User denied this action.' };
  }

  return execute();
}

function extractPath(args: unknown): string | null {
  if (typeof args === 'object' && args !== null) {
    const argsObj = args as Record<string, unknown>;
    if (typeof argsObj.path === 'string') return argsObj.path;
  }
  return null;
}

function extractCommand(args: unknown): string | null {
  if (typeof args === 'object' && args !== null) {
    const argsObj = args as Record<string, unknown>;
    if (typeof argsObj.command === 'string') return argsObj.command;
  }
  return null;
}

function summarizeAction(tool: string, args: unknown): string {
  if (tool === 'run_bash') {
    const cmd = extractCommand(args);
    return cmd ? `Execute: ${cmd.substring(0, 60)}${cmd.length > 60 ? '...' : ''}` : 'Execute shell command';
  }

  if (tool === 'write_file' || tool === 'replace_string_in_file') {
    const path = extractPath(args);
    return path ? `Edit: ${path}` : 'Edit file';
  }

  return tool;
}
