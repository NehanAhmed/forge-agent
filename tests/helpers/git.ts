import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { TestContext } from 'node:test';
import { tempDir } from './temp.js';

export interface TestRepo {
  dir: string;
  git: (...args: string[]) => string;
}

export function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

/** Create a git repository with one initial commit and per-repo identity. */
export function initGitRepo(t: TestContext, prefix = 'forge-git-'): TestRepo {
  const dir = tempDir(t, prefix);
  const git = (...args: string[]) => runGit(dir, args);

  git('init', '-b', 'main');
  git('config', 'user.name', 'Forge Test');
  git('config', 'user.email', 'forge-test@example.com');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test Repo\n');
  git('add', 'README.md');
  git('commit', '-m', 'Initial commit');

  return { dir, git };
}

export function commitFile(repo: TestRepo, name: string, content: string, message: string): string {
  fs.writeFileSync(path.join(repo.dir, name), content);
  repo.git('add', '--', name);
  repo.git('commit', '-m', message);
  return repo.git('rev-parse', 'HEAD');
}

export function currentBranch(repo: TestRepo): string {
  return repo.git('rev-parse', '--abbrev-ref', 'HEAD');
}
