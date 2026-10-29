import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTask, isValidTransition, validateStatusTransition, type TaskStatus } from '../../../src/core/task.js';

const ALL_STATUSES: TaskStatus[] = ['queued', 'running', 'waiting_approval', 'done', 'failed', 'cancelled'];

describe('task model', () => {
  it('creates a task with the documented defaults', () => {
    const task = createTask('task_1', 'Fix the bug');

    assert.equal(task.id, 'task_1');
    assert.equal(task.goal, 'Fix the bug');
    assert.equal(task.status, 'queued');
    assert.equal(task.sessionId, 'task_1');
    assert.equal(task.isolation, 'worktree');
    assert.equal(task.policy, 'ask');
    assert.equal(task.reviewState, 'none');
    assert.equal(task.depth, 0);
    assert.equal(task.treeId, 'task_1');
    assert.equal(task.displayId, '1');
    assert.equal(task.resumable, false);
    assert.deepEqual(task.usage, { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 });
  });

  it('applies explicit options', () => {
    const task = createTask('task_2', 'Child', {
      sessionId: 'session-2',
      cwd: '/tmp/work',
      isolation: 'shared',
      policy: 'read_only',
      parentId: 'parent',
      depth: 2,
      treeId: 'root',
      displayId: '1.2',
    });

    assert.equal(task.sessionId, 'session-2');
    assert.equal(task.cwd, '/tmp/work');
    assert.equal(task.isolation, 'shared');
    assert.equal(task.policy, 'read_only');
    assert.equal(task.parentId, 'parent');
    assert.equal(task.depth, 2);
    assert.equal(task.treeId, 'root');
    assert.equal(task.displayId, '1.2');
  });

  it('allows exactly the documented transitions', () => {
    const allowed: Record<TaskStatus, TaskStatus[]> = {
      queued: ['running', 'cancelled'],
      running: ['waiting_approval', 'done', 'failed', 'cancelled'],
      waiting_approval: ['running', 'cancelled'],
      done: [],
      failed: [],
      cancelled: [],
    };

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        assert.equal(isValidTransition(from, to), allowed[from].includes(to), `${from} -> ${to}`);
      }
    }
  });

  it('returns a helpful error for invalid transitions', () => {
    assert.throws(() => validateStatusTransition('done', 'running'), /Invalid task status transition/);
    assert.throws(() => validateStatusTransition('queued', 'done'), /Allowed transitions from 'queued'/);
    assert.doesNotThrow(() => validateStatusTransition('running', 'done'));
  });
});
