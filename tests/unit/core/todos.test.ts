import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractTodosFromState,
  formatTodoListOutput,
  getTodoCounts,
  loadTodos,
  mergeTodosIntoState,
  saveTodos,
  type TodoItem,
} from '../../../src/core/todos.js';
import { tempDir } from '../../helpers/temp.js';

function item(id: string, status: TodoItem['status'] = 'pending', content = `todo ${id}`): TodoItem {
  return { id, content, status };
}

describe('todos', () => {
  it('round-trips todos and creates the sessions directory', t => {
    const dir = path.join(tempDir(t, 'forge-todos-'), 'nested', 'sessions');
    const items = [item('1', 'completed'), item('2', 'in_progress'), item('3')];

    const saved = saveTodos('session-1', items, dir);
    assert.equal(saved.items.length, 3);
    assert.ok(fs.existsSync(path.join(dir, 'session-1.todos.json')));

    const loaded = loadTodos('session-1', dir);
    assert.deepEqual(loaded.items, items);
    assert.equal(loaded.version, 1);
  });

  it('returns an empty list when the file is missing or corrupt', t => {
    const dir = tempDir(t, 'forge-todos-empty-');
    assert.deepEqual(loadTodos('missing', dir).items, []);

    fs.writeFileSync(path.join(dir, 'bad.todos.json'), '{broken');
    mock.method(console, 'warn', () => {});
    assert.deepEqual(loadTodos('bad', dir).items, []);
  });

  it('rejects invalid todo lists', t => {
    const dir = tempDir(t, 'forge-todos-invalid-');
    assert.throws(() => saveTodos('s', [item('1'), item('1')], dir), /Duplicate todo id/);
    assert.throws(() => saveTodos('s', [item('1', 'pending', '   ')], dir), /empty content/);
    assert.throws(() => saveTodos('s', [item('1', 'pending', 'x'.repeat(201))], dir), /exceeds 200/);
    assert.throws(() => saveTodos('s', [item('1', 'in_progress'), item('2', 'in_progress')], dir), /Only one todo/);
    assert.throws(
      () =>
        saveTodos(
          's',
          Array.from({ length: 51 }, (_, index) => item(String(index))),
          dir,
        ),
      /Too many todos/,
    );
  });

  it('counts and formats todos', () => {
    const items = [item('1', 'completed'), item('2', 'in_progress'), item('3')];
    assert.deepEqual(getTodoCounts(items), { total: 3, completed: 1, inProgress: 1, pending: 1 });
    assert.equal(formatTodoListOutput([]), 'No todos.');
    assert.match(formatTodoListOutput(items), /Todos \(1\/3 completed\)/);
  });

  it('extracts and merges todos in a conversation state', () => {
    const state = { id: 's', messages: [], todos: { version: 1, items: [item('1')], updatedAt: 1 } } as any;
    assert.deepEqual(extractTodosFromState(state).items, [item('1')]);
    const empty = extractTodosFromState(null);
    assert.equal(empty.version, 1);
    assert.deepEqual(empty.items, []);

    const merged = mergeTodosIntoState({ id: 's' } as any, { version: 1, items: [item('1')], updatedAt: 1 });
    assert.equal((merged as any).todos.items.length, 1);
  });
});
