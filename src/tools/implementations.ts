import fs from 'fs';
import { execFileSync, execSync } from 'child_process';
import { createTools } from './definitions.js';
import { MODEL, SUBAGENT_MAX_ITERATIONS, SUBAGENT_TOOLS, SYSTEM_PROMPT } from '../core/constants.js';
import { getClient } from '../core/client.js';
import { formatRgOutput, resolveSafePath } from './helpers.js';
import { stepCountIs } from '@openrouter/agent';
import { loadTodos, saveTodos, formatTodoListOutput, getTodoCounts, type TodoItem } from '../core/todos.js';

const GIT_TIMEOUT = 30_000;
const DIFF_TRUNCATE_LIMIT = 50_000;

function runGit(args: string[], cwd: string = process.cwd()): string {
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

function isGitRepo(cwd: string = process.cwd()): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'ignore', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

export function gitStatus(): string {
  if (!isGitRepo()) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  return runGit(['status', '--porcelain=v1', '--branch']);
}

export function gitDiff(staged: boolean = false, paths: string[] = []): string {
  if (!isGitRepo()) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  const args = ['diff'];
  if (staged) args.push('--cached');
  if (paths.length > 0) {
    args.push('--', ...paths);
  }
  let output = runGit(args);
  if (output.startsWith('ERROR:')) return output;
  if (output.length > DIFF_TRUNCATE_LIMIT) {
    output = output.slice(0, DIFF_TRUNCATE_LIMIT) + `\n\n[Output truncated at ${DIFF_TRUNCATE_LIMIT} characters — narrow your paths or use staged diff for smaller output.]`;
  }
  return output;
}

export function gitAdd(paths: string[]): string {
  if (!isGitRepo()) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  if (!paths || paths.length === 0) {
    return 'ERROR: At least one path is required.';
  }
  const safePaths: string[] = [];
  const warnings: string[] = [];
  for (const p of paths) {
    try {
      const safe = resolveSafePath(p);
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
  const output = runGit(['add', '--', ...safePaths]);
  if (output.startsWith('ERROR:')) return output;
  let result = `Staged ${safePaths.length} file(s).`;
  if (warnings.length > 0) result += '\n' + warnings.join('\n');
  return result;
}

export function gitCommit(message: string): string {
  if (!isGitRepo()) {
    return 'ERROR: Not a git repository (or git not installed).';
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return 'ERROR: Commit message cannot be empty or whitespace only.';
  }
  // Check if anything is staged
  const status = runGit(['diff', '--cached', '--name-only']);
  if (status.startsWith('ERROR:')) return status;
  if (!status.trim()) {
    return 'ERROR: Nothing staged to commit. Use git_add to stage files first.';
  }
  const output = runGit(['commit', '-m', trimmed]);
  if (output.startsWith('ERROR:')) return output;
  // Get commit hash and summary
  const hash = runGit(['rev-parse', '--short', 'HEAD']).trim();
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const summary = runGit(['show', '--stat', '--oneline', '-1', 'HEAD']).trim();
  return `Committed ${hash} on ${branch}\n${summary}`;
}

export function runBash(command: string): string {
  // NOTE: run_bash is NOT path-sandboxed — a shell command can `cd`, use
  // absolute paths, or chain commands in ways resolveSafePath can't
  // intercept. It stays a RISKY_TOOL requiring confirmation; true sandboxing
  // would need a real subprocess jail (e.g. a restricted PATH/cwd + denylist
  // of dangerous patterns), which is a separate, bigger piece of work.
  try {
    return execSync(command, { encoding: 'utf-8', timeout: 10_000, cwd: process.cwd() });
  } catch (err: any) {
    return `ERROR: ${err.stdout ?? ''}${err.stderr ?? err.message}`;
  }
}

export function readFile(path: string): string {
  try {
    const safePath = resolveSafePath(path);
    return fs.readFileSync(safePath, 'utf-8');
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function writeFile(path: string, content: string): string {
  try {
    const safePath = resolveSafePath(path);
    fs.writeFileSync(safePath, content, 'utf-8');
    return `File written successfully to ${path}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function editFile(path: string, oldContent: string, newContent: string): string {
  try {
    const safePath = resolveSafePath(path);
    const content = fs.readFileSync(safePath, 'utf-8');
    const occurences = content.split(oldContent).length - 1;
    if (occurences === 0) {
      return `ERROR: The string "${oldContent}" was not found in the file.`;
    }
    const updatedContent = content.replace(oldContent, newContent);
    fs.writeFileSync(safePath, updatedContent, 'utf-8');
    return `Successfully replaced ${occurences} occurence(s) of "${oldContent}" with "${newContent}" in ${path}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export async function spawnSubAgent(task: string): Promise<string> {
  const readOnlyTools = createTools(async () => false)
    .filter(t => SUBAGENT_TOOLS.includes(t.function.name));
  let result;
  try {
    result = getClient().callModel({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: task,
      tools: readOnlyTools,
      stopWhen: [stepCountIs(SUBAGENT_MAX_ITERATIONS)],
    });
  } catch (err: any) {
    return `ERROR: sub-agent model call failed — ${err?.error?.message ?? err?.message ?? String(err)}`;
  }
  try {
    return await result.getText();
  } catch (err: any) {
    return `ERROR: sub-agent stream failed — ${err?.error?.message ?? err?.message ?? String(err)}`;
  }
}

export function searchCodebase(pattern: string, path: string = '.', maxResults: number = 60): string {
  const inputPath = path && path.trim() ? path : '.';
  const cappedMax = Math.min(maxResults, 150);
  let resolvedPath: string;
  try {
    resolvedPath = resolveSafePath(inputPath);
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
  try {
    const output = execFileSync(
      'rg',
      [
        '--json', '-n', '-C', '2', '--max-count', String(cappedMax),
        '--glob', '!node_modules',
        '--glob', '!dist',
        '--glob', '!.git',
        '--glob', '!*.lock',
        '--glob', '!package-lock.json',
        '--', pattern, resolvedPath,
      ],
      { encoding: 'utf-8', timeout: 10_000, maxBuffer: 10 * 1024 * 1024 }
    );
    return formatRgOutput(output, cappedMax);
  } catch (err: any) {
    if (err.status === 1) return 'No matches found.';
    return `ERROR: ${err.stderr ?? err.message}`;
  }
}

export function todoWrite(sessionId: string, todos: Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed' }>): string {
  try {
    const saved = saveTodos(sessionId, todos as TodoItem[]);
    const counts = getTodoCounts(saved.items);
    return `${formatTodoListOutput(saved.items)}\n\nSaved ${counts.total} todo(s) (${counts.completed} completed, ${counts.inProgress} in progress, ${counts.pending} pending).`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function todoRead(sessionId: string): string {
  try {
    const todoList = loadTodos(sessionId);
    return formatTodoListOutput(todoList.items);
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export const toolExecutors: Record<string, (args: any) => string | Promise<string>> = {
  run_bash: (args) => runBash(args.command),
  read_file: (args) => readFile(args.path),
  write_file: (args) => writeFile(args.path, args.content),
  replace_string_in_file: (args) => editFile(args.path, args.stringToReplace, args.newString),
  spawn_sub_agent: (args) => spawnSubAgent(args.task),
  search_code: (args) => searchCodebase(args.pattern, args.path, args.maxResults),
  git_status: (args) => gitStatus(),
  git_diff: (args) => gitDiff(args.staged ?? false, args.paths ?? []),
  git_add: (args) => gitAdd(args.paths),
  git_commit: (args) => gitCommit(args.message),
  todo_write: (args) => todoWrite(args.sessionId ?? '', args.todos),
  todo_read: (args) => todoRead(args.sessionId ?? ''),
};