import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgentHeadless } from '../../../src/core/headless.js';
import { createBudget } from '../../../src/core/budget.js';
import { sleepWithSignal } from '../../../src/core/retry.js';
import { createTestContext } from '../../helpers/context.js';
import { fakeModel } from '../../helpers/model.js';

describe('headless agent run', () => {
  it('returns the summary, usage, logs, and records the budget', async () => {
    const logs: any[] = [];
    const ctx = createTestContext({
      log: entry => logs.push(entry),
      model: {
        chunks: ['Finished ', 'the job'],
        text: 'Finished the job',
        usage: { inputTokens: 100, outputTokens: 50, cost: 0.002 },
      },
    });

    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'done');
    assert.equal(result.summary, 'Finished the job');
    assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 50, cost: 0.002, requests: 1 });
    assert.deepEqual(ctx.budget.used, { tokens: 150, cost: 0.002, requests: 1 });
    assert.equal(
      logs.some(entry => entry.type === 'assistant' && entry.content === 'Finished the job'),
      true,
    );
  });

  it('cancels immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runAgentHeadless('Do something', createTestContext({ signal: controller.signal }));
    assert.equal(result.outcome, 'cancelled');
    assert.equal(result.usage.requests, 0);
  });

  it('fails before starting when the budget is exhausted', async () => {
    const budget = createBudget({ maxRequests: 1 });
    budget.record({ requests: 1 });
    const result = await runAgentHeadless('Do something', createTestContext({ budget }));
    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'budget_exceeded');
  });

  it('retries a retryable error and then succeeds', async () => {
    let calls = 0;
    const ctx = createTestContext({
      callModel: (() => {
        calls++;
        if (calls === 1) {
          const error: any = new Error('rate limited');
          error.status = 429;
          error.headers = { 'retry-after': '0' };
          throw error;
        }
        return fakeModel({ text: 'recovered' })();
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'done');
    assert.equal(result.summary, 'recovered');
    assert.equal(result.usage.requests, 2);
    assert.equal(calls, 2);
  });

  it('maps auth failures without retrying', async () => {
    const ctx = createTestContext({
      callModel: (() => {
        const error: any = new Error('unauthorized');
        error.status = 401;
        throw error;
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);
    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'auth_failure');
    assert.equal(result.usage.requests, 1);
  });

  it('uses the 2s/5s/10s/30s/60s schedule and stops after six attempts', async () => {
    const delays: number[] = [];
    const retries: any[] = [];
    const logs: any[] = [];
    let calls = 0;

    const ctx = createTestContext({
      log: entry => logs.push(entry),
      callModel: (() => {
        calls++;
        const error: any = new Error('service unavailable');
        error.status = 503;
        throw error;
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx, {
      retry: {
        sleep: async ms => {
          delays.push(ms);
        },
        onRetry: info => retries.push(info),
      },
    });

    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'max_retries');
    assert.equal(result.usage.requests, 6);
    assert.equal(calls, 6);
    assert.deepEqual(delays, [2000, 5000, 10000, 30000, 60000]);
    assert.equal(retries.length, 5);
    assert.equal(retries[0].retry, 1);
    assert.equal(retries[0].maxRetries, 5);
    assert.equal(
      logs.some(
        entry =>
          entry.type === 'info' &&
          entry.content.includes('attempt 1/6') &&
          entry.metadata?.delayMs === 2000 &&
          entry.metadata?.category === 'upstream',
      ),
      true,
    );
  });

  it('stops after the retry budget and reports rate_limited', async () => {
    const ctx = createTestContext({
      callModel: (() => {
        const error: any = new Error('rate limited');
        error.status = 429;
        error.headers = { 'retry-after': '0' };
        throw error;
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);
    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'rate_limited');
    assert.equal(result.usage.requests, 6);
  });

  it('retries a mid-stream drop, keeps partial usage, and finishes on the next attempt', async () => {
    let calls = 0;
    const ctx = createTestContext({
      callModel: (() => {
        calls++;
        if (calls === 1) {
          return {
            async *getTextStream() {
              yield 'partial ';
              const error: any = new Error('socket hang up');
              error.code = 'ECONNRESET';
              throw error;
            },
            async getText() {
              return 'partial ';
            },
            async getUsage() {
              return { inputTokens: 3, outputTokens: 2, cost: 0.0001 };
            },
            async cancel() {},
            async *getReasoningStream() {},
            async *getToolCallsStream() {},
          };
        }
        return fakeModel({
          text: 'recovered',
          usage: { inputTokens: 4, outputTokens: 2, cost: 0.0002 },
        })();
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx, { retry: { sleep: async () => {} } });

    assert.equal(result.outcome, 'done');
    assert.equal(result.summary, 'recovered');
    assert.equal(calls, 2);
    assert.equal(result.usage.inputTokens, 7);
    assert.equal(result.usage.outputTokens, 4);
    assert.ok(Math.abs(result.usage.cost - 0.0003) < 1e-12);
    assert.equal(result.usage.requests, 2);
    assert.equal(ctx.budget.used.tokens, 11);
    assert.ok(Math.abs(ctx.budget.used.cost - 0.0003) < 1e-12);
    assert.equal(ctx.budget.used.requests, 2);
  });

  it('fails the run when the stream fails with a non-retryable error', async () => {
    const logs: any[] = [];
    const ctx = createTestContext({
      log: entry => logs.push(entry),
      model: { streamError: new Error('content policy violation'), text: 'ignored' },
    });

    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'fatal');
    assert.equal(result.usage.requests, 1);
    assert.equal(
      logs.some(entry => entry.type === 'error' && entry.content.includes('Agent run failed')),
      true,
    );
  });

  it('cancels mid-stream when the signal is aborted', async () => {
    const controller = new AbortController();
    const ctx = createTestContext({
      signal: controller.signal,
      callModel: (() => ({
        async *getTextStream() {
          yield 'first';
          controller.abort();
          yield 'second';
        },
        async getText() {
          return 'firstsecond';
        },
        async getUsage() {
          return { inputTokens: 1, outputTokens: 1, cost: 0 };
        },
        async cancel() {},
        async *getReasoningStream() {},
        async *getToolCallsStream() {},
      })) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);
    assert.equal(result.outcome, 'cancelled');
  });

  it('cancels promptly when aborted during backoff', async () => {
    const controller = new AbortController();
    let calls = 0;

    const ctx = createTestContext({
      signal: controller.signal,
      callModel: (() => {
        calls++;
        const error: any = new Error('service unavailable');
        error.status = 503;
        throw error;
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx, {
      retry: {
        sleep: async (_ms, signal) => {
          controller.abort();
          await sleepWithSignal(10, signal);
        },
      },
    });

    assert.equal(result.outcome, 'cancelled');
    assert.equal(calls, 1);
  });

  it('stops retrying when the budget is exhausted by failed attempts', async () => {
    const budget = createBudget({ maxRequests: 2 });
    let calls = 0;

    const ctx = createTestContext({
      budget,
      callModel: (() => {
        calls++;
        const error: any = new Error('rate limited');
        error.status = 429;
        error.headers = { 'retry-after': '0' };
        throw error;
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);

    assert.equal(result.outcome, 'failed');
    assert.equal(result.error?.code, 'budget_exceeded');
    assert.equal(calls, 2);
    assert.equal(result.usage.requests, 2);
  });

  it('resumes with an empty input when the failed attempt persisted progress', async () => {
    const inputs: any[] = [];
    let saved: any = null;
    const state = {
      load: async () => saved,
      save: async (next: any) => {
        saved = next;
      },
    };

    const ctx = createTestContext({
      state: state as any,
      callModel: ((request: any) => {
        inputs.push(request.input);
        if (inputs.length === 1) {
          return {
            async *getTextStream() {
              yield* [] as string[];
              await request.state.save({
                id: 'session',
                messages: [{ role: 'user', content: 'Do something' }],
                status: 'in_progress',
                createdAt: 1,
                updatedAt: 2,
              });
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

    const result = await runAgentHeadless('Do something', ctx, { retry: { sleep: async () => {} } });

    assert.equal(result.outcome, 'done');
    assert.equal(inputs.length, 2);
    assert.equal(inputs[0], 'Do something');
    assert.deepEqual(inputs[1], []);
  });

  it('re-sends the goal when the failed attempt persisted no progress', async () => {
    const inputs: any[] = [];
    const ctx = createTestContext({
      callModel: ((request: any) => {
        inputs.push(request.input);
        if (inputs.length === 1) {
          const error: any = new Error('connection reset');
          error.code = 'ECONNRESET';
          throw error;
        }
        return fakeModel({ text: 'done' })();
      }) as any,
    });

    const result = await runAgentHeadless('Do something', ctx, { retry: { sleep: async () => {} } });

    assert.equal(result.outcome, 'done');
    assert.equal(inputs.length, 2);
    assert.equal(inputs[0], 'Do something');
    assert.equal(inputs[1], 'Do something');
  });
});
