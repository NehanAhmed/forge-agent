import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { TaskManager } from '../../../src/core/task-manager.js';
import { InProcessTaskClient } from '../../../src/core/task-client.js';
import { tempDir } from '../../helpers/temp.js';

function createManager(t: Parameters<typeof tempDir>[0]): TaskManager {
  const root = tempDir(t, 'forge-client-');
  return new TaskManager({
    concurrency: 0,
    repoCwd: root,
    tasksDir: path.join(root, 'tasks'),
  });
}

describe('in-process task client', () => {
  it('bridges manager events and supports unsubscribe', async t => {
    const manager = createManager(t);
    const client = new InProcessTaskClient(manager);
    const events: string[] = [];
    const unsubscribe = client.subscribe(event => events.push(event.type));

    const task = await client.createTask('A goal');
    assert.equal(task.status, 'queued');
    assert.ok(events.includes('task:created'));

    unsubscribe();
    await client.createTask('Another goal');
    assert.equal(events.filter(type => type === 'task:created').length, 1);

    await manager.shutdown({ graceMs: 0 });
  });

  it('delegates reads, logs, approvals, and resume errors', async t => {
    const manager = createManager(t);
    const client = new InProcessTaskClient(manager);
    const task = await client.createTask('A goal');

    assert.deepEqual(await client.listTasks(), [task]);
    assert.equal((await client.getTask(task.id))?.id, task.id);
    assert.equal(await client.getTask('missing'), undefined);
    assert.deepEqual(await client.getLog(task.id), []);
    assert.deepEqual(await client.listApprovals(), []);

    await assert.rejects(() => client.resumeTask(task.id), /Cannot resume task/);
    await client.cancelTask(task.id);
    assert.equal((await client.getTask(task.id))?.status, 'cancelled');

    await client.deleteTask(task.id);
    assert.equal(await client.getTask(task.id), undefined);
    assert.deepEqual(await client.listTasks(), []);

    await manager.shutdown({ graceMs: 0 });
  });
});
