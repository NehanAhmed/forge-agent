import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  appendTaskLog,
  loadTaskIndex,
  loadTaskLog,
  saveTaskIndex,
  getTaskStateDir,
  type TaskIndex,
} from '../../../src/core/persistence.js';
import { createTask } from '../../../src/core/task.js';
import type { LogEntry } from '../../../src/core/context.js';
import { tempDir } from '../../helpers/temp.js';

function logEntry(seq: number, content = `entry ${seq}`): LogEntry {
  return { seq, timestamp: 1_000 + seq, type: 'info', content };
}

describe('task persistence', () => {
  it('round-trips a task index', t => {
    const tasksDir = tempDir(t, 'forge-persist-');
    const index: TaskIndex = { version: 2, tasks: [createTask('task_a', 'Goal A')] };

    saveTaskIndex(index, tasksDir);
    const loaded = loadTaskIndex(tasksDir);

    assert.ok(loaded);
    assert.equal(loaded.version, 2);
    assert.equal(loaded.tasks.length, 1);
    assert.equal(loaded.tasks[0]?.goal, 'Goal A');
    assert.ok(fs.existsSync(path.join(tasksDir, 'tasks.json')));
  });

  it('returns null when the index does not exist', t => {
    const tasksDir = tempDir(t, 'forge-persist-empty-');
    assert.equal(loadTaskIndex(tasksDir), null);
  });

  it('migrates a version 1 index to version 2', t => {
    const tasksDir = tempDir(t, 'forge-persist-v1-');
    const root = createTask('root', 'Root');
    const child = createTask('child', 'Child', { parentId: 'root' });
    const legacyChild = { ...child } as Record<string, unknown>;
    delete legacyChild.displayId;
    delete legacyChild.treeId;
    delete legacyChild.depth;
    const legacy = { version: 1, tasks: [root, legacyChild] } as unknown as TaskIndex;
    fs.writeFileSync(path.join(tasksDir, 'tasks.json'), JSON.stringify(legacy));

    const loaded = loadTaskIndex(tasksDir);

    assert.ok(loaded);
    assert.equal(loaded.version, 2);
    const migratedRoot = loaded.tasks.find(task => task.id === 'root');
    const migratedChild = loaded.tasks.find(task => task.id === 'child');
    assert.equal(migratedRoot?.displayId, '1');
    assert.equal(migratedRoot?.treeId, 'root');
    assert.equal(migratedChild?.displayId, '1.1');
    assert.equal(migratedChild?.treeId, 'root');
    assert.equal(migratedChild?.depth, 1);
  });

  it('backs up corrupt JSON and returns null', t => {
    const tasksDir = tempDir(t, 'forge-persist-corrupt-');
    fs.writeFileSync(path.join(tasksDir, 'tasks.json'), '{not json');
    mock.method(console, 'warn', () => {});

    assert.equal(loadTaskIndex(tasksDir), null);
    const backups = fs.readdirSync(tasksDir).filter(name => name.startsWith('tasks.json.bak.'));
    assert.equal(backups.length, 1);
  });

  it('backs up unsupported index versions', t => {
    const tasksDir = tempDir(t, 'forge-persist-version-');
    fs.writeFileSync(path.join(tasksDir, 'tasks.json'), JSON.stringify({ version: 999, tasks: [] }));
    mock.method(console, 'warn', () => {});

    assert.equal(loadTaskIndex(tasksDir), null);
    const backups = fs.readdirSync(tasksDir).filter(name => name.startsWith('tasks.json.bak.'));
    assert.equal(backups.length, 1);
  });

  it('filters and limits task logs by sequence', t => {
    const tasksDir = tempDir(t, 'forge-persist-log-');
    for (const seq of [1, 2, 3]) appendTaskLog('task_log', logEntry(seq), tasksDir);

    assert.deepEqual(
      loadTaskLog('task_log', { tasksDir }).map(entry => entry.seq),
      [1, 2, 3],
    );
    assert.deepEqual(
      loadTaskLog('task_log', { tasksDir, fromSeq: 2 }).map(entry => entry.seq),
      [2, 3],
    );
    assert.deepEqual(
      loadTaskLog('task_log', { tasksDir, limit: 2 }).map(entry => entry.seq),
      [2, 3],
    );
    assert.deepEqual(loadTaskLog('missing', { tasksDir }), []);
  });

  it('skips malformed log lines instead of dropping the whole log', t => {
    const tasksDir = tempDir(t, 'forge-persist-log-lines-');
    appendTaskLog('task_log', logEntry(1), tasksDir);
    fs.appendFileSync(path.join(tasksDir, 'task_log.log.jsonl'), '{broken\n');
    appendTaskLog('task_log', logEntry(2), tasksDir);

    assert.deepEqual(
      loadTaskLog('task_log', { tasksDir }).map(entry => entry.seq),
      [1, 2],
    );
  });

  it('creates task state directories next to the configured task index', t => {
    const tasksDir = tempDir(t, 'forge-persist-state-');
    const stateDir = getTaskStateDir('task_state', tasksDir);
    assert.equal(stateDir, path.join(tasksDir, 'task_state'));
    assert.ok(fs.existsSync(stateDir));
  });
});
