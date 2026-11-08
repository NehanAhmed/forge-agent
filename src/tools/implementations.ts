import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { createTools } from './definitions.js';
import { MODEL, SUBAGENT_MAX_ITERATIONS, SUBAGENT_TOOLS, SYSTEM_PROMPT } from '../core/constants.js';
import { formatRgOutput, resolveSafePath } from './helpers.js';
import { stepCountIs } from '@openrouter/agent';
import { loadTodos, saveTodos, formatTodoListOutput, getTodoCounts, type TodoItem } from '../core/todos.js';
import type { AgentContext } from '../core/context.js';
import { ModelRetryExhaustedError, withModelRetry, type RetryOptions } from '../core/retry.js';

const GIT_TIMEOUT = 30_000;
const DIFF_TRUNCATE_LIMIT = 50_000;

/** Run a git command in `cwd`, returning its output or an `ERROR:` string. */
function runGit(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      timeout: GIT_TIMEOUT,
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? '';
    const stdout = err.stdout?.toString() ?? '';
    return `ERROR: ${stderr || stdout || err.message}`;
  }
}

/** Return true when `cwd` is inside a git work tree. */
function isGitRepo(cwd: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'ignore', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/** Return the porcelain branch/status summary for the workspace. */
export function gitStatus(ctx: AgentContext): string {
  if (!isGitRepo(ctx.cwd)) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  return runGit(['status', '--porcelain=v1', '--branch'], ctx.cwd);
}

/** Return the workspace diff, optionally staged and limited to `paths`. */
export function gitDiff(ctx: AgentContext, staged: boolean = false, paths: string[] = []): string {
  if (!isGitRepo(ctx.cwd)) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  const args = ['diff'];
  if (staged) args.push('--cached');
  if (paths.length > 0) {
    args.push('--', ...paths);
  }
  let output = runGit(args, ctx.cwd);
  if (output.startsWith('ERROR:')) return output;
  if (output.length > DIFF_TRUNCATE_LIMIT) {
    output =
      output.slice(0, DIFF_TRUNCATE_LIMIT) +
      `\n\n[Output truncated at ${DIFF_TRUNCATE_LIMIT} characters — narrow your paths or use staged diff for smaller output.]`;
  }
  return output;
}

/** Stage the given paths after resolving them inside the workspace. */
export function gitAdd(ctx: AgentContext, paths: string[]): string {
  if (!isGitRepo(ctx.cwd)) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  if (!paths || paths.length === 0) {
    return 'ERROR: At least one path is required.';
  }
  const safePaths: string[] = [];
  const warnings: string[] = [];
  for (const p of paths) {
    try {
      const safe = resolveSafePath(p, ctx.cwd);
      safePaths.push(safe);
      // Warn about potential secrets
      const basename = p.split('/').pop()?.toLowerCase() ?? '';
      if (basename === '.env' || basename.endsWith('.pem') || basename === 'id_rsa' || basename.startsWith('id_rsa.')) {
        warnings.push(`Warning: Staging potentially sensitive file "${p}".`);
      }
    } catch (err: any) {
      return `ERROR: ${err.message}`;
    }
  }
  const output = runGit(['add', '--', ...safePaths], ctx.cwd);
  if (output.startsWith('ERROR:')) return output;
  let result = `Staged ${safePaths.length} file(s).`;
  if (warnings.length > 0) result += '\n' + warnings.join('\n');
  return result;
}

/** Commit staged changes with `message` and return the new commit summary. */
export function gitCommit(ctx: AgentContext, message: string): string {
  if (!isGitRepo(ctx.cwd)) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return 'ERROR: Commit message cannot be empty or whitespace only.';
  }
  // Check if anything is staged
  const status = runGit(['diff', '--cached', '--name-only'], ctx.cwd);
  if (status.startsWith('ERROR:')) return status;
  if (!status.trim()) {
    return 'ERROR: Nothing staged to commit. Use git_add to stage files first.';
  }
  const output = runGit(['commit', '-m', trimmed], ctx.cwd);
  if (output.startsWith('ERROR:')) return output;
  // Get commit hash and summary
  const hash = runGit(['rev-parse', '--short', 'HEAD'], ctx.cwd).trim();
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], ctx.cwd).trim();
  const summary = runGit(['show', '--stat', '--oneline', '-1', 'HEAD'], ctx.cwd).trim();
  return `Committed ${hash} on ${branch}\n${summary}`;
}

