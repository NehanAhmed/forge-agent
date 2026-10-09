import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// Modules under test
import { resolveSafePath } from '../src/tools/helpers.js';
import { createBudget, BudgetImpl } from '../src/core/budget.js';
import {
  createTask,
  isValidTransition,
  validateStatusTransition,
  type TaskStatus,
} from '../src/core/task.js';
import { TaskManager } from '../src/core/task-manager.js';
import {
  saveTaskIndex,
  loadTaskIndex,
  appendTaskLog,
  loadTaskLog,
} from '../src/core/persistence.js';
import {
  isAllowlistedCommand,
  isPathInside,
  executeWithPolicy,
} from '../src/core/approvals.js';
import { createTools } from '../src/tools/definitions.js';
import { runAgentHeadless } from '../src/core/headless.js';
import type { AgentContext, LogEntry, ApprovalRequest } from '../src/core/context.js';
import {
  createWorktree,
  removeWorktree,
  checkpointCommit,
  hasChangesFromBase,
  getDiff,
  mergeWorktree,
} from '../src/core/worktree.js';

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

function createFakeModelCall(cannedText = 'Task completed successfully', cannedUsage = { inputTokens: 50, outputTokens: 25, cost: 0.001 }) {
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
    assert.throws(
      () => resolveSafePath('../outside.txt', cwd),
      /resolves outside the working directory/
    );
  });

  it('rejects absolute paths outside cwd', () => {
    const cwd = createTempDir();
    const outside = path.resolve(os.tmpdir(), 'definitely-outside.txt');
    assert.throws(
      () => resolveSafePath(outside, cwd),
      /resolves outside the working directory/
    );
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
      log: (entry) => logs.push(entry),
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
    assert.throws(
      () => validateStatusTransition('done', 'running'),
      /Invalid task status transition/
    );
    assert.throws(
      () => validateStatusTransition('cancelled', 'running'),
      /Invalid task status transition/
    );
    assert.throws(
      () => validateStatusTransition('queued', 'done'),
      /Invalid task status transition/
    );
  });
});

describe('Phase 4: TaskManager Queue, Concurrency & Lifecycle', () => {
  it('creates, lists, and gets tasks', () => {
    const manager = new TaskManager({ concurrency: 0, callModel: createFakeModelCall() });
    const t1 = manager.create('First task');
    const t2 = manager.create('Second task');

    assert.ok(manager.get(t1.id));
    assert.ok(manager.get(t2.id));

    const all = manager.list();
    assert.ok(all.length >= 2);
  });

  it('cancelling a queued task removes it and marks it cancelled', async () => {
    const manager = new TaskManager({ concurrency: 0, callModel: createFakeModelCall() }); // Concurrency 0 means nothing runs automatically
    const task = manager.create('Will cancel');
    assert.equal(task.status, 'queued');

    await manager.cancel(task.id);
    assert.equal(manager.get(task.id)?.status, 'cancelled');
  });

  it('resumes an interrupted/failed task back to queued', () => {
    const manager = new TaskManager({ concurrency: 0, callModel: createFakeModelCall() });
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

  it('emits events on task lifecycle changes', () => {
    const manager = new TaskManager({ concurrency: 0, callModel: createFakeModelCall() });
    const events: string[] = [];

    manager.on('task:created', () => events.push('created'));
    manager.on('task:status', () => events.push('status'));

    const task = manager.create('Event test');
    assert.ok(events.includes('created'));
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
    const manager = new TaskManager({ concurrency: 0, callModel: createFakeModelCall() });
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

    assert.throws(
      () => removeWorktree(fakeInfo, repoDir),
      /Refusing to remove non-agent branch/
    );
  });
});

describe('Security & Hygiene', () => {
  it('atomic persistence round-trips correctly', () => {
    const task = createTask('persist_test', 'Test goal');
    saveTaskIndex({ version: 1, tasks: [task] });

    const loaded = loadTaskIndex();
    assert.ok(loaded);
    assert.equal(loaded.tasks.length >= 1, true);
    const found = loaded.tasks.find(t => t.id === 'persist_test');
    assert.ok(found);
    assert.equal(found.goal, 'Test goal');
  });

  it('logs append and load correctly', () => {
    const taskId = `log_test_${Date.now()}`;
    const entry: LogEntry = {
      seq: 1,
      timestamp: Date.now(),
      type: 'info',
      content: 'Test log entry',
    };

    appendTaskLog(taskId, entry);
    const loaded = loadTaskLog(taskId);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.content, 'Test log entry');
  });
});
