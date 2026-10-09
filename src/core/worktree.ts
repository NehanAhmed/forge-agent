import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const GIT_TIMEOUT = 30_000;
const WORKTREES_DIR = path.join(os.homedir(), '.forge', 'worktrees');

export interface WorktreeInfo {
  path: string;
  branch: string;
  baseRef: string;
  baseBranch: string;
}

export interface TaskDiff {
  diff: string;
  files: Array<{ path: string; additions: number; deletions: number }>;
  commits: Array<{ sha: string; message: string }>;
}

export interface MergeResult {
  success: boolean;
  conflictedFiles?: string[];
  message?: string;
}

function runGit(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      timeout: GIT_TIMEOUT,
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? '';
    const stdout = err.stdout?.toString() ?? '';
    throw new Error(`git ${args[0]} failed: ${stderr || stdout || err.message}`);
  }
}

function isGitRepo(cwd: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'ignore', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

function sanitizeSlug(text: string): string {
  // Remove characters that are unsafe in branch names or paths
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export function createWorktree(taskId: string, goal: string, repoCwd: string): WorktreeInfo {
  if (!isGitRepo(repoCwd)) {
    throw new Error('Not a git repository');
  }

  // Ensure worktrees directory exists
  if (!fs.existsSync(WORKTREES_DIR)) {
    fs.mkdirSync(WORKTREES_DIR, { recursive: true });
  }

  const shortId = taskId.replace('task_', '').slice(0, 8);
  const slug = sanitizeSlug(goal);
  const branch = `agent/task-${shortId}-${slug}`;
  const worktreePath = path.join(WORKTREES_DIR, taskId);

  // Get current HEAD and branch
  const baseRef = runGit(['rev-parse', 'HEAD'], repoCwd);
  let baseBranch: string;
  try {
    baseBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoCwd);
    if (baseBranch === 'HEAD') {
      // Detached HEAD - use the SHA
      baseBranch = baseRef;
    }
  } catch {
    baseBranch = baseRef;
  }

  // Check if main tree is dirty and warn
  try {
    runGit(['diff', '--quiet'], repoCwd);
    runGit(['diff', '--cached', '--quiet'], repoCwd);
  } catch {
    // Tree is dirty - this is allowed but worth logging
    console.warn(
      `[worktree] Warning: main working tree has uncommitted changes. ` +
      `The worktree will branch from HEAD (${baseRef.slice(0, 8)}) ` +
      `and will NOT include uncommitted changes.`
    );
  }

  // Create the worktree
  runGit(['worktree', 'add', worktreePath, '-b', branch], repoCwd);

  return {
    path: worktreePath,
    branch,
    baseRef,
    baseBranch,
  };
}

export function removeWorktree(info: WorktreeInfo, repoCwd: string, force = false): void {
  // Only operate on worktrees under our managed directory
  if (!info.path.startsWith(WORKTREES_DIR)) {
    throw new Error(`Refusing to remove worktree outside managed directory: ${info.path}`);
  }

  // Only operate on agent/ branches
  if (!info.branch.startsWith('agent/')) {
    throw new Error(`Refusing to remove non-agent branch: ${info.branch}`);
  }

  // Remove the worktree
  try {
    runGit(['worktree', 'remove', info.path, ...(force ? ['--force'] : [])], repoCwd);
  } catch (err: any) {
    // If the directory is already gone, that's fine
    if (fs.existsSync(info.path)) {
      throw err;
    }
  }

  // Delete the branch (soft first, then force if caller confirmed)
  try {
    runGit(['branch', '-d', info.branch], repoCwd);
  } catch (err: any) {
    if (force) {
      runGit(['branch', '-D', info.branch], repoCwd);
    } else {
      throw err;
    }
  }
}

export function checkpointCommit(info: WorktreeInfo, message: string): void {
  // Only operate on worktrees under our managed directory
  if (!info.path.startsWith(WORKTREES_DIR)) {
    throw new Error(`Refusing to commit in worktree outside managed directory: ${info.path}`);
  }

  // Stage all changes
  runGit(['add', '-A'], info.path);

  // Check if there's anything to commit
  try {
    const status = execFileSync('git', ['diff', '--cached', '--name-only'], {
      encoding: 'utf-8',
      cwd: info.path,
      timeout: GIT_TIMEOUT,
    }).trim();

    if (!status) {
      return; // Nothing to commit
    }
  } catch {
    return;
  }

  // Commit - never use --no-verify
  runGit(['commit', '-m', message], info.path);
}

export function hasChangesFromBase(info: WorktreeInfo): boolean {
  try {
    const diff = execFileSync('git', ['diff', `${info.baseRef}..HEAD`, '--name-only'], {
      encoding: 'utf-8',
      cwd: info.path,
      timeout: GIT_TIMEOUT,
    }).trim();
    return diff.length > 0;
  } catch {
    return false;
  }
}

export async function getDiff(info: WorktreeInfo): Promise<TaskDiff> {
  // Only operate on agent/ branches
  if (!info.branch.startsWith('agent/')) {
    throw new Error(`Refusing to diff non-agent branch: ${info.branch}`);
  }

  // Get full diff
  let diff = '';
  try {
    diff = execFileSync('git', ['diff', `${info.baseRef}..HEAD`], {
      encoding: 'utf-8',
      cwd: info.path,
      timeout: GIT_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err: any) {
    diff = `ERROR: ${err.message}`;
  }

  // Get per-file stats
  const files: Array<{ path: string; additions: number; deletions: number }> = [];
  try {
    const statsOutput = execFileSync(
      'git', ['diff', '--numstat', `${info.baseRef}..HEAD`],
      { encoding: 'utf-8', cwd: info.path, timeout: GIT_TIMEOUT }
    );
    for (const line of statsOutput.trim().split('\n').filter(Boolean)) {
      const parts = line.split('\t');
      if (parts.length === 3) {
        files.push({
          additions: parseInt(parts[0] ?? '0', 10) || 0,
          deletions: parseInt(parts[1] ?? '0', 10) || 0,
          path: parts[2] ?? '',
        });
      }
    }
  } catch {
    // Ignore stats errors
  }

  // Get commits
  const commits: Array<{ sha: string; message: string }> = [];
  try {
    const logOutput = execFileSync(
      'git', ['log', `${info.baseRef}..HEAD`, '--format=%H %s'],
      { encoding: 'utf-8', cwd: info.path, timeout: GIT_TIMEOUT }
    );
    for (const line of logOutput.trim().split('\n').filter(Boolean)) {
      const spaceIdx = line.indexOf(' ');
      if (spaceIdx > 0) {
        commits.push({
          sha: line.slice(0, spaceIdx),
          message: line.slice(spaceIdx + 1),
        });
      }
    }
  } catch {
    // Ignore log errors
  }

  return { diff, files, commits };
}

export async function mergeWorktree(
  info: WorktreeInfo,
  repoCwd: string,
  opts: { message?: string } = {}
): Promise<MergeResult> {
  // Only operate on agent/ branches
  if (!info.branch.startsWith('agent/')) {
    throw new Error(`Refusing to merge non-agent branch: ${info.branch}`);
  }

  // Verify main tree is clean
  try {
    runGit(['diff', '--quiet'], repoCwd);
    runGit(['diff', '--cached', '--quiet'], repoCwd);
  } catch {
    return { success: false, message: 'Main working tree has uncommitted changes. Please commit or stash first.' };
  }

  // Verify we're on the base branch
  const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoCwd);
  if (currentBranch !== info.baseBranch) {
    return {
      success: false,
      message: `Main checkout is on '${currentBranch}', expected '${info.baseBranch}'.`,
    };
  }

  const mergeMessage = opts.message ?? `Merge task branch ${info.branch}`;

  try {
    runGit(['merge', '--no-ff', info.branch, '-m', mergeMessage], repoCwd);

    // On success: remove worktree and delete branch
    try {
      runGit(['worktree', 'remove', info.path], repoCwd);
    } catch {
      // Ignore cleanup errors
    }
    try {
      runGit(['branch', '-d', info.branch], repoCwd);
    } catch {
      // Ignore cleanup errors
    }

    return { success: true };
  } catch (err: any) {
    // Merge conflict - abort and report
    const conflictedFiles: string[] = [];
    try {
      const conflictOutput = execFileSync(
        'git', ['diff', '--name-only', '--diff-filter=U'],
        { encoding: 'utf-8', cwd: repoCwd, timeout: GIT_TIMEOUT }
      );
      conflictedFiles.push(...conflictOutput.trim().split('\n').filter(Boolean));
    } catch {
      // Ignore
    }

    try {
      runGit(['merge', '--abort'], repoCwd);
    } catch {
      // Ignore abort errors
    }

    return {
      success: false,
      conflictedFiles,
      message: `Merge conflict in ${conflictedFiles.length} file(s). Merge aborted.`,
    };
  }
}

export function listOrphanedWorktrees(repoCwd: string, knownTaskIds: Set<string>): string[] {
  if (!isGitRepo(repoCwd)) {
    return [];
  }

  const orphans: string[] = [];

  try {
    const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      encoding: 'utf-8',
      cwd: repoCwd,
      timeout: GIT_TIMEOUT,
    });

    let currentPath = '';
    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        currentPath = line.slice('worktree '.length).trim();
      } else if (line.startsWith('branch ')) {
        const branch = line.slice('branch '.length).trim().replace('refs/heads/', '');
        if (branch.startsWith('agent/') && currentPath.startsWith(WORKTREES_DIR)) {
          // Check if this worktree belongs to a known task
          const taskId = path.basename(currentPath);
          if (!knownTaskIds.has(taskId)) {
            orphans.push(currentPath);
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return orphans;
}