/** Execute a shell command in the workspace and return its output or `ERROR:`. */
export function runBash(ctx: AgentContext, command: string): string {
  // NOTE: run_bash is NOT path-sandboxed — a shell command can `cd`, use
  // absolute paths, or chain commands in ways resolveSafePath can't
  // intercept. It stays a RISKY_TOOL requiring confirmation; true sandboxing
  // would need a real subprocess jail (e.g. a restricted PATH/cwd + denylist
  // of dangerous patterns), which is a separate, bigger piece of work.
  //
  // ABORT LIMITATION: execSync cannot be interrupted mid-execution. For proper
  // abort support, the task manager will need to kill the entire process tree
  // when cancelling a task. Individual tool-level abort is not feasible with
  // synchronous execution.

  if (ctx.signal.aborted) {
    return 'ERROR: Operation cancelled';
  }

  try {
    return execSync(command, { encoding: 'utf-8', timeout: 10_000, cwd: ctx.cwd });
  } catch (err: any) {
    return `ERROR: ${err.stdout ?? ''}${err.stderr ?? err.message}`;
  }
}

/** Read a workspace-relative file as UTF-8 text. */
export function readFile(ctx: AgentContext, path: string): string {
  try {
    const safePath = resolveSafePath(path, ctx.cwd);
    return fs.readFileSync(safePath, 'utf-8');
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

/** Write UTF-8 text to a workspace-relative file, creating parent directories. */
export function writeFile(ctx: AgentContext, filePath: string, content: string): string {
  try {
    const safePath = resolveSafePath(filePath, ctx.cwd);
    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, content, 'utf-8');
    return `File written successfully to ${filePath}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

/**
 * Count how many times `oldContent` appears in `content`.
 * Uses `String.prototype.split` so the count is exact even for empty
 * `oldContent` (which matches between every character).
 */
export function countOccurrences(content: string, oldContent: string): number {
  if (!oldContent) return 0;
  return content.split(oldContent).length - 1;
}

/**
 * Make a single, surgical edit to an existing file.
 *
 * - Returns an actionable error if the file cannot be read or the path
 *   resolves outside the working directory.
 * - Returns an error if the search string is missing.
 * - Returns an error if the search string matches **more than one** location;
 *   the caller must supply more surrounding context to make the match unique.
 * - Replaces exactly one occurrence and reports how many were found.
 */
export function editFileOnce(ctx: AgentContext, path: string, oldContent: string, newContent: string): string {
  try {
    const safePath = resolveSafePath(path, ctx.cwd);
    const content = fs.readFileSync(safePath, 'utf-8');
    const occurrences = countOccurrences(content, oldContent);
    if (occurrences === 0) {
      return `ERROR: The string "${oldContent}" was not found in ${path}.`;
    }
    if (occurrences > 1) {
      return (
        `ERROR: The string "${oldContent}" matches ${occurrences} locations in ${path}. ` +
        'Use replace_all_strings to change every occurrence, or include more surrounding ' +
        'context so the match is unique.'
      );
    }
    const updatedContent = content.replace(oldContent, newContent);
    fs.writeFileSync(safePath, updatedContent, 'utf-8');
    return `Successfully replaced 1 occurrence of "${oldContent}" with "${newContent}" in ${path}.`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

/**
 * Replace every occurrence of `oldContent` in an existing file.
 *
 * - Returns an actionable error if the file cannot be read or the path
 *   resolves outside the working directory.
 * - Returns an error if the search string is missing.
 * - Replaces all occurrences and reports how many were changed.
 */
export function editFileAll(ctx: AgentContext, path: string, oldContent: string, newContent: string): string {
  try {
    const safePath = resolveSafePath(path, ctx.cwd);
    const content = fs.readFileSync(safePath, 'utf-8');
    const occurrences = countOccurrences(content, oldContent);
    if (occurrences === 0) {
      return `ERROR: The string "${oldContent}" was not found in ${path}.`;
    }
    const updatedContent = content.split(oldContent).join(newContent);
    fs.writeFileSync(safePath, updatedContent, 'utf-8');
    return `Successfully replaced ${occurrences} occurrence(s) of "${oldContent}" with "${newContent}" in ${path}.`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

/** @deprecated Use `editFileOnce` or `editFileAll`. Kept for backwards compatibility. */
export function editFile(ctx: AgentContext, path: string, oldContent: string, newContent: string): string {
  return editFileOnce(ctx, path, oldContent, newContent);
}

type SubAgentResult = ReturnType<AgentContext['callModel']>;
type SubAgentUsage = Awaited<ReturnType<SubAgentResult['getUsage']>>;

/** Read a sub-agent attempt's accrued usage, ignoring telemetry failures. */
async function readSubAgentUsage(result: SubAgentResult | undefined): Promise<SubAgentUsage | null> {
  if (!result || typeof result.getUsage !== 'function') return null;
  try {
    return await result.getUsage();
  } catch {
    return null;
  }
}

/** Cancel a failed sub-agent attempt, ignoring errors during cleanup. */
async function cancelSubAgentResult(result: SubAgentResult | undefined): Promise<void> {
  if (!result || typeof result.cancel !== 'function') return;
  try {
    await result.cancel();
  } catch {
    // Cancellation is best-effort; the retry loop must not fail because of it.
  }
}

/** Record one sub-agent request and any usage the provider reported. */
function recordSubAgentUsage(ctx: AgentContext, usage: SubAgentUsage | null): void {
  ctx.budget.record({
    tokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
    cost: usage?.cost ?? 0,
    requests: 1,
  });
}

/** Options for {@link spawnSubAgent}. */
export interface SpawnSubAgentOptions {
  /** Retry overrides for tests and callers that need a different policy. */
  retry?: RetryOptions;
}

/**
 * Delegate a read-only research task to a sub-agent.
 *
 * Retryable model failures use the shared retry policy; each failed attempt is
 * charged to the parent budget before the retry.
 */
export async function spawnSubAgent(
  ctx: AgentContext,
  task: string,
  options: SpawnSubAgentOptions = {},
): Promise<string> {
  // Create a sub-agent context with read-only tools
  const subCtx: AgentContext = {
    ...ctx,
    policy: 'read_only',
    taskId: undefined, // Sub-agents are ephemeral
  };
  const readOnlyTools = createTools(subCtx).filter(t => SUBAGENT_TOOLS.includes(t.function.name));

  try {
    return await withModelRetry(
      async () => {
        if (!ctx.budget.canSpend()) {
          throw new Error('Budget exhausted before sub-agent model call');
        }

        let result: SubAgentResult | undefined;
        try {
          result = ctx.callModel({
            model: MODEL,
            instructions: SYSTEM_PROMPT,
            input: task,
            tools: readOnlyTools,
            stopWhen: [stepCountIs(SUBAGENT_MAX_ITERATIONS)],
            signal: ctx.signal,
          });
          const text = await result.getText();
          recordSubAgentUsage(ctx, await readSubAgentUsage(result));
          return text;
        } catch (error) {
          // Failed attempts still consume a request and whatever tokens the
          // provider already billed.
          const partialUsage = await readSubAgentUsage(result);
          await cancelSubAgentResult(result);
          recordSubAgentUsage(ctx, partialUsage);
          throw error;
        }
      },
      { ...options.retry, signal: options.retry?.signal ?? ctx.signal },
    );
  } catch (error) {
    if (error instanceof ModelRetryExhaustedError) {
      return `ERROR: sub-agent model call failed after ${error.attempts} attempts — ${error.classified.message}`;
    }
    const errMsg = (error as any)?.error?.message ?? (error as any)?.message ?? String(error);
    return `ERROR: sub-agent model call failed — ${errMsg}`;
  }
}

/** Search the workspace with ripgrep and return formatted matches. */
export function searchCodebase(
  ctx: AgentContext,
  pattern: string,
  path: string = '.',
  maxResults: number = 60,
): string {
  const inputPath = path && path.trim() ? path : '.';
  const cappedMax = Math.min(maxResults, 150);
  let resolvedPath: string;
  try {
    resolvedPath = resolveSafePath(inputPath, ctx.cwd);
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
  try {
    const output = execFileSync(
      'rg',
      [
        '--json',
        '-n',
        '-C',
        '2',
        '--max-count',
        String(cappedMax),
        '--glob',
        '!node_modules',
        '--glob',
        '!dist',
        '--glob',
        '!.git',
        '--glob',
        '!*.lock',
        '--glob',
        '!package-lock.json',
        '--',
        pattern,
        resolvedPath,
      ],
      { encoding: 'utf-8', timeout: 10_000, maxBuffer: 10 * 1024 * 1024 },
    );
    return formatRgOutput(output, cappedMax);
  } catch (err: any) {
    if (err.status === 1) return 'No matches found.';
    return `ERROR: ${err.stderr ?? err.message}`;
  }
}

/** Replace the session todo list and return a formatted summary. */
export function todoWrite(
  sessionId: string,
  todos: Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed' }>,
): string {
  try {
    const saved = saveTodos(sessionId, todos as TodoItem[]);
    const counts = getTodoCounts(saved.items);
    return `${formatTodoListOutput(saved.items)}\n\nSaved ${counts.total} todo(s) (${counts.completed} completed, ${counts.inProgress} in progress, ${counts.pending} pending).`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

/** Return the formatted todo list for a session. */
export function todoRead(sessionId: string): string {
  try {
    const todoList = loadTodos(sessionId);
    return formatTodoListOutput(todoList.items);
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}
