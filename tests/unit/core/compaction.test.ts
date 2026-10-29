import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { compactIfNeeded, type CompactionConfig } from '../../../src/core/compaction.js';
import { fakeModel } from '../../helpers/model.js';

function conversation(messageCount = 8): any {
  const messages: any[] = [{ role: 'system', content: 'system instructions' }];
  for (let index = 1; index < messageCount; index++) {
    messages.push({ role: index % 2 === 0 ? 'assistant' : 'user', content: `message ${index}` });
  }
  return { id: 'session', messages, updatedAt: 1, status: 'active' };
}

function config(overrides: Partial<CompactionConfig> = {}): CompactionConfig {
  return { thresholdTokens: 1, keepRecentTurns: 2, model: 'test-model', ...overrides };
}

describe('conversation compaction', () => {
  it('does not call the model below the threshold', async () => {
    const state = conversation(2);
    let calls = 0;
    const result = await compactIfNeeded(state, config({ thresholdTokens: 1_000_000 }), () => {
      calls++;
      throw new Error('should not be called');
    });

    assert.equal(result, state);
    assert.equal(calls, 0);
  });

  it('summarizes old turns and keeps the system message plus recent turns', async () => {
    const state = conversation(8);
    mock.method(console, 'log', () => {});

    const result = await compactIfNeeded(state, config(), () => fakeModel({ text: 'SUMMARY' })() as any);

    assert.notEqual(result, state);
    const messages = (result as any).messages;
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[0].content, 'system instructions');
    assert.equal(messages[1].role, 'system');
    assert.match(messages[1].content, /SUMMARY/);
    assert.equal(messages.at(-1).content, 'message 7');
    assert.equal(messages.at(-2).content, 'message 6');
  });

  it('converts recent tool messages back into SDK items', async () => {
    const state = {
      id: 'session',
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'old' },
        {
          role: 'assistant',
          content: 'calling tool',
          toolCalls: [{ id: 'call_1', name: 'read_file', arguments: '{}' }],
        },
        { role: 'tool', callId: 'call_1', output: 'result' },
      ],
      updatedAt: 1,
    } as any;
    mock.method(console, 'log', () => {});

    const result = await compactIfNeeded(
      state,
      config({ keepRecentTurns: 2 }),
      () => fakeModel({ text: 'summary' })() as any,
    );

    const messages = (result as any).messages;
    assert.equal(messages.at(-2).toolCalls[0].name, 'read_file');
    assert.equal(messages.at(-1).type, 'function_call_output');
    assert.equal(messages.at(-1).callId, 'call_1');
  });

  it('keeps the original state when the summary is empty or the call fails', async () => {
    mock.method(console, 'log', () => {});
    const state = conversation(8);

    assert.equal(await compactIfNeeded(state, config(), () => fakeModel({ text: '' })() as any), state);
    assert.equal(
      await compactIfNeeded(state, config(), () => {
        throw new Error('model unavailable');
      }),
      state,
    );
  });
});
