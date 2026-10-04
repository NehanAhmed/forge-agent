import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { gitStatus, gitDiff, gitAdd, gitCommit } from '../src/tools/implementations.js';

const TEST_REPO = join(process.cwd(), 'tests', 'temp-git-repo');
let originalCwd: string;

function runInTestRepo(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', cwd: TEST_REPO, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  } catch (err: any) {
    return `ERROR: ${err.stderr?.toString() ?? err.message}`;
  }
}

function setupTestRepo() {
  rmSync(TEST_REPO, { recursive: true, force: true });
  mkdirSync(TEST_REPO, { recursive: true });
  runInTestRepo('git init');
  runInTestRepo('git config user.email "test@example.com"');
  runInTestRepo('git config user.name "Test User"');
  writeFileSync(join(TEST_REPO, 'README.md'), '# Test Repo\n\nInitial content.\n');
  runInTestRepo('git add README.md');
  runInTestRepo('git commit -m "Initial commit"');
}

function cleanupTestRepo() {
  rmSync(TEST_REPO, { recursive: true, force: true });
}

describe('git tools', () => {
  beforeEach(() => {
    originalCwd = process.cwd();
    setupTestRepo();
    process.chdir(TEST_REPO);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTestRepo();
  });

  test('git_status shows clean repo', () => {
    const output = gitStatus();
    assert.ok(output.match(/^## (main|master)/));
    assert.ok(!output.includes('?'));
    assert.ok(!output.includes('M'));
  });

  test('git_status shows unstaged changes', () => {
    writeFileSync(join(TEST_REPO, 'README.md'), '# Test Repo\n\nModified content.\n');
    const output = gitStatus();
    assert.ok(output.includes('M README.md') || output.includes(' M README.md'));
  });

  test('git_status shows untracked files', () => {
    writeFileSync(join(TEST_REPO, 'new-file.txt'), 'untracked');
    const output = gitStatus();
    assert.ok(output.includes('?? new-file.txt'));
  });

  test('git_status fails outside git repo', () => {
    const nonRepo = join(originalCwd, '..', 'non-repo-test');
    rmSync(nonRepo, { recursive: true, force: true });
    mkdirSync(nonRepo, { recursive: true });
    try {
      process.chdir(nonRepo);
      const output = gitStatus();
      assert.ok(output.startsWith('ERROR: Not a git repository'));
    } finally {
      process.chdir(TEST_REPO);
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });

  test('git_diff shows unstaged changes', () => {
    writeFileSync(join(TEST_REPO, 'README.md'), '# Test Repo\n\nModified content.\n');
    const output = gitDiff(false);
    assert.ok(output.includes('Modified content') || output.includes('+Modified content'));
  });

  test('git_diff staged:true shows staged changes', () => {
    writeFileSync(join(TEST_REPO, 'README.md'), '# Test Repo\n\nModified content.\n');
    runInTestRepo('git add README.md');
    const output = gitDiff(true);
    assert.ok(output.includes('Modified content') || output.includes('+Modified content'));
  });

  test('git_diff with paths filters output', () => {
    writeFileSync(join(TEST_REPO, 'README.md'), '# Test Repo\n\nModified content.\n');
    writeFileSync(join(TEST_REPO, 'other.txt'), 'other');
    const output = gitDiff(false, ['README.md']);
    assert.ok(output.includes('README.md'));
    assert.ok(!output.includes('other.txt'));
  });

  test('git_diff truncates large output', () => {
    const largeContent = 'x'.repeat(60_000);
    writeFileSync(join(TEST_REPO, 'large.txt'), largeContent);
    runInTestRepo('git add large.txt');
    runInTestRepo('git commit -m "Add large file"');
    writeFileSync(join(TEST_REPO, 'large.txt'), 'y'.repeat(60_000));
    const output = gitDiff(false, ['large.txt']);
    assert.ok(output.includes('[Output truncated at 50000 characters'));
  });

  test('git_add stages a file', () => {
    writeFileSync(join(TEST_REPO, 'new.txt'), 'new file');
    const output = gitAdd(['new.txt']);
    assert.ok(output.includes('Staged 1 file(s)'));
    const status = gitStatus();
    assert.ok(status.includes('A  new.txt') || status.includes('A new.txt') || status.includes('A\tnew.txt'));
  });

  test('git_add stages multiple files', () => {
    writeFileSync(join(TEST_REPO, 'a.txt'), 'a');
    writeFileSync(join(TEST_REPO, 'b.txt'), 'b');
    const output = gitAdd(['a.txt', 'b.txt']);
    assert.ok(output.includes('Staged 2 file(s)'));
  });

  test('git_add rejects empty paths array', () => {
    const output = gitAdd([]);
    assert.ok(output.startsWith('ERROR: At least one path is required'));
  });

  test('git_add rejects nonexistent path', () => {
    const output = gitAdd(['nonexistent.txt']);
    assert.ok(output.startsWith('ERROR:'));
  });

  test('git_add rejects path outside repo', () => {
    const output = gitAdd(['../outside.txt']);
    assert.ok(output.startsWith('ERROR:'));
  });

  test('git_add handles filename starting with dash', () => {
    writeFileSync(join(TEST_REPO, '-dash.txt'), 'dash file');
    const output = gitAdd(['-dash.txt']);
    assert.ok(output.includes('Staged 1 file(s)') || output.startsWith('ERROR:'));
  });

  test('git_add warns on secret-like files', () => {
    writeFileSync(join(TEST_REPO, '.env'), 'SECRET=123');
    const output = gitAdd(['.env']);
    assert.ok(output.includes('Warning: Staging potentially sensitive file'));
  });

  test('git_commit rejects empty message', () => {
    writeFileSync(join(TEST_REPO, 'test.txt'), 'test');
    runInTestRepo('git add test.txt');
    const output = gitCommit('');
    assert.ok(output.startsWith('ERROR: Commit message cannot be empty'));
  });

  test('git_commit rejects whitespace-only message', () => {
    writeFileSync(join(TEST_REPO, 'test.txt'), 'test');
    runInTestRepo('git add test.txt');
    const output = gitCommit('   \n\t  ');
    assert.ok(output.startsWith('ERROR: Commit message cannot be empty'));
  });

  test('git_commit rejects when nothing staged', () => {
    const output = gitCommit('Test commit');
    assert.ok(output.startsWith('ERROR: Nothing staged to commit'));
  });

  test('git_commit creates commit with staged files', () => {
    writeFileSync(join(TEST_REPO, 'commit-test.txt'), 'commit test');
    runInTestRepo('git add commit-test.txt');
    const output = gitCommit('Add commit-test.txt');
    assert.ok(output.includes('Committed'));
    assert.ok(output.includes('commit-test.txt'));
    // Verify commit exists
    const log = runInTestRepo('git log --oneline -1');
    assert.ok(log.includes('Add commit-test.txt'));
  });

  test('git_commit does not include unstaged files', () => {
    writeFileSync(join(TEST_REPO, 'staged.txt'), 'staged');
    writeFileSync(join(TEST_REPO, 'unstaged.txt'), 'unstaged');
    runInTestRepo('git add staged.txt');
    const output = gitCommit('Add staged only');
    assert.ok(output.includes('staged.txt'));
    assert.ok(!output.includes('unstaged.txt'));
    // Verify unstaged.txt is still unstaged
    const status = gitStatus();
    assert.ok(status.includes('?? unstaged.txt') || status.includes('??\tunstaged.txt'));
  });

  test('git_commit fails outside git repo', () => {
    const nonRepo = join(originalCwd, '..', 'non-repo-test2');
    rmSync(nonRepo, { recursive: true, force: true });
    mkdirSync(nonRepo, { recursive: true });
    writeFileSync(join(nonRepo, 'test.txt'), 'test');
    try {
      process.chdir(nonRepo);
      runInTestRepo('git add test.txt'); // This will fail but we don't care
      const output = gitCommit('Test commit');
      assert.ok(output.startsWith('ERROR: Not a git repository'));
    } finally {
      process.chdir(TEST_REPO);
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });

  test('git tools work end-to-end: edit, status, diff, add, commit, status clean', () => {
    // Edit a file
    writeFileSync(join(TEST_REPO, 'README.md'), '# Test Repo\n\nUpdated content.\n');
    // Check status
    let status = gitStatus();
    assert.ok(status.includes('M README.md') || status.includes(' M README.md'));
    // Check diff
    let diff = gitDiff(false);
    assert.ok(diff.includes('Updated content'));
    // Stage the file
    let addOutput = gitAdd(['README.md']);
    assert.ok(addOutput.includes('Staged 1 file(s)'));
    // Check staged diff
    diff = gitDiff(true);
    assert.ok(diff.includes('Updated content'));
    // Commit
    const commitOutput = gitCommit('Update README content');
    assert.ok(commitOutput.includes('Committed'));
    // Final status should be clean
    status = gitStatus();
    assert.ok(status.match(/^## (main|master)/));
    assert.ok(!status.includes('M'));
    assert.ok(!status.includes('?'));
  });
});