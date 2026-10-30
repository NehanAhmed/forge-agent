import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkpointCommit,
  createWorktree,
  getDiff,
  hasChangesFromBase,
  listOrphanedWorktrees,
  mergeWorktree,
  removeWorktree,
} from '../../src/core/worktree.js';
import { initGitRepo, type TestRepo } from '../helpers/git.js';
import { tempDir } from '../helpers/temp.js';

function createTaskWorktree(t: Parameters<typeof tempDir>[0], repo: TestRepo, goal: string) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const info = createWorktree(taskId, goal, repo.dir);
  t.after(() => {
    try {
      removeWorktree(info, repo.dir, true);
    } catch {
      // Already merged or removed by the test.
    }
  });
  return { taskId, info };
}

describe('worktree isolation', () => {
  it('creates a managed worktree on an agent branch', t => {
    const repo = initGitRepo(t, 'forge-worktree-');
    const { info } = createTaskWorktree(t, repo, 'Add feature X');

    assert.match(info.branch, /^agent\/task-/);
    assert.equal(fs.existsSync(info.path), true);
    assert.equal(info.baseBranch, 'main');
    assert.ok(info.baseRef.length > 0);
  });

  it('checkpoints changes and reports a diff', async t => {
    const repo = initGitRepo(t, 'forge-worktree-diff-');
    const { info } = createTaskWorktree(t, repo, 'Edit files');

    fs.writeFileSync(path.join(info.path, 'newfile.txt'), 'Hello world\n');
    checkpointCommit(info, 'task: add newfile');
    assert.equal(hasChangesFromBase(info), true);

    const diff = await getDiff(info);
    assert.match(diff.diff, /newfile\.txt/);
    assert.equal(diff.files[0]?.path, 'newfile.txt');
    assert.equal(diff.commits[0]?.message, 'task: add newfile');
  });

  it('does not create a commit when there is nothing to checkpoint', t => {
    const repo = initGitRepo(t, 'forge-worktree-clean-');
    const { info } = createTaskWorktree(t, repo, 'No changes');
    const before = repo.git('rev-parse', 'HEAD');

    checkpointCommit(info, 'empty checkpoint');
    assert.equal(repo.git('rev-parse', 'HEAD'), before);
    assert.equal(hasChangesFromBase(info), false);
  });

  it('merges a clean branch and removes the worktree', async t => {
    const repo = initGitRepo(t, 'forge-worktree-merge-');
    const { info } = createTaskWorktree(t, repo, 'Merge test');
    fs.writeFileSync(path.join(info.path, 'merged.txt'), 'content\n');
    checkpointCommit(info, 'task: merge test');

    const result = await mergeWorktree(info, repo.dir);

    assert.deepEqual(result, { success: true });
    assert.equal(fs.existsSync(path.join(repo.dir, 'merged.txt')), true);
    assert.equal(fs.existsSync(info.path), false);
  });

  it('refuses to merge when the main tree is dirty', async t => {
    const repo = initGitRepo(t, 'forge-worktree-dirty-');
    const { info } = createTaskWorktree(t, repo, 'Dirty main');
    fs.writeFileSync(path.join(info.path, 'x.txt'), 'x');
    checkpointCommit(info, 'task: x');
    fs.writeFileSync(path.join(repo.dir, 'README.md'), 'dirty\n');

    const result = await mergeWorktree(info, repo.dir);
    assert.equal(result.success, false);
    assert.match(result.message ?? '', /uncommitted changes/);
  });

  it('refuses to merge from the wrong branch', async t => {
    const repo = initGitRepo(t, 'forge-worktree-branch-');
    const { info } = createTaskWorktree(t, repo, 'Wrong branch');
    fs.writeFileSync(path.join(info.path, 'x.txt'), 'x');
    checkpointCommit(info, 'task: x');
    repo.git('checkout', '-b', 'not-main');

    const result = await mergeWorktree(info, repo.dir);
    assert.equal(result.success, false);
    assert.match(result.message ?? '', /expected 'main'/);
  });

  it('aborts a conflicting merge and reports the files', async t => {
    const repo = initGitRepo(t, 'forge-worktree-conflict-');
    const { info } = createTaskWorktree(t, repo, 'Conflict');
    fs.writeFileSync(path.join(info.path, 'README.md'), 'task version\n');
    checkpointCommit(info, 'task: change readme');
    fs.writeFileSync(path.join(repo.dir, 'README.md'), 'main version\n');
    repo.git('add', 'README.md');
    repo.git('commit', '-m', 'main change');

    const result = await mergeWorktree(info, repo.dir);

    assert.equal(result.success, false);
    assert.deepEqual(result.conflictedFiles, ['README.md']);
    assert.match(result.message ?? '', /Merge conflict/);
    assert.equal(repo.git('status', '--porcelain'), '');
  });

  it('guards diff and merge against non-agent branches', async t => {
    const repo = initGitRepo(t, 'forge-worktree-guards-');
    const { info } = createTaskWorktree(t, repo, 'Guards');
    const fake = { ...info, branch: 'main' };

    await assert.rejects(() => getDiff(fake), /Refusing to diff non-agent branch/);
    await assert.rejects(() => mergeWorktree(fake, repo.dir), /Refusing to merge non-agent branch/);
    assert.throws(() => removeWorktree(fake, repo.dir), /Refusing to remove non-agent branch/);
  });

  it('refuses to remove worktrees outside the managed directory', () => {
    const fake = {
      path: path.resolve('not-managed'),
      branch: 'agent/task-fake',
      baseRef: 'HEAD',
      baseBranch: 'main',
    };
    assert.throws(() => removeWorktree(fake, process.cwd()), /outside managed directory/);
  });

  it('reports orphaned managed worktrees without deleting them', t => {
    const repo = initGitRepo(t, 'forge-worktree-orphan-');
    const { taskId, info } = createTaskWorktree(t, repo, 'Orphan');

    const orphans = listOrphanedWorktrees(repo.dir, new Set()).map(orphan => path.resolve(orphan));
    assert.deepEqual(orphans, [path.resolve(info.path)]);
    assert.deepEqual(listOrphanedWorktrees(repo.dir, new Set([taskId])), []);
    assert.equal(fs.existsSync(info.path), true);
  });

  it('rejects worktree creation outside a git repository', t => {
    const dir = tempDir(t, 'forge-worktree-nogit-');
    assert.throws(() => createWorktree('task_x', 'No git', dir), /Not a git repository/);
  });
});
