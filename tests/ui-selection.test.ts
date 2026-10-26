import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampScroll,
  clampTop,
  edgeSelection,
  ensureVisible,
  filterRows,
  moveSelection,
  nearestVisible,
  pickInitialSelection,
} from '../src/ui/selection.js';
import { createTask } from '../src/core/task.js';

function row(id: string, overrides: Partial<ReturnType<typeof createTask>> = {}) {
  return { task: { ...createTask(id, `goal ${id}`), ...overrides } };
}

describe('UI Selection', () => {
  const rows = [row('a'), row('b'), row('c')];

  it('moves and clamps selection by stable id', () => {
    assert.equal(moveSelection(rows, 'b', 1), 'c');
    assert.equal(moveSelection(rows, 'c', 1), 'c');
    assert.equal(moveSelection(rows, 'a', -1), 'a');
    assert.equal(moveSelection(rows, 'missing', 1), 'a');
    assert.equal(moveSelection(rows, 'missing', -1), 'c');
    assert.equal(moveSelection([], 'a', 1), null);
  });

  it('selects edges and the newest visible task', () => {
    assert.equal(edgeSelection(rows, 'first'), 'a');
    assert.equal(edgeSelection(rows, 'last'), 'c');
    assert.equal(pickInitialSelection(rows, ['z', 'b', 'a']), 'b');
    assert.equal(pickInitialSelection(rows, ['z']), 'a');
    assert.equal(pickInitialSelection([], ['a']), null);
  });

  it('keeps the selected row visible while scrolling', () => {
    assert.equal(ensureVisible(0, 5, 10), 0);
    assert.equal(ensureVisible(4, 5, 10), 4);
    assert.equal(ensureVisible(9, 5, 10), 5);
    assert.equal(ensureVisible(20, 5, 10), 11);
    assert.equal(clampTop(100, 30, 10), 20);
    assert.equal(clampTop(-5, 30, 10), 0);
    assert.equal(clampScroll(100, 30, 10), 20);
    assert.equal(clampScroll(-1, 30, 10), 0);
  });

  it('filters by active and attention states', () => {
    const active = row('r', { status: 'running' });
    const failed = row('f', { status: 'failed' });
    const review = row('v', { status: 'done', reviewState: 'pending_review' });
    const done = row('d', { status: 'done' });
    const all = [active, failed, review, done];

    assert.deepEqual(filterRows(all, 'all').map(r => r.task.id), ['r', 'f', 'v', 'd']);
    assert.deepEqual(filterRows(all, 'active').map(r => r.task.id), ['r']);
    assert.deepEqual(filterRows(all, 'attention').map(r => r.task.id), ['f', 'v']);
  });

  it('falls back to the nearest visible ancestor when a row is hidden', () => {
    const root = createTask('root', 'root');
    const child = createTask('child', 'child', { parentId: 'root' });
    const grandchild = createTask('grandchild', 'grandchild', { parentId: 'child' });
    const tasks = [root, child, grandchild];
    const visible = [{ task: root }];

    assert.equal(nearestVisible(visible, tasks, 'grandchild'), 'root');
    assert.equal(nearestVisible([{ task: root }, { task: child }], tasks, 'child'), 'child');
    assert.equal(nearestVisible(visible, tasks, 'missing'), 'root');
  });
});
