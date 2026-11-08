import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, type Callbacks, type LogEvent } from '../../../src/cli/agent-cli.js';
import { ModelRetryExhaustedError } from '../../../src/core/retry.js';
import { createTestContext } from '../../helpers/context.js';
import { fakeModel } from '../../helpers/model.js';

function sessionState(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session',
    messages: [] as unknown[],
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function inMemoryState(initial = sessionState()) {
  let current: any = initial;
  return {
    accessor: {
      load: async () => current,
      save: async (next: any) => {
        current = next;
      },
    },
    get current() {
      return current;
    },
  };
}

function createCallbacks() {
  const logs: LogEvent[] = [];
  const usage: Array<{ inputTokens: number; outputTokens: number; cost: number | undefined }> = [];
  const callbacks: Callbacks = {
    onLog: event => logs.push(event),
    onConfirm: async () => true,
    onUsage: (inputTokens, outputTokens, cost) => usage.push({ inputTokens, outputTokens, cost }),
  };
  return { callbacks, logs, usage };
}

function streamFailure(error: unknown) {
  return {
    async *getTextStream() {
      yield 'partial';
      throw error;
    },
    async getText() {
      return 'partial';
    },
    async getUsage() {
      return { inputTokens: 2, outputTokens: 1, cost: 0.0001 };
    },
    async cancel() {},
    async *getReasoningStream() {},
    async *getToolCallsStream() {},
  };
}

describe('interactive chat model calls', () => {
  it('retries a mid-stream drop and reports partial plus final usage', async () => {
    const state = inMemoryState();
    let calls = 0;

    const ctx = createTestContext({
      state: state.accessor as any,
      callModel: (() => {
        calls++;
        if (calls === 1) {
          const error: any = new Error('socket hang up');
          error.code = 'ECONNRESET';
          return streamFailure(error);
        }
        return fakeModel({
          text: 'hello',
          usage: { inputTokens: 5, outputTokens: 2, cost: 0.0002 },
        })();
      }) as any,
    });

    const { callbacks, logs, usage } = createCallbacks();
    const result = await runAgent('session', 'hi', callbacks, ctx, 'test-model', {
      retry: { sleep: async () => {} },
    });

    assert.equal(result, state.current);
    assert.equal(calls, 2);
    assert.equal(
      logs.some(
        entry =>
          entry.type === 'info' && entry.content.includes('attempt 1/6') && entry.content.includes('retrying in 2s'),
      ),
      true,
    );
    assert.equal(
      logs
        .filter((entry): entry is Extract<LogEvent, { type: 'assistant_delta' }> => entry.type === 'assistant_delta')
        .map(entry => entry.content)
        .join(''),
      'partialhello',
    );
    assert.deepEqual(usage, [
      { inputTokens: 2, outputTokens: 1, cost: 0.0001 },
      { inputTokens: 5, outputTokens: 2, cost: 0.0002 },
    ]);
  });

  it('reports usage on a successful first attempt', async () => {
    const state = inMemoryState();
    const ctx = createTestContext({
      state: state.accessor as any,
      model: { text: 'hello', usage: { inputTokens: 7, outputTokens: 3, cost: 0.0004 } },
    });

    const { callbacks, usage } = createCallbacks();
    const result = await runAgent('session', 'hi', callbacks, ctx);

    assert.equal(result, state.current);
    assert.deepEqual(usage, [{ inputTokens: 7, outputTokens: 3, cost: 0.0004 }]);
  });

  it('throws ModelRetryExhaustedError when no fallback state exists', async () => {
    let calls = 0;
    const error: any = new Error('service unavailable');
    error.status = 503;

    const ctx = createTestContext({
      state: {
        load: async () => null,
        save: async () => {},
      } as any,
      callModel: (() => {
        calls++;
        throw error;
      }) as any,
    });

    const { callbacks, logs } = createCallbacks();

    await assert.rejects(
      runAgent('session', 'hi', callbacks, ctx, 'test-model', { retry: { sleep: async () => {} } }),
      (thrown: any) => {
        assert.ok(thrown instanceof ModelRetryExhaustedError);
        assert.equal(thrown.attempts, 6);
        return true;
      },
    );

    assert.equal(calls, 6);
    assert.equal(
      logs.some(entry => entry.type === 'info' && entry.content.includes('Model call failed after 6 attempts')),
      true,
    );
  });

  it('returns the fallback state for a non-retryable error without retrying', async () => {
    const state = inMemoryState(sessionState({ messages: [{ role: 'user', content: 'previous' }] }));
    let calls = 0;
    const error: any = new Error('unauthorized');
    error.status = 401;

    const ctx = createTestContext({
      state: state.accessor as any,
      callModel: (() => {
        calls++;
        throw error;
      }) as any,
    });

    const { callbacks, logs } = createCallbacks();
    const result = await runAgent('session', 'hi', callbacks, ctx, 'test-model', {
      retry: { sleep: async () => {} },
    });

    assert.equal(result, state.current);
    assert.equal(calls, 1);
    assert.equal(
      logs.some(entry => entry.type === 'info' && entry.content.includes('Model call failed')),
      true,
    );
  });

  it('returns the fallback state when the run is aborted mid-stream', async () => {
    const controller = new AbortController();
    const state = inMemoryState(sessionState({ messages: [{ role: 'user', content: 'previous' }] }));

    const ctx = createTestContext({
      signal: controller.signal,
      state: state.accessor as any,
      callModel: (() => ({
        async *getTextStream() {
          yield 'partial';
          controller.abort();
          yield 'more';
        },
        async getText() {
          return 'partialmore';
        },
        async getUsage() {
          return { inputTokens: 1, outputTokens: 1, cost: 0 };
        },
        async cancel() {},
        async *getReasoningStream() {},
        async *getToolCallsStream() {},
      })) as any,
    });

    const { callbacks, usage } = createCallbacks();
    const result = await runAgent('session', 'hi', callbacks, ctx, 'test-model', {
      retry: { sleep: async () => {} },
    });

    assert.equal(result, state.current);
    assert.equal(usage.length, 1);
    assert.deepEqual(usage[0], { inputTokens: 1, outputTokens: 1, cost: 0 });
  });

  it('resumes with an empty input when the failed attempt persisted progress', async () => {
    const state = inMemoryState();
    const inputs: any[] = [];
    let calls = 0;

    const ctx = createTestContext({
      state: state.accessor as any,
      callModel: ((request: any) => {
        inputs.push(request.input);
        calls++;
        if (calls === 1) {
          return {
            async *getTextStream() {
              yield* [] as string[];
              await request.state.save(sessionState({ messages: [{ role: 'user', content: 'hi' }] }));
              const error: any = new Error('connection reset');
              error.code = 'ECONNRESET';
              throw error;
            },
            async getText() {
              return '';
            },
            async getUsage() {
              return { inputTokens: 1, outputTokens: 0, cost: 0 };
            },
            async cancel() {},
            async *getReasoningStream() {},
            async *getToolCallsStream() {},
          };
        }
        return fakeModel({ text: 'done' })();
      }) as any,
    });

    const { callbacks } = createCallbacks();
    const result = await runAgent('session', 'hi', callbacks, ctx, 'test-model', {
      retry: { sleep: async () => {} },
    });

    assert.equal(result, state.current);
    assert.deepEqual(inputs, ['hi', []]);
  });

  it('re-sends the user message when the failed attempt persisted no progress', async () => {
    const state = inMemoryState();
    const inputs: any[] = [];
    let calls = 0;

    const ctx = createTestContext({
      state: state.accessor as any,
      callModel: ((request: any) => {
        inputs.push(request.input);
        calls++;
        if (calls === 1) {
          const error: any = new Error('connection reset');
          error.code = 'ECONNRESET';
          throw error;
        }
        return fakeModel({ text: 'done' })();
      }) as any,
    });

    const { callbacks } = createCallbacks();
    await runAgent('session', 'hi', callbacks, ctx, 'test-model', { retry: { sleep: async () => {} } });

    assert.deepEqual(inputs, ['hi', 'hi']);
  });
});
