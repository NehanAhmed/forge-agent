import { describe, it, beforeEach, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitStatus, gitDiff, gitAdd, gitCommit } from '../../src/tools/implementations.js';
import type { AgentContext } from '../../src/core/context.js';
import { createBudget } from '../../src/core/budget.js';
import { initGitRepo, type TestRepo } from '../helpers/git.js';
import { tempDir } from '../helpers/temp.js';

function makeCtx(cwd: string): AgentContext {
  return {
    taskId: 'test-git',
    cwd,
    signal: new AbortController().signal,
    state: { load: async () => null, save: async () => {} },
    policy: 'ask',
    budget: createBudget(),
    log: () => {},
    requestApproval: async () => true,
    callModel: (() => {}) as unknown as AgentContext['callModel'],
  };
}

describe('git tools', () => {
  let repo: TestRepo;

  beforeEach(t => {
    repo = initGitRepo(t as TestContext, 'forge-git-tools-');
  });

  it('git_status shows clean repo', () => {
    const output = gitStatus(makeCtx(repo.dir));
    assert.match(output, /^## (main|master)/);
    assert.ok(!output.includes('?'));
    assert.ok(!output.includes('M'));
  });

  it('git_status shows unstaged changes', () => {
    fs.writeFileSync(path.join(repo.dir, 'README.md'), '# Test Repo\n\nModified content.\n');
    const output = gitStatus(makeCtx(repo.dir));
    assert.ok(output.includes('M README.md') || output.includes(' M README.md'));
  });

  it('git_status shows untracked files', () => {
    fs.writeFileSync(path.join(repo.dir, 'new-file.txt'), 'untracked');
    const output = gitStatus(makeCtx(repo.dir));
    assert.ok(output.includes('?? new-file.txt'));
  });

  it('git_status fails outside git repo', t => {
    const nonRepo = tempDir(t, 'forge-non-repo-');
    const output = gitStatus(makeCtx(nonRepo));
    assert.ok(output.startsWith('ERROR: Not a git repository'));
  });

  it('git_diff shows unstaged changes', () => {
    fs.writeFileSync(path.join(repo.dir, 'README.md'), '# Test Repo\n\nModified content.\n');
    const output = gitDiff(makeCtx(repo.dir), false);
    assert.ok(output.includes('Modified content') || output.includes('+Modified content'));
  });

  it('git_diff staged:true shows staged changes', () => {
    fs.writeFileSync(path.join(repo.dir, 'README.md'), '# Test Repo\n\nModified content.\n');
    repo.git('add', 'README.md');
    const output = gitDiff(makeCtx(repo.dir), true);
    assert.ok(output.includes('Modified content') || output.includes('+Modified content'));
  });

  it('git_diff with paths filters output', () => {
    fs.writeFileSync(path.join(repo.dir, 'README.md'), '# Test Repo\n\nModified content.\n');
    fs.writeFileSync(path.join(repo.dir, 'other.txt'), 'other');
    const output = gitDiff(makeCtx(repo.dir), false, ['README.md']);
    assert.ok(output.includes('README.md'));
    assert.ok(!output.includes('other.txt'));
  });

  it('git_diff truncates large output', () => {
    const largeContent = 'x'.repeat(60_000);
    fs.writeFileSync(path.join(repo.dir, 'large.txt'), largeContent);
    repo.git('add', 'large.txt');
    repo.git('commit', '-m', 'Add large file');
    fs.writeFileSync(path.join(repo.dir, 'large.txt'), 'y'.repeat(60_000));
    const output = gitDiff(makeCtx(repo.dir), false, ['large.txt']);
    assert.ok(output.includes('[Output truncated at 50000 characters'));
  });

  it('git_add stages a file', () => {
    fs.writeFileSync(path.join(repo.dir, 'new.txt'), 'new file');
    const output = gitAdd(makeCtx(repo.dir), ['new.txt']);
    assert.ok(output.includes('Staged 1 file(s)'));
    const status = gitStatus(makeCtx(repo.dir));
    assert.ok(status.includes('A  new.txt') || status.includes('A new.txt') || status.includes('A\tnew.txt'));
  });

  it('git_add stages multiple files', () => {
    fs.writeFileSync(path.join(repo.dir, 'a.txt'), 'a');
    fs.writeFileSync(path.join(repo.dir, 'b.txt'), 'b');
    const output = gitAdd(makeCtx(repo.dir), ['a.txt', 'b.txt']);
    assert.ok(output.includes('Staged 2 file(s)'));
  });

  it('git_add rejects empty paths array', () => {
    const output = gitAdd(makeCtx(repo.dir), []);
    assert.ok(output.startsWith('ERROR: At least one path is required'));
  });

  it('git_add rejects nonexistent path', () => {
    const output = gitAdd(makeCtx(repo.dir), ['nonexistent.txt']);
    assert.ok(output.startsWith('ERROR:'));
  });

  it('git_add rejects path outside repo', () => {
    const output = gitAdd(makeCtx(repo.dir), ['../outside.txt']);
    assert.ok(output.startsWith('ERROR:'));
  });

  it('git_add handles filename starting with dash', () => {
    fs.writeFileSync(path.join(repo.dir, '-dash.txt'), 'dash file');
    const output = gitAdd(makeCtx(repo.dir), ['-dash.txt']);
    assert.ok(output.includes('Staged 1 file(s)') || output.startsWith('ERROR:'));
  });

  it('git_add warns on secret-like files', () => {
    fs.writeFileSync(path.join(repo.dir, '.env'), 'SECRET=123');
    const output = gitAdd(makeCtx(repo.dir), ['.env']);
    assert.ok(output.includes('Warning: Staging potentially sensitive file'));
  });

  it('git_commit rejects empty message', () => {
    fs.writeFileSync(path.join(repo.dir, 'test.txt'), 'test');
    repo.git('add', 'test.txt');
    const output = gitCommit(makeCtx(repo.dir), '');
    assert.ok(output.startsWith('ERROR: Commit message cannot be empty'));
  });

  it('git_commit rejects whitespace-only message', () => {
    fs.writeFileSync(path.join(repo.dir, 'test.txt'), 'test');
    repo.git('add', 'test.txt');
    const output = gitCommit(makeCtx(repo.dir), '   \n\t  ');
    assert.ok(output.startsWith('ERROR: Commit message cannot be empty'));
  });

  it('git_commit rejects when nothing staged', () => {
    const output = gitCommit(makeCtx(repo.dir), 'Test commit');
    assert.ok(output.startsWith('ERROR: Nothing staged to commit'));
  });

  it('git_commit creates commit with staged files', () => {
    fs.writeFileSync(path.join(repo.dir, 'commit-test.txt'), 'commit test');
    repo.git('add', 'commit-test.txt');
    const output = gitCommit(makeCtx(repo.dir), 'Add commit-test.txt');
    assert.ok(output.includes('Committed'));
    assert.ok(output.includes('commit-test.txt'));
    const log = repo.git('log', '--oneline', '-1');
    assert.ok(log.includes('Add commit-test.txt'));
  });

  it('git_commit does not include unstaged files', () => {
    fs.writeFileSync(path.join(repo.dir, 'staged.txt'), 'staged');
    fs.writeFileSync(path.join(repo.dir, 'unstaged.txt'), 'unstaged');
    repo.git('add', 'staged.txt');
    const output = gitCommit(makeCtx(repo.dir), 'Add staged only');
    assert.ok(output.includes('staged.txt'));
    assert.ok(!output.includes('unstaged.txt'));
    const status = gitStatus(makeCtx(repo.dir));
    assert.ok(status.includes('?? unstaged.txt') || status.includes('??\tunstaged.txt'));
  });

  it('git_commit fails outside git repo', t => {
    const nonRepo = tempDir(t, 'forge-non-repo-commit-');
    fs.writeFileSync(path.join(nonRepo, 'test.txt'), 'test');
    const output = gitCommit(makeCtx(nonRepo), 'Test commit');
    assert.ok(output.startsWith('ERROR: Not a git repository'));
  });

  it('git tools work end-to-end: edit, status, diff, add, commit, status clean', () => {
    const ctx = makeCtx(repo.dir);
    fs.writeFileSync(path.join(repo.dir, 'README.md'), '# Test Repo\n\nUpdated content.\n');
    let status = gitStatus(ctx);
    assert.ok(status.includes('M README.md') || status.includes(' M README.md'));
    let diff = gitDiff(ctx, false);
    assert.ok(diff.includes('Updated content'));
    const addOutput = gitAdd(ctx, ['README.md']);
    assert.ok(addOutput.includes('Staged 1 file(s)'));
    diff = gitDiff(ctx, true);
    assert.ok(diff.includes('Updated content'));
    const commitOutput = gitCommit(ctx, 'Update README content');
    assert.ok(commitOutput.includes('Committed'));
    status = gitStatus(ctx);
    assert.match(status, /^## (main|master)/);
    assert.ok(!status.includes('M'));
    assert.ok(!status.includes('?'));
  });
});
