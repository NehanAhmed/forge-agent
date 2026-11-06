import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// Modules under test
import { resolveSafePath } from '../../src/tools/helpers.js';
import { createBudget } from '../../src/core/budget.js';
import { createTask, isValidTransition, validateStatusTransition } from '../../src/core/task.js';
import { TaskManager } from '../../src/core/task-manager.js';
import { saveTaskIndex, loadTaskIndex, appendTaskLog, loadTaskLog } from '../../src/core/persistence.js';
import { getProjectPaths } from '../../src/core/paths.js';
import { isAllowlistedCommand, executeWithPolicy } from '../../src/core/approvals.js';
import { createTools } from '../../src/tools/definitions.js';
import { runAgentHeadless } from '../../src/core/headless.js';
import type { AgentContext, LogEntry } from '../../src/core/context.js';
import {
  createWorktree,
  removeWorktree,
  checkpointCommit,
  hasChangesFromBase,
  getDiff,
  mergeWorktree,
} from '../../src/core/worktree.js';

// --- Test Helpers ---

function createTempDir(prefix = 'forge-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function initTempGitRepo(): string {
  const dir = createTempDir('forge-git-');
  execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Initial Repo\n');
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

function createFakeModelCall(
  cannedText = 'Task completed successfully',
  cannedUsage = { inputTokens: 50, outputTokens: 25, cost: 0.001 },
) {
  return () => ({
    async *getTextStream() {
      yield cannedText;
    },
    async getText() {
      return cannedText;
    },
    async getUsage() {
      return cannedUsage;
    },
    async *getReasoningStream() {
      // empty
    },
    async *getToolCallsStream() {
      // empty
    },
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000, label = 'condition'): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
  const tmpDir = overrides.cwd ?? createTempDir();
  return {
    taskId: overrides.taskId ?? 'test-task',
    cwd: tmpDir,
    signal: overrides.signal ?? new AbortController().signal,
    state: {
      load: async () => null,
      save: async () => {},
    },
    policy: overrides.policy ?? 'ask',
    budget: overrides.budget ?? createBudget({ maxRequests: 10, maxTokens: 10000 }),
    log: overrides.log ?? (() => {}),
    requestApproval: overrides.requestApproval ?? (async () => true),
    callModel: (overrides.callModel ?? createFakeModelCall()) as any,
  };
}

// --- Test Suites ---

describe('Phase 1: Context Isolation & Path Safety', () => {
  it('rejects path traversal attempts (..)', () => {
    const cwd = createTempDir();
    assert.throws(() => resolveSafePath('../outside.txt', cwd), /resolves outside the working directory/);
  });

  it('rejects absolute paths outside cwd', () => {
    const cwd = createTempDir();
    const outside = path.resolve(os.tmpdir(), 'definitely-outside.txt');
    assert.throws(() => resolveSafePath(outside, cwd), /resolves outside the working directory/);
  });

  it('allows valid relative and subfolder paths inside cwd', () => {
    const cwd = createTempDir();
    const safe = resolveSafePath('subdir/file.txt', cwd);
    assert.equal(safe, path.join(cwd, 'subdir', 'file.txt'));
  });

  it('allows cwd itself', () => {
    const cwd = createTempDir();
    const safe = resolveSafePath('.', cwd);
    assert.equal(safe, path.resolve(cwd));
  });

  it('two contexts write to same relative path in different cwds without interference', () => {
    const dirA = createTempDir('dirA-');
    const dirB = createTempDir('dirB-');

    const fileA = resolveSafePath('output.txt', dirA);
    const fileB = resolveSafePath('output.txt', dirB);

    fs.writeFileSync(fileA, 'Content for A', 'utf-8');
    fs.writeFileSync(fileB, 'Content for B', 'utf-8');

    assert.equal(fs.readFileSync(fileA, 'utf-8'), 'Content for A');
    assert.equal(fs.readFileSync(fileB, 'utf-8'), 'Content for B');
  });
});

describe('Phase 2: Headless runAgent & Abort Handling', () => {
  it('completes headless run and produces summary and usage', async () => {
    const logs: any[] = [];
    const ctx = createMockContext({
      log: entry => logs.push(entry),
      callModel: createFakeModelCall('Finished the job', { inputTokens: 100, outputTokens: 50, cost: 0.002 }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'done');
    assert.equal(result.summary, 'Finished the job');
    assert.equal(result.usage.inputTokens, 100);
    assert.equal(result.usage.outputTokens, 50);
    assert.equal(result.usage.requests, 1);
  });

  it('aborts promptly when signal is already aborted', async () => {
    const abort = new AbortController();
    abort.abort();

    const ctx = createMockContext({ signal: abort.signal });
    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'cancelled');
  });

  it('fails with budget_exceeded when budget cannot spend', async () => {
    const budget = createBudget({ maxRequests: 1 });
    budget.record({ requests: 1 }); // Exhaust requests

    const ctx = createMockContext({ budget });
    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'budget_exceeded');
  });
});

describe('Phase 3: Task Model & State Machine', () => {
  it('creates task with valid default state', () => {
    const task = createTask('task_123', 'My goal');
    assert.equal(task.id, 'task_123');
    assert.equal(task.goal, 'My goal');
    assert.equal(task.status, 'queued');
    assert.equal(task.isolation, 'worktree');
    assert.equal(task.policy, 'ask');
    assert.equal(task.resumable, false);
  });

  it('allows valid state transitions', () => {
    assert.equal(isValidTransition('queued', 'running'), true);
    assert.equal(isValidTransition('queued', 'cancelled'), true);
    assert.equal(isValidTransition('running', 'waiting_approval'), true);
    assert.equal(isValidTransition('running', 'done'), true);
    assert.equal(isValidTransition('running', 'failed'), true);
    assert.equal(isValidTransition('running', 'cancelled'), true);
    assert.equal(isValidTransition('waiting_approval', 'running'), true);
    assert.equal(isValidTransition('waiting_approval', 'cancelled'), true);
  });

  it('rejects disallowed state transitions by throwing', () => {
    assert.throws(() => validateStatusTransition('done', 'running'), /Invalid task status transition/);
    assert.throws(() => validateStatusTransition('cancelled', 'running'), /Invalid task status transition/);
    assert.throws(() => validateStatusTransition('queued', 'done'), /Invalid task status transition/);
  });
});

describe('Phase 4: TaskManager Queue, Concurrency & Lifecycle', () => {
  it('creates, lists, and gets tasks', () => {
    const dir = createTempDir('forge-task-ops-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });
    const t1 = manager.create('First task');
    const t2 = manager.create('Second task');

    assert.ok(manager.get(t1.id));
    assert.ok(manager.get(t2.id));

    const all = manager.list();
    assert.ok(all.length >= 2);
  });

  it('cancelling a queued task removes it and marks it cancelled', async () => {
    const dir = createTempDir('forge-task-cancel-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    }); // Concurrency 0 means nothing runs automatically
    const task = manager.create('Will cancel');
    assert.equal(task.status, 'queued');

    await manager.cancel(task.id);
    assert.equal(manager.get(task.id)?.status, 'cancelled');
  });

  it('resumes an interrupted/failed task back to queued', () => {
    const dir = createTempDir('forge-task-resume-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });
    const task = manager.create('Interrupted task');

    // Simulate interruption
    task.status = 'failed';
    task.resumable = true;
    task.error = { code: 'interrupted', message: 'Interrupted' };

    const resumed = manager.resume(task.id);
    assert.equal(resumed.status, 'queued');
    assert.equal(resumed.resumable, false);
    assert.equal(resumed.error, undefined);
  });

  it('re-queues a finished task and runs its follow-up message', async () => {
    const dir = initTempGitRepo();
    const inputs: string[] = [];
    const callModel = (options: { input: string }) => {
      inputs.push(options.input);
      return {
        async *getTextStream() {
          yield `handled: ${options.input}`;
        },
        async getText() {
          return `handled: ${options.input}`;
        },
        async getUsage() {
          return { inputTokens: 1, outputTokens: 1, cost: 0 };
        },
        async *getReasoningStream() {},
        async *getToolCallsStream() {},
      };
    };
    const manager = new TaskManager({
      concurrency: 1,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel,
    });

    try {
      const task = manager.create('Initial goal', { cwd: dir, isolation: 'shared' });
      await waitFor(() => manager.get(task.id)?.status === 'done', 5000, 'initial run');

      // The task object is live and processQueue() may start it immediately
      // (same convention as create()), so assert the observable re-queue
      // transition instead of the mutable status on the returned object.
      const statusChanges: Array<{ oldStatus: string; newStatus: string }> = [];
      manager.on('task:status', event => statusChanges.push(event));
      const returned = manager.sendFollowUp(task.id, 'Second question');

      assert.equal(returned.id, task.id);
      assert.ok(statusChanges.some(change => change.oldStatus === 'done' && change.newStatus === 'queued'));

      await waitFor(() => inputs.length === 2 && manager.get(task.id)?.status === 'done', 5000, 'follow-up run');

      assert.deepEqual(inputs, ['Initial goal', 'Second question']);
      const log = manager.getLog(task.id);
      assert.ok(log.some(entry => entry.type === 'user' && entry.content === 'Second question'));
    } finally {
      await manager.shutdown({ graceMs: 500 });
    }
  });

  it('rejects a follow-up while the task is still active', () => {
    const dir = createTempDir('forge-task-followup-guard-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });
    const task = manager.create('Still queued');

    assert.throws(() => manager.sendFollowUp(task.id, 'too early'), /Only finished tasks/);
  });

  it('rejects a non-forced delete with children without mutating the tree', async () => {
    const dir = createTempDir('forge-task-delete-guard-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });

    const parent = manager.create('Parent to keep', { cwd: dir, isolation: 'shared' });
    const child = await manager.spawnChild(parent.id, 'Child to keep', true);

    // The child check must run before cancellation, so a rejected delete leaves
    // every task exactly as it was.
    await assert.rejects(manager.delete(parent.id, false), /children/);

    assert.equal(manager.get(parent.id)?.status, 'queued');
    assert.equal(manager.get(child.id)?.status, 'queued');
    assert.equal(manager.list().length, 2);
  });

  it('force-deletes a task and all of its descendants', async () => {
    const dir = createTempDir('forge-task-delete-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });

    const parent = manager.create('Parent to delete', { cwd: dir, isolation: 'shared' });
    const child = await manager.spawnChild(parent.id, 'Child to delete', true);
    const grandchild = await manager.spawnChild(child.id, 'Grandchild to delete', true);

    const deleted: string[] = [];
    manager.on('task:deleted', event => deleted.push(event.taskId));

    await manager.delete(parent.id, true);

    assert.equal(manager.get(parent.id), undefined);
    assert.equal(manager.get(child.id), undefined);
    assert.equal(manager.get(grandchild.id), undefined);
    assert.equal(manager.list().length, 0);
    assert.deepEqual(new Set(deleted), new Set([parent.id, child.id, grandchild.id]));
  });

  it('emits events on task lifecycle changes', () => {
    const dir = createTempDir('forge-task-events-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });
    const events: string[] = [];

    manager.on('task:created', () => events.push('created'));
    manager.on('task:status', () => events.push('status'));

    manager.create('Event test');
    assert.ok(events.includes('created'));
  });

  it('defers a write-locked task without spinning or stalling the queue', async () => {
    const dir = createTempDir('forge-lock-');
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const callModel = () => ({
      async *getTextStream() {
        await gate;
        yield 'done';
      },
      async getText() {
        await gate;
        return 'done';
      },
      async getUsage() {
        return { inputTokens: 1, outputTokens: 1, cost: 0 };
      },
      async *getReasoningStream() {},
      async *getToolCallsStream() {},
    });

    const manager = new TaskManager({
      concurrency: 2,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel,
    });

    try {
      const first = manager.create('Hold the write lock', { cwd: dir, isolation: 'shared' });
      await waitFor(() => manager.get(first.id)?.status === 'running', 3000, 'first task to start');

      // Creating a second write-capable task must return immediately even though
      // the first one owns the repository write lock.
      const second = manager.create('Wait behind the lock', { cwd: dir, isolation: 'shared' });
      assert.equal(manager.get(second.id)?.status, 'queued');

      release();
      await waitFor(() => manager.get(second.id)?.status === 'done', 5000, 'second task to finish');
    } finally {
      release();
      await manager.shutdown({ graceMs: 500 });
    }
  });

  it('starts tasks that were queued by a previous process', async () => {
    const dir = createTempDir('forge-resume-queue-');
    const tasksDir = path.join(dir, 'tasks');
    const first = new TaskManager({ concurrency: 0, repoCwd: dir, tasksDir });
    const queued = first.create('Survive a restart', { cwd: dir, isolation: 'shared' });
    assert.equal(queued.status, 'queued');
    await first.shutdown({ graceMs: 0 });

    const second = new TaskManager({
      concurrency: 1,
      repoCwd: dir,
      tasksDir,
      callModel: createFakeModelCall(),
    });
    try {
      assert.equal(second.get(queued.id)?.status, 'queued');
      second.start();
      await waitFor(() => second.get(queued.id)?.status === 'done', 5000, 'restored task to finish');
    } finally {
      await second.shutdown({ graceMs: 500 });
    }
  });

  it('reloads persisted task logs without reusing sequence numbers', async () => {
    const dir = createTempDir('forge-log-history-');
    const tasksDir = path.join(dir, 'tasks');
    const first = new TaskManager({ concurrency: 0, repoCwd: dir, tasksDir });
    const task = first.create('Keep my log', { cwd: dir, isolation: 'shared' });
    first.log(task.id, { type: 'info', content: 'before restart' });
    await first.shutdown({ graceMs: 0 });

    const second = new TaskManager({ concurrency: 0, repoCwd: dir, tasksDir });
    try {
      const restored = second.getLog(task.id);
      assert.equal(restored.length, 1);
      assert.equal(restored[0]?.content, 'before restart');
      assert.equal(restored[0]?.seq, 1);

      second.log(task.id, { type: 'info', content: 'after restart' });
      const merged = second.getLog(task.id);
      assert.deepEqual(
        merged.map(entry => entry.content),
        ['before restart', 'after restart'],
      );
      assert.deepEqual(
        merged.map(entry => entry.seq),
        [1, 2],
      );
    } finally {
      await second.shutdown({ graceMs: 0 });
    }
  });

  it('lets a write-capable child run while its parent waits at concurrency 1', async () => {
    const dir = createTempDir('forge-wait-');
    const tasksDir = path.join(dir, 'tasks');
    const parentGoal = 'parent waits for child';
    const childGoal = 'child shares the working tree';

    let parentCwd = '';
    let childCwd = '';

    const callModel = (request: { input?: string }) => ({
      async *getTextStream() {
        if (request.input === parentGoal) {
          // Let create() return before the parent schedules any work.
          await new Promise(resolve => setTimeout(resolve, 0));
          const current = manager!;
          const parent = current.list().find(task => task.goal === parentGoal)!;
          const child = await current.spawnChild(parent.id, childGoal, false);
          const results = await current.waitForChildren(parent.id, [child.id]);
          assert.equal(results[0]?.status, 'done');
          parentCwd = current.get(parent.id)!.cwd;
          childCwd = current.get(child.id)!.cwd;
        }
        yield 'done';
      },
      async getText() {
        return 'done';
      },
      async getUsage() {
        return { inputTokens: 1, outputTokens: 1, cost: 0 };
      },
      async *getReasoningStream() {},
      async *getToolCallsStream() {},
    });

    const manager = new TaskManager({ concurrency: 1, repoCwd: dir, tasksDir, callModel });

    try {
      const parent = manager.create(parentGoal, { cwd: dir, isolation: 'shared' });
      await waitFor(() => manager.get(parent.id)?.status === 'done', 5000, 'parent and child to finish');

      const child = manager.list().find(task => task.goal === childGoal)!;
      assert.equal(child.status, 'done');
      assert.equal(child.parentId, parent.id);
      assert.equal(child.isolation, 'shared');
      assert.equal(parentCwd, dir);
      assert.equal(childCwd, dir);
    } finally {
      await manager.shutdown({ graceMs: 500 });
    }
  });

  it('gives write-capable children the parent cwd and shared isolation', async () => {
    const dir = createTempDir('forge-child-shared-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });

    try {
      const parent = manager.create('Write-capable parent', {
        cwd: dir,
        isolation: 'worktree',
        policy: 'ask',
      });
      const child = await manager.spawnChild(parent.id, 'Write-capable child', false);
      const childTask = manager.get(child.id)!;

      assert.equal(childTask.cwd, parent.cwd);
      assert.equal(childTask.isolation, 'shared');
      assert.notEqual(childTask.policy, 'read_only');
    } finally {
      await manager.shutdown({ graceMs: 0 });
    }
  });
});

describe('Phase 5: Approvals Inbox & Policies', () => {
  it('read_only policy exposes only read tools', () => {
    const ctx = createMockContext({ policy: 'read_only' });
    const tools = createTools(ctx);
    const names = tools.map(t => t.function.name);

    assert.ok(names.includes('read_file'));
    assert.ok(names.includes('search_code'));
    assert.ok(names.includes('git_status'));
    assert.ok(names.includes('git_diff'));
    assert.ok(!names.includes('write_file'));
    assert.ok(!names.includes('run_bash'));
    assert.ok(!names.includes('git_commit'));
  });

  it('identifies allowlisted shell commands', () => {
    assert.equal(isAllowlistedCommand('npm test'), true);
    assert.equal(isAllowlistedCommand('pnpm build'), true);
    assert.equal(isAllowlistedCommand('git status'), true);
    assert.equal(isAllowlistedCommand('pytest tests/'), true);
    assert.equal(isAllowlistedCommand('rm -rf /'), false);
    assert.equal(isAllowlistedCommand('curl http://evil.com'), false);
  });

  it('auto_in_worktree auto-approves writes inside cwd', async () => {
    const dir = createTempDir();
    const ctx = createMockContext({
      policy: 'auto_in_worktree',
      cwd: dir,
      taskId: 'task-1',
    });

    let executed = false;
    await executeWithPolicy(ctx, 'write', 'write_file', { path: path.join(dir, 'test.txt') }, () => {
      executed = true;
      return 'done';
    });

    assert.equal(executed, true);
  });

  it('ask policy requests approval for write operations', async () => {
    let approvalRequested = false;
    const ctx = createMockContext({
      policy: 'ask',
      requestApproval: async () => {
        approvalRequested = true;
        return true;
      },
    });

    let executed = false;
    await executeWithPolicy(ctx, 'write', 'write_file', { path: 'test.txt' }, () => {
      executed = true;
      return 'done';
    });

    assert.equal(approvalRequested, true);
    assert.equal(executed, true);
  });

  it('denied approval returns error object', async () => {
    const ctx = createMockContext({
      policy: 'ask',
      requestApproval: async () => false, // Denied
    });

    const result = await executeWithPolicy(ctx, 'write', 'write_file', { path: 'test.txt' }, () => {
      return 'should not run';
    });

    assert.deepEqual(result, { error: 'User denied this action.' });
  });

  it('manager manages approval requests and resolution', async () => {
    const dir = createTempDir('forge-task-approvals-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
      callModel: createFakeModelCall(),
    });
    const task = manager.create('Approval test');
    task.status = 'running';

    const approvalPromise = manager.requestApproval(task.id, {
      tool: 'run_bash',
      summary: 'Run rm -rf',
      risk: 'exec',
      args: { command: 'rm -rf' },
      cwd: task.cwd,
    });

    assert.equal(task.status, 'waiting_approval');
    const pending = manager.listApprovals();
    assert.equal(pending.length, 1);

    manager.resolveApproval(pending[0]!.id, 'approve');
    const approved = await approvalPromise;
    assert.equal(approved, true);
    assert.equal(task.status, 'running');
  });

  it('switches approval policy at runtime and enforces safety guards', async () => {
    const dir = createTempDir('forge-policy-switch-');
    const manager = new TaskManager({
      concurrency: 0,
      repoCwd: dir,
      tasksDir: path.join(dir, 'tasks'),
    });

    try {
      const task = manager.create('Switchable task');
      assert.equal(task.policy, 'ask');

      manager.setPolicy(task.id, 'auto_in_worktree');
      assert.equal(manager.get(task.id)?.policy, 'auto_in_worktree');

      manager.setPolicy(task.id, 'ask');
      assert.equal(manager.get(task.id)?.policy, 'ask');

      const shared = manager.create('Shared task', { isolation: 'shared' });
      assert.throws(() => manager.setPolicy(shared.id, 'auto_in_worktree'), /shared isolation/);

      const readOnly = manager.create('Read-only task', { readOnly: true });
      assert.equal(readOnly.policy, 'read_only');
      assert.throws(() => manager.setPolicy(readOnly.id, 'ask'), /read-only/);

      const active = manager.create('Active task');
      active.status = 'running';
      assert.throws(() => manager.setPolicy(active.id, 'read_only'), /active/);
    } finally {
      await manager.shutdown({ graceMs: 0 });
    }
  });
});

describe('Phase 6: Git Worktree Isolation & Review', () => {
  it('creates worktree on an agent/ branch', () => {
    const repoDir = initTempGitRepo();
    const taskId = `task_${Date.now()}_test`;

    const info = createWorktree(taskId, 'Add feature X', repoDir);

    assert.ok(info.branch.startsWith('agent/task-'));
    assert.ok(fs.existsSync(info.path));

    // Cleanup
    removeWorktree(info, repoDir, true);
  });

  it('checkpointCommit commits uncommitted changes', () => {
    const repoDir = initTempGitRepo();
    const taskId = `task_${Date.now()}_commit`;

    const info = createWorktree(taskId, 'Edit files', repoDir);
    fs.writeFileSync(path.join(info.path, 'newfile.txt'), 'Hello world');

    checkpointCommit(info, 'task commit: newfile added');
    assert.equal(hasChangesFromBase(info), true);

    // Cleanup
    removeWorktree(info, repoDir, true);
  });

  it('getDiff produces diff against baseRef', async () => {
    const repoDir = initTempGitRepo();
    const taskId = `task_${Date.now()}_diff`;

    const info = createWorktree(taskId, 'Diff test', repoDir);
    fs.writeFileSync(path.join(info.path, 'diff_test.txt'), 'New content\n');
    checkpointCommit(info, 'task: add diff test');

    const diff = await getDiff(info);
    assert.ok(diff.diff.includes('diff_test.txt'));
    assert.equal(diff.commits.length, 1);

    // Cleanup
    removeWorktree(info, repoDir, true);
  });

  it('clean mergeWorktree merges branch into main and deletes worktree', async () => {
    const repoDir = initTempGitRepo();
    const taskId = `task_${Date.now()}_merge`;

    const info = createWorktree(taskId, 'Merge test', repoDir);
    fs.writeFileSync(path.join(info.path, 'merged_file.txt'), 'Merge content\n');
    checkpointCommit(info, 'task: merge test');

    const result = await mergeWorktree(info, repoDir);
    assert.equal(result.success, true);

    // File should now be in main repo
    assert.ok(fs.existsSync(path.join(repoDir, 'merged_file.txt')));
  });

  it('refuses to remove non-agent/ branches', () => {
    const repoDir = initTempGitRepo();
    const fakeInfo = {
      path: path.join(os.homedir(), '.forge', 'worktrees', 'fake'),
      branch: 'main', // Non-agent branch!
      baseRef: 'abc',
      baseBranch: 'main',
    };

    assert.throws(() => removeWorktree(fakeInfo, repoDir), /Refusing to remove non-agent branch/);
  });
});

describe('Security & Hygiene', () => {
  it('atomic persistence round-trips correctly', () => {
    const dir = createTempDir('forge-persist-');
    const tasksDir = path.join(dir, 'tasks');
    const task = createTask('persist_test', 'Test goal');
    saveTaskIndex({ version: 1, tasks: [task] }, tasksDir);

    const loaded = loadTaskIndex(tasksDir);
    assert.ok(loaded);
    assert.equal(loaded.tasks.length >= 1, true);
    const found = loaded.tasks.find(t => t.id === 'persist_test');
    assert.ok(found);
    assert.equal(found.goal, 'Test goal');
  });

  it('scopes task indexes to the directory Forge was opened in', async t => {
    const firstRepo = createTempDir('forge-project-a-');
    const secondRepo = createTempDir('forge-project-b-');
    const first = new TaskManager({ concurrency: 0, repoCwd: firstRepo });
    const second = new TaskManager({ concurrency: 0, repoCwd: secondRepo });
    t.after(async () => {
      await first.shutdown({ graceMs: 0 });
      await second.shutdown({ graceMs: 0 });
    });

    const firstTask = first.create('First project task', { isolation: 'shared' });
    second.create('Second project task', { isolation: 'shared' });

    await first.shutdown({ graceMs: 0 });
    await second.shutdown({ graceMs: 0 });

    const firstIndex = loadTaskIndex(getProjectPaths(firstRepo).tasksDir);
    const secondIndex = loadTaskIndex(getProjectPaths(secondRepo).tasksDir);
    assert.deepEqual(
      firstIndex?.tasks.map(task => task.id),
      [firstTask.id],
    );
    assert.deepEqual(
      secondIndex?.tasks.map(task => task.goal),
      ['Second project task'],
    );
  });

  it('logs append and load correctly', () => {
    const dir = createTempDir('forge-persist-log-');
    const tasksDir = path.join(dir, 'tasks');
    const taskId = `log_test_${Date.now()}`;
    const entry: LogEntry = {
      seq: 1,
      timestamp: Date.now(),
      type: 'info',
      content: 'Test log entry',
    };

    appendTaskLog(taskId, entry, tasksDir);
    const loaded = loadTaskLog(taskId, { tasksDir });
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.content, 'Test log entry');
  });
});
