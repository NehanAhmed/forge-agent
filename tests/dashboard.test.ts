import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from 'ink-testing-library';
import { Dashboard } from '../src/cli/components/dashboard/Dashboard.js';
import { createTask, type Task } from '../src/core/task.js';
import type { TaskEvent, TaskClient } from '../src/core/task-client.js';
import type { LogEntry } from '../src/core/context.js';
import type { Approval } from '../src/core/task-manager.js';
import type { TaskDiff, MergeResult } from '../src/core/worktree.js';

function task(id: string, goal: string, displayId: string, createdAt: number): Task {
  const created = createTask(id, goal, { displayId });
  created.createdAt = createdAt;
  created.status = 'done';
  created.usage = { inputTokens: 10, outputTokens: 5, cost: 0.01, requests: 1 };
  return created;
}

class MockClient implements TaskClient {
  readonly tasks: Task[];
  readonly logs = new Map<string, LogEntry[]>();
  readonly handlers = new Set<(event: TaskEvent) => void>();
  readonly approvals: Approval[] = [];
  readonly resolved: Array<{ approvalId: string; decision: 'approve' | 'deny' }> = [];

  constructor(tasks: Task[]) {
    this.tasks = tasks;
    for (const item of tasks) {
      this.logs.set(item.id, [
        {
          seq: 1,
          timestamp: Date.now(),
          type: 'assistant',
          content: `log for ${item.goal}`,
        },
      ]);
    }
  }

  async createTask(goal: string): Promise<Task> {
    const created = task(`task_${this.tasks.length + 1}`, goal, String(this.tasks.length + 1), Date.now());
    this.tasks.push(created);
    return created;
  }

  async listTasks(): Promise<Task[]> {
    return [...this.tasks].sort((a, b) => b.createdAt - a.createdAt);
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.find(item => item.id === id);
  }

  async getLog(id: string): Promise<LogEntry[]> {
    return this.logs.get(id) ?? [];
  }

  async cancelTask(): Promise<void> {}
  async resumeTask(): Promise<Task> {
    throw new Error('not implemented');
  }
  async listApprovals(): Promise<Approval[]> {
    return this.approvals;
  }
  async resolveApproval(approvalId: string, decision: 'approve' | 'deny'): Promise<void> {
    this.resolved.push({ approvalId, decision });
  }
  async getDiff(): Promise<TaskDiff> {
    return { files: [], diff: '', baseRef: 'main' };
  }
  async mergeTask(): Promise<MergeResult> {
    return { success: true };
  }
  async discardTask(): Promise<void> {}

  subscribe(handler: (event: TaskEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

function wait(ms = 20): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForFrame(
  instance: { lastFrame: () => string | undefined },
  text: string,
  timeoutMs = 2000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((instance.lastFrame() ?? '').includes(text)) return true;
    await wait(50);
  }
  return false;
}

describe('Dashboard', () => {
  it('selects the newest task and updates the detail pane with arrows', async () => {
    const older = task('task_a', 'Older goal', '1', 1_000);
    const newer = task('task_b', 'Newer goal', '2', 2_000);
    const client = new MockClient([older, newer]);
    const instance = render(React.createElement(Dashboard, { client }));

    try {
      assert.ok(await waitForFrame(instance, 'log for Newer goal'));
      const initial = instance.lastFrame() ?? '';
      assert.ok(initial.includes('Newer goal'));
      assert.ok(initial.includes('#2'));

      instance.stdin.write('\u001B[A'); // up arrow
      assert.ok(await waitForFrame(instance, 'log for Older goal'));
      const moved = instance.lastFrame() ?? '';
      assert.ok(moved.includes('log for Older goal'));
      assert.ok(!moved.includes('log for Newer goal'));
    } finally {
      instance.unmount();
    }
  });

  it('opens help only from list focus, never while typing', async () => {
    const client = new MockClient([task('task_a', 'A goal', '1', 1_000)]);
    const instance = render(React.createElement(Dashboard, { client }));

    try {
      await wait(100);
      instance.stdin.write('?');
      await wait(100);
      assert.ok(!(instance.lastFrame() ?? '').includes('Keyboard'));

      instance.stdin.write('\t');
      await wait(100);
      instance.stdin.write('?');
      assert.ok(await waitForFrame(instance, 'Keyboard'));
    } finally {
      instance.unmount();
    }
  });

  it('asks for confirmation before cancelling', async () => {
    const running = task('task_a', 'A goal', '1', 1_000);
    running.status = 'running';
    const client = new MockClient([running]);
    const instance = render(React.createElement(Dashboard, { client }));

    try {
      await wait(100);
      instance.stdin.write('\t');
      await wait(50);
      instance.stdin.write('c');
      assert.ok(await waitForFrame(instance, 'Cancel'));
      const frame = instance.lastFrame() ?? '';
      assert.ok(frame.includes('y confirm'));
    } finally {
      instance.unmount();
    }
  });

  it('requires y before approving all pending actions', async () => {
    const waiting = task('task_a', 'Needs approval', '1', 1_000);
    waiting.status = 'waiting_approval';
    const client = new MockClient([waiting]);
    client.approvals.push({
      id: 'approval_1',
      taskId: waiting.id,
      tool: 'run_bash',
      summary: 'npm test',
      risk: 'medium',
      args: { command: 'npm test' },
      cwd: process.cwd(),
      createdAt: Date.now(),
      resolver: () => {},
    });
    const instance = render(React.createElement(Dashboard, { client }));

    try {
      await wait(100);
      instance.stdin.write('\t');
      await wait(50);
      instance.stdin.write('a');
      assert.ok(await waitForFrame(instance, 'Approvals'));

      instance.stdin.write('A');
      assert.ok(await waitForFrame(instance, 'Approve all 1 pending action? y / n'));

      instance.stdin.write('\r');
      await wait(100);
      assert.equal(client.resolved.length, 0);
      assert.ok((instance.lastFrame() ?? '').includes('Approve all'));

      instance.stdin.write('y');
      assert.ok(await waitForFrame(instance, 'Approved 1 pending action'));
      assert.deepEqual(client.resolved, [{ approvalId: 'approval_1', decision: 'approve' }]);
    } finally {
      instance.unmount();
    }
  });
});
