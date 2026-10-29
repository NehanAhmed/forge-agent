import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCost, formatDuration, joinMeta, statusLabel, taskElapsed, timeLabel } from '../../../src/ui/format.js';
import { createTask } from '../../../src/core/task.js';

describe('UI formatting', () => {
  it('formats durations at each boundary', () => {
    assert.equal(formatDuration(0), '0s');
    assert.equal(formatDuration(999), '0s');
    assert.equal(formatDuration(1_000), '1s');
    assert.equal(formatDuration(59_999), '59s');
    assert.equal(formatDuration(60_000), '1m 00s');
    assert.equal(formatDuration(64_000), '1m 04s');
    assert.equal(formatDuration(3_600_000), '1h 00m');
    assert.equal(formatDuration(7_500_000), '2h 05m');
    assert.equal(formatDuration(-1), '0s');
    assert.equal(formatDuration(Number.NaN), '0s');
  });

  it('freezes elapsed time for terminal tasks', () => {
    const task = createTask('t', 'goal');
    task.startedAt = 1_000;
    task.status = 'running';
    assert.equal(taskElapsed(task, 5_000), 4_000);

    task.status = 'done';
    task.finishedAt = 3_000;
    assert.equal(taskElapsed(task, 9_000), 2_000);

    task.startedAt = undefined;
    assert.equal(taskElapsed(task, 9_000), null);
  });

  it('formats cost, labels, meta, and timestamps', () => {
    assert.equal(formatCost(0), '');
    assert.equal(formatCost(-1), '');
    assert.equal(formatCost(Number.NaN), '');
    assert.equal(formatCost(0.0012), '$0.001');
    assert.equal(formatCost(0.5), '$0.50');
    assert.equal(statusLabel('waiting_approval'), 'waiting');
    assert.equal(statusLabel('done'), 'done');
    assert.equal(joinMeta(['1m', undefined, false, '2.5k']), '1m · 2.5k');
    assert.match(timeLabel(Date.UTC(2026, 0, 1, 12, 34, 56)), /^\d{2}:\d{2}:\d{2}$/);
  });
});
