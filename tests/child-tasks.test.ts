import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assignDisplayId, enforceSpawnLimits, stricterPolicy, parseTaskRef, resolveTaskByIdOrDisplay } from '../src/core/tree.js';
import type { Task } from '../src/core/task.js';

describe('Child Tasks Pure Logic', () => {
  describe('assignDisplayId', () => {
    it('assigns root id starting from 1', () => {
      const tasks: Task[] = [];
      assert.equal(assignDisplayId(tasks), '1');
    });

    it('assigns root id sequentially', () => {
      const t1 = { id: 't1', displayId: '1' } as Task;
      const t2 = { id: 't2', displayId: '2' } as Task;
      assert.equal(assignDisplayId([t1, t2]), '3');
    });

    it('assigns child id based on parent', () => {
      const root = { id: 'r1', displayId: '1', parentId: undefined } as Task;
      const child1 = { id: 'c1', displayId: '1.1', parentId: 'r1' } as Task;
      assert.equal(assignDisplayId([root, child1], 'r1'), '1.2');
    });
  });

  describe('enforceSpawnLimits', () => {
    it('allows spawn when under limits', () => {
      const limits = { maxDepth: 2, maxChildrenPerTask: 4, maxTasksPerTree: 10 };
      assert.equal(enforceSpawnLimits([], undefined, limits, 1).ok, true);
    });

    it('rejects when depth exceeds limit', () => {
      const limits = { maxDepth: 1, maxChildrenPerTask: 4, maxTasksPerTree: 10 };
      const result = enforceSpawnLimits([], undefined, limits, 2);
      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('max depth'));
    });

    it('rejects when children limit reached', () => {
      const limits = { maxDepth: 3, maxChildrenPerTask: 2, maxTasksPerTree: 10 };
      const parent = { id: 'p1', depth: 0, treeId: 'p1' } as Task;
      const child1 = { id: 'c1', parentId: 'p1' } as Task;
      const child2 = { id: 'c2', parentId: 'p1' } as Task;
      const result = enforceSpawnLimits([parent, child1, child2], parent, limits, 1);
      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('already has 2 children'));
    });

    it('rejects when tree size limit reached', () => {
      const limits = { maxDepth: 3, maxChildrenPerTask: 5, maxTasksPerTree: 3 };
      const parent = { id: 'p1', depth: 0, treeId: 'p1' } as Task;
      const child1 = { id: 'c1', parentId: 'p1', treeId: 'p1' } as Task;
      const child2 = { id: 'c2', parentId: 'p1', treeId: 'p1' } as Task;
      const result = enforceSpawnLimits([parent, child1, child2], parent, limits, 1);
      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('tree limit of 3'));
    });
  });

  describe('stricterPolicy', () => {
    it('returns read_only when either is read_only', () => {
      assert.equal(stricterPolicy('read_only', 'ask'), 'read_only');
      assert.equal(stricterPolicy('ask', 'read_only'), 'read_only');
    });

    it('returns ask when either is ask and other is auto_in_worktree', () => {
      assert.equal(stricterPolicy('ask', 'auto_in_worktree'), 'ask');
      assert.equal(stricterPolicy('auto_in_worktree', 'ask'), 'ask');
    });

    it('returns auto_in_worktree only when both are auto_in_worktree', () => {
      assert.equal(stricterPolicy('auto_in_worktree', 'auto_in_worktree'), 'auto_in_worktree');
    });
  });

  describe('parseTaskRef', () => {
    it('parses plain numbers', () => {
      assert.equal(parseTaskRef('1'), '1');
      assert.equal(parseTaskRef('3'), '3');
    });

    it('parses with hash prefix', () => {
      assert.equal(parseTaskRef('#3'), '3');
    });

    it('parses nested IDs', () => {
      assert.equal(parseTaskRef('3.1'), '3.1');
      assert.equal(parseTaskRef('#3.1.2'), '3.1.2');
    });

    it('returns null for invalid refs', () => {
      assert.equal(parseTaskRef('abc'), null);
      assert.equal(parseTaskRef('1.2.3.'), null);
    });
  });

  describe('resolveTaskByIdOrDisplay', () => {
    it('finds by displayId', () => {
      const t1 = { id: 'task-1', displayId: '1', goal: 'Test' } as Task;
      const t2 = { id: 'task-2', displayId: '2', goal: 'Test 2' } as Task;
      const result = resolveTaskByIdOrDisplay([t1, t2], '2');
      assert.equal(result!.id, 'task-2');
    });

    it('finds by id', () => {
      const t1 = { id: 'task-1', displayId: '1' } as Task;
      const result = resolveTaskByIdOrDisplay([t1], 'task-1');
      assert.equal(result!.id, 'task-1');
    });
  });
});
