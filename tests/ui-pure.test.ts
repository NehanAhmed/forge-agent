import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../src/ui/parser.js';
import { buildTree, getVisibleRows } from '../src/ui/tree-builder.js';
import { windowEntries } from '../src/ui/log-window.js';
import { getStatusGlyph, needsAttention } from '../src/ui/status-glyphs.js';
import { createTask } from '../src/core/task.js';

describe('UI Pure Modules', () => {
  describe('Command Parser', () => {
    it('parses plain text as create command', () => {
      const res = parseCommand('Add dark mode to settings');
      assert.deepEqual(res, { kind: 'create', goal: 'Add dark mode to settings' });
    });

    it('parses /open with numeric or hash ref', () => {
      assert.deepEqual(parseCommand('/open 3'), { kind: 'open', target: '3' });
      assert.deepEqual(parseCommand('/open #3.1'), { kind: 'open', target: '3.1' });
    });

    it('parses /cancel', () => {
      assert.deepEqual(parseCommand('/cancel #2'), { kind: 'cancel', target: '2' });
    });

    it('parses /approve and /approve all', () => {
      assert.deepEqual(parseCommand('/approve 1'), { kind: 'approve', target: '1' });
      assert.deepEqual(parseCommand('/approve all'), { kind: 'approve_all' });
    });

    it('parses /deny', () => {
      assert.deepEqual(parseCommand('/deny 3.2'), { kind: 'deny', target: '3.2' });
    });

    it('parses /diff, /merge, /discard, /resume', () => {
      assert.deepEqual(parseCommand('/diff 4'), { kind: 'diff', target: '4' });
      assert.deepEqual(parseCommand('/merge 4'), { kind: 'merge', target: '4' });
      assert.deepEqual(parseCommand('/discard 4'), { kind: 'discard', target: '4' });
      assert.deepEqual(parseCommand('/resume 4'), { kind: 'resume', target: '4' });
    });

    it('parses /collapse and /expand', () => {
      assert.deepEqual(parseCommand('/collapse 1'), { kind: 'collapse', target: '1' });
      assert.deepEqual(parseCommand('/expand 1'), { kind: 'expand', target: '1' });
    });

    it('parses /help and /quit', () => {
      assert.deepEqual(parseCommand('/help'), { kind: 'help' });
      assert.deepEqual(parseCommand('/quit'), { kind: 'quit' });
      assert.deepEqual(parseCommand('/exit'), { kind: 'quit' });
    });

    it('parses /new with flags', () => {
      const res = parseCommand('/new --read-only --shared --policy auto_in_worktree Run tests');
      assert.deepEqual(res, {
        kind: 'new',
        options: { readOnly: true, shared: true, policy: 'auto_in_worktree' },
        goal: 'Run tests',
      });
    });

    it('rejects unknown /new flags and unsupported policies', () => {
      assert.equal(parseCommand('/new --unknown Run tests').kind, 'unknown');
      assert.equal(parseCommand('/new --policy unsafe Run tests').kind, 'unknown');
    });

    it('returns error on unknown command or missing args', () => {
      const res1 = parseCommand('/foo bar');
      assert.equal(res1.kind, 'unknown');
      const res2 = parseCommand('/open');
      assert.equal(res2.kind, 'unknown');
    });
  });

  describe('Tree Builder', () => {
    it('nests child tasks and calculates aggregates', () => {
      const root = createTask('task-1', 'Root Goal', { displayId: '1' });
      const child = createTask('task-2', 'Child Goal', { parentId: 'task-1', depth: 1, displayId: '1.1' });
      child.usage.cost = 0.05;
      root.usage.cost = 0.02;

      const tree = buildTree([root, child]);
      assert.equal(tree.length, 1);
      assert.equal(tree[0]!.descendantCount, 1);
      assert.equal(Math.round(tree[0]!.totalCost * 100) / 100, 0.07);

      const rows = getVisibleRows(tree, new Set());
      assert.equal(rows.length, 2);
      assert.equal(rows[0]!.depth, 0);
      assert.equal(rows[1]!.depth, 1);

      // Collapsed
      const collapsedRows = getVisibleRows(tree, new Set(['task-1']));
      assert.equal(collapsedRows.length, 1);
      assert.equal(collapsedRows[0]!.isCollapsed, true);
    });
  });

  describe('Log Windowing', () => {
    it('windows large entry lists and follows tail', () => {
      const entries = Array.from({ length: 2500 }, (_, i) => ({
        seq: i + 1,
        timestamp: Date.now(),
        type: 'info' as const,
        content: `Log line ${i}`,
      }));

      const res = windowEntries(entries, { windowSize: 2000, followTail: true });
      assert.equal(res.visible.length, 2000);
      assert.equal(res.atBottom, true);
      assert.equal(res.hasNewBelow, false);
      assert.equal(res.visible[1999]!.seq, 2500);

      const scrolled = windowEntries(entries, { windowSize: 2000, scrollOffset: 300, followTail: false });
      assert.equal(scrolled.visible.length, 2000);
      assert.equal(scrolled.atBottom, false);
      assert.equal(scrolled.hasNewBelow, true);
    });
  });

  describe('Status Glyphs & Attention', () => {
    it('returns glyphs and fallbacks correctly', () => {
      assert.equal(getStatusGlyph('running'), '▶');
      assert.equal(getStatusGlyph('running', true), '>');
      assert.equal(getStatusGlyph('done'), '✓');
      assert.equal(getStatusGlyph('waiting_approval'), '⚠');
    });

    it('identifies tasks needing attention', () => {
      const t1 = createTask('t1', 'g1');
      assert.equal(needsAttention(t1), false);
      t1.status = 'waiting_approval';
      assert.equal(needsAttention(t1), true);
      t1.status = 'done';
      t1.reviewState = 'pending_review';
      assert.equal(needsAttention(t1), true);
    });
  });
});
