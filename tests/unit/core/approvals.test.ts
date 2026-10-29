import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { executeWithPolicy, isAllowlistedCommand, isPathInside, SHELL_ALLOWLIST } from '../../../src/core/approvals.js';
import { createTestContext } from '../../helpers/context.js';
import { tempDir } from '../../helpers/temp.js';

describe('approval policy', () => {
  it('reads are always executed', async () => {
    const ctx = createTestContext({ policy: 'read_only' });
    const result = await executeWithPolicy(ctx, 'read', 'read_file', {}, () => 'contents');
    assert.equal(result, 'contents');
  });

  it('network risk always asks, even in read_only mode', async () => {
    let approvals = 0;
    const ctx = createTestContext({
      policy: 'read_only',
      requestApproval: async () => {
        approvals++;
        return false;
      },
    });

    const result = await executeWithPolicy(ctx, 'network', 'fetch', {}, () => 'data');
    assert.deepEqual(result, { error: 'User denied this action.' });
    assert.equal(approvals, 1);
  });

  it('read_only refuses write and exec tools', async () => {
    const ctx = createTestContext({ policy: 'read_only' });
    assert.deepEqual(await executeWithPolicy(ctx, 'write', 'write_file', { path: 'a.txt' }, () => 'x'), {
      error: 'Write/exec tools not available in read-only mode.',
    });
    assert.deepEqual(await executeWithPolicy(ctx, 'exec', 'run_bash', { command: 'npm test' }, () => 'x'), {
      error: 'Write/exec tools not available in read-only mode.',
    });
  });

  it('auto_in_worktree approves writes inside the task cwd only', async t => {
    const cwd = tempDir(t, 'forge-approval-');
    const ctx = createTestContext({ policy: 'auto_in_worktree', cwd, taskId: 'task-1' });

    assert.equal(
      await executeWithPolicy(ctx, 'write', 'write_file', { path: path.join(cwd, 'a.txt') }, () => 'ok'),
      'ok',
    );

    let asked = false;
    const outside = createTestContext({
      policy: 'auto_in_worktree',
      cwd,
      taskId: 'task-1',
      requestApproval: async () => {
        asked = true;
        return false;
      },
    });
    const result = await executeWithPolicy(
      outside,
      'write',
      'write_file',
      { path: path.join(cwd, '..', 'outside.txt') },
      () => 'should not run',
    );
    assert.deepEqual(result, { error: 'User denied this action.' });
    assert.equal(asked, true);
  });

  it('auto_in_worktree auto-approves allowlisted commands only', async () => {
    const ctx = createTestContext({ policy: 'auto_in_worktree', taskId: 'task-1' });
    assert.equal(await executeWithPolicy(ctx, 'exec', 'run_bash', { command: 'npm test' }, () => 'ran'), 'ran');

    let asked = 0;
    const blocked = createTestContext({
      policy: 'auto_in_worktree',
      taskId: 'task-1',
      requestApproval: async () => {
        asked++;
        return false;
      },
    });
    const result = await executeWithPolicy(blocked, 'exec', 'run_bash', { command: 'rm -rf /' }, () => 'ran');
    assert.deepEqual(result, { error: 'User denied this action.' });
    assert.equal(asked, 1);
  });

  it('ask policy prompts for writes and honours denial', async () => {
    let asked = 0;
    const denied = createTestContext({
      policy: 'ask',
      requestApproval: async () => {
        asked++;
        return false;
      },
    });
    const result = await executeWithPolicy(denied, 'write', 'write_file', { path: 'a.txt' }, () => 'ran');
    assert.deepEqual(result, { error: 'User denied this action.' });
    assert.equal(asked, 1);

    const allowed = createTestContext({ policy: 'ask', requestApproval: async () => true });
    assert.equal(await executeWithPolicy(allowed, 'write', 'write_file', { path: 'a.txt' }, () => 'ran'), 'ran');
  });
});

describe('shell allowlist', () => {
  it('matches exact commands and argument prefixes', () => {
    assert.equal(isAllowlistedCommand('npm test'), true);
    assert.equal(isAllowlistedCommand('  NPM TEST  '), true);
    assert.equal(isAllowlistedCommand('npm test -- --watch'), true);
    assert.equal(isAllowlistedCommand('pnpm build'), true);
    assert.equal(isAllowlistedCommand('git status --short'), true);
    assert.equal(SHELL_ALLOWLIST.includes('eslint'), true);
  });

  it('does not allow prefix tricks, chaining, or unknown commands', () => {
    assert.equal(isAllowlistedCommand('npm testing'), false);
    assert.equal(isAllowlistedCommand('npm test; rm -rf /'), false);
    assert.equal(isAllowlistedCommand('npm test && curl http://evil.test'), false);
    assert.equal(isAllowlistedCommand('rm -rf /'), false);
    assert.equal(isAllowlistedCommand(''), false);
  });
});

describe('path containment', () => {
  it('accepts children and the directory itself', () => {
    const root = path.resolve('root');
    assert.equal(isPathInside(root, root), true);
    assert.equal(isPathInside(path.join(root, 'a', 'b.txt'), root), true);
  });

  it('rejects siblings and parent paths', () => {
    const root = path.resolve('root');
    assert.equal(isPathInside(path.join(root, '..', 'sibling'), root), false);
    assert.equal(isPathInside(path.resolve('elsewhere'), root), false);
  });
});
