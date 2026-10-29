import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgentHeadless } from '../../../src/core/headless.js';
import { createBudget } from '../../../src/core/budget.js';
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

  it('stops after the retry budget and reports max_retries', async () => {
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
    assert.equal(result.usage.requests, 4);
  });

  it('records a stream failure but still returns the usage', async () => {
    const logs: any[] = [];
    const ctx = createTestContext({
      log: entry => logs.push(entry),
      model: { streamError: new Error('stream broke'), text: 'ignored' },
    });

    const result = await runAgentHeadless('Do something', ctx);
    assert.equal(result.outcome, 'done');
    assert.equal(result.usage.requests, 1);
    assert.equal(
      logs.some(entry => entry.type === 'error' && entry.content.includes('Stream failed')),
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
        async *getReasoningStream() {},
        async *getToolCallsStream() {},
      })) as any,
    });

    const result = await runAgentHeadless('Do something', ctx);
    assert.equal(result.outcome, 'cancelled');
  });
});
