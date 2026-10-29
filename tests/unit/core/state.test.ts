import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  createStateAccessor,
  getSessionModel,
  getSessionTitle,
  listSessionMeta,
  saveSessionTitle,
  stateToMessages,
} from '../../../src/core/state.js';
import { DEFAULT_COMPACTION_CONFIG } from '../../../src/core/compaction.js';
import { saveTodos } from '../../../src/core/todos.js';
import { tempDir } from '../../helpers/temp.js';

describe('conversation state', () => {
  it('converts SDK messages to the legacy shape', () => {
    const state = {
      id: 'session',
      messages: [
        { role: 'system', content: 'system text' },
        { role: 'user', content: [{ text: 'hello ' }, { text: 'world' }] },
        {
          role: 'assistant',
          content: 'answer',
          reasoning: 'because',
          toolCalls: [{ id: 'call_1', name: 'read_file', arguments: '{"path":"a"}' }],
        },
        { role: 'tool', callId: 'call_1', output: 'file contents' },
        { type: 'reasoning', content: 'ignored' },
        { role: 'unknown', content: 'ignored' },
      ],
    } as any;

    assert.deepEqual(stateToMessages(state), [
      { role: 'system', content: 'system text' },
      { role: 'user', content: 'hello world' },
      {
        role: 'assistant',
        content: 'answer',
        reasoning: 'because',
        toolCalls: [{ id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"a"}' } }],
      },
      { role: 'tool', toolCallId: 'call_1', content: 'file contents' },
    ]);
  });

  it('loads and saves state with todos stored separately', async t => {
    const root = tempDir(t, 'forge-state-');
    const stateDir = path.join(root, 'state');
    const todosDir = path.join(root, 'todos');
    saveTodos('session-1', [{ id: '1', content: 'do it', status: 'pending' }], todosDir);

    const accessor = createStateAccessor('session-1', stateDir, DEFAULT_COMPACTION_CONFIG, todosDir);
    await accessor.save({
      id: 'session-1',
      messages: [{ role: 'user', content: 'hi' }],
      updatedAt: 1,
      status: 'active',
      todos: { version: 1, items: [{ id: '1', content: 'do it', status: 'pending' }], updatedAt: 1 },
    } as any);

    const loaded = await accessor.load();
    assert.ok(loaded);
    assert.equal((loaded as any).todos.items[0].content, 'do it');
    assert.deepEqual(loaded.messages, [{ role: 'user', content: 'hi' }]);
  });

  it('returns null for missing or corrupt state files', async t => {
    const root = tempDir(t, 'forge-state-missing-');
    const stateDir = path.join(root, 'state');
    const accessor = createStateAccessor('missing', stateDir, DEFAULT_COMPACTION_CONFIG, path.join(root, 'todos'));
    assert.equal(await accessor.load(), null);
  });

  it('stores session titles and model choices', () => {
    saveSessionTitle('session-meta', 'My session', 'model-a');
    saveSessionTitle('session-meta', 'Ignored title update', 'model-b');

    assert.equal(getSessionTitle('session-meta'), 'My session');
    assert.equal(getSessionModel('session-meta'), 'model-b');
    const meta = listSessionMeta().find(entry => entry.id === 'session-meta');
    assert.ok(meta);
    assert.equal(meta.title, 'My session');
    assert.equal(getSessionTitle('does-not-exist'), null);
  });
});
