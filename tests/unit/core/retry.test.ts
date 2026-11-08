import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyModelError,
  computeRetryDelayMs,
  DEFAULT_MODEL_RETRY_POLICY,
  hasConversationProgress,
  ModelRetryExhaustedError,
  sleepWithSignal,
  withModelRetry,
  type RetryPolicy,
} from '../../../src/core/retry.js';

function httpError(status: number, message = `HTTP ${status}`, extra: Record<string, unknown> = {}) {
  const error: any = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function classifiedWithoutRetryAfter(status = 503) {
  return classifyModelError(httpError(status));
}

describe('model error classification', () => {
  for (const status of [408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 529]) {
    it(`retries HTTP ${status}`, () => {
      const classified = classifyModelError(httpError(status));
      assert.equal(classified.retryable, true);
      assert.equal(classified.status, status);
    });
  }

  for (const status of [400, 401, 402, 403, 404, 405, 409, 413, 422, 501, 505]) {
    it(`does not retry HTTP ${status}`, () => {
      const classified = classifyModelError(httpError(status));
      assert.equal(classified.retryable, false);
      assert.equal(classified.status, status);
    });
  }

  it('classifies an SDK OpenRouterError with body, headers, and provider metadata', () => {
    const error = {
      name: 'BadGatewayResponseError',
      message: 'Bad Gateway',
      statusCode: 502,
      body: JSON.stringify({
        error: {
          code: 502,
          message: 'Provider returned error',
          metadata: { provider_name: 'Anthropic' },
        },
      }),
      headers: new Headers({ 'retry-after': '3' }),
    };

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'upstream');
    assert.equal(classified.status, 502);
    assert.equal(classified.provider, 'Anthropic');
    assert.equal(classified.retryAfterMs, 3000);
    assert.equal(classified.message, 'Bad Gateway');
  });

  it('reads a nested provider error code', () => {
    const error: any = new Error('request failed');
    error.error = { code: 'rate_limit_exceeded', message: 'Rate limit exceeded' };

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'rate_limit');
    assert.equal(classified.code, 'rate_limit_exceeded');
  });

  it('parses a mid-stream Response failed wrapper', () => {
    const error = new Error(
      'Response failed: {"error":{"code":"server_error","message":"upstream broke","type":"error"}}',
    );

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'upstream');
    assert.equal(classified.code, 'server_error');
    assert.equal(classified.message, 'upstream broke');
  });

  it('classifies Node network error codes', () => {
    const error: any = new Error('read ECONNRESET');
    error.code = 'ECONNRESET';

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'network');
    assert.equal(classified.code, 'ECONNRESET');
  });

  it('walks cause chains for undici socket failures', () => {
    const error: any = new TypeError('fetch failed');
    error.cause = { code: 'UND_ERR_SOCKET', message: 'other side closed' };

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'network');
    assert.equal(classified.code, 'UND_ERR_SOCKET');
  });

  it('coerces string statuses', () => {
    const error: any = new Error('bad gateway');
    error.statusCode = '503';

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, true);
    assert.equal(classified.status, 503);
  });

  it('does not retry context-length errors', () => {
    const classified = classifyModelError(
      new Error("This model's maximum context length is 128000 tokens, however you requested 200000 tokens"),
    );

    assert.equal(classified.retryable, false);
    assert.equal(classified.category, 'invalid_request');
  });

  it('does not retry non-retryable provider codes', () => {
    const error: any = new Error('bad request');
    error.error = { code: 'context_length_exceeded', message: 'too long' };

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, false);
    assert.equal(classified.category, 'invalid_request');
    assert.equal(classified.code, 'context_length_exceeded');
  });

  it('treats abort errors as cancelled, not retryable', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, false);
    assert.equal(classified.category, 'aborted');
  });

  it('lets a non-retryable status win over retryable message text', () => {
    const error = httpError(401, 'network error while authenticating');

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, false);
    assert.equal(classified.category, 'auth');
  });

  it('never throws on cyclic causes or malformed bodies', () => {
    const outer: any = new Error('outer');
    const inner: any = new Error('inner');
    outer.cause = inner;
    inner.cause = outer;
    outer.body = '{not valid json';

    assert.doesNotThrow(() => classifyModelError(outer));
    const classified = classifyModelError(outer);
    assert.equal(classified.message, 'outer');
  });
});

describe('Retry-After parsing', () => {
  it('reads seconds from a Headers object', () => {
    const error = httpError(429, 'rate limited', { headers: new Headers({ 'retry-after': '5' }) });
    assert.equal(classifyModelError(error).retryAfterMs, 5000);
  });

  it('reads seconds from a plain object with any casing', () => {
    const error = httpError(429, 'rate limited', { headers: { 'Retry-After': '7' } });
    assert.equal(classifyModelError(error).retryAfterMs, 7000);
  });

  it('respects a zero value', () => {
    const error = httpError(429, 'rate limited', { headers: { 'retry-after': '0' } });
    assert.equal(classifyModelError(error).retryAfterMs, 0);
  });

  it('reads an HTTP-date value', () => {
    const target = Date.now() + 5000;
    const error = httpError(429, 'rate limited', {
      headers: { 'retry-after': new Date(target).toUTCString() },
    });

    const retryAfterMs = classifyModelError(error).retryAfterMs;

    assert.ok(retryAfterMs !== undefined);
    assert.ok(retryAfterMs > 3000 && retryAfterMs <= 6000);
  });

  it('ignores an unparseable value', () => {
    const error = httpError(429, 'rate limited', { headers: { 'retry-after': 'soon' } });
    assert.equal(classifyModelError(error).retryAfterMs, undefined);
  });

  it('reads headers nested under an SDK error response', () => {
    const error: any = new Error('rate limited');
    error.response = { status: 429, headers: new Headers({ 'retry-after': '2' }) };

    const classified = classifyModelError(error);

    assert.equal(classified.status, 429);
    assert.equal(classified.retryAfterMs, 2000);
  });
});

describe('retry delay calculation', () => {
  it('uses the fixed 2s/5s/10s/30s/60s schedule', () => {
    const expected = [2000, 5000, 10000, 30000, 60000];
    expected.forEach((delay, index) => {
      assert.equal(computeRetryDelayMs(DEFAULT_MODEL_RETRY_POLICY, index, classifiedWithoutRetryAfter()), delay);
    });
  });

  it('keeps the final delay for indexes past the schedule', () => {
    assert.equal(computeRetryDelayMs(DEFAULT_MODEL_RETRY_POLICY, 99, classifiedWithoutRetryAfter()), 60000);
  });

  it('prefers a provider Retry-After value', () => {
    const classified = { ...classifiedWithoutRetryAfter(429), retryAfterMs: 7000 };
    assert.equal(computeRetryDelayMs(DEFAULT_MODEL_RETRY_POLICY, 0, classified), 7000);
  });

  it('caps Retry-After at the policy maximum', () => {
    const classified = { ...classifiedWithoutRetryAfter(429), retryAfterMs: 120_000 };
    assert.equal(computeRetryDelayMs(DEFAULT_MODEL_RETRY_POLICY, 0, classified), 60_000);
  });

  it('clamps negative Retry-After values to zero', () => {
    const classified = { ...classifiedWithoutRetryAfter(429), retryAfterMs: -500 };
    assert.equal(computeRetryDelayMs(DEFAULT_MODEL_RETRY_POLICY, 0, classified), 0);
  });

  it('honours a custom policy maximum', () => {
    const policy: RetryPolicy = { delaysMs: [1000], maxRetryAfterMs: 2500 };
    const classified = { ...classifiedWithoutRetryAfter(429), retryAfterMs: 9000 };
    assert.equal(computeRetryDelayMs(policy, 0, classified), 2500);
  });
});

describe('sleepWithSignal', () => {
  it('resolves after the requested delay', async () => {
    await sleepWithSignal(1);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(sleepWithSignal(1000, controller.signal), /abort/i);
  });

  it('rejects promptly when aborted mid-sleep', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1);
    try {
      await assert.rejects(sleepWithSignal(1000, controller.signal), /abort/i);
    } finally {
      clearTimeout(timer);
    }
  });
});

describe('withModelRetry', () => {
  it('returns the first successful result without sleeping', async () => {
    let calls = 0;
    let slept = false;

    const result = await withModelRetry(
      async attempt => {
        calls++;
        assert.equal(attempt, 1);
        return 'ok';
      },
      {
        sleep: async () => {
          slept = true;
        },
      },
    );

    assert.equal(result, 'ok');
    assert.equal(calls, 1);
    assert.equal(slept, false);
  });

  it('retries a retryable error and then succeeds', async () => {
    const delays: number[] = [];
    const retries: any[] = [];
    let calls = 0;

    const result = await withModelRetry(
      async () => {
        calls++;
        if (calls === 1) throw httpError(503);
        return 'recovered';
      },
      {
        sleep: async ms => {
          delays.push(ms);
        },
        onRetry: info => retries.push(info),
      },
    );

    assert.equal(result, 'recovered');
    assert.equal(calls, 2);
    assert.deepEqual(delays, [2000]);
    assert.equal(retries.length, 1);
    assert.equal(retries[0].retry, 1);
    assert.equal(retries[0].maxRetries, 5);
    assert.equal(retries[0].delayMs, 2000);
    assert.equal(retries[0].error.category, 'upstream');
  });

  it('uses Retry-After instead of the schedule when present', async () => {
    const delays: number[] = [];
    let calls = 0;

    const result = await withModelRetry(
      async () => {
        calls++;
        if (calls === 1) {
          throw httpError(429, 'rate limited', { headers: { 'retry-after': '0' } });
        }
        return 'ok';
      },
      {
        sleep: async ms => {
          delays.push(ms);
        },
      },
    );

    assert.equal(result, 'ok');
    assert.deepEqual(delays, [0]);
  });

  it('throws ModelRetryExhaustedError after six attempts with the full schedule', async () => {
    const delays: number[] = [];
    let calls = 0;

    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          throw httpError(503);
        },
        {
          sleep: async ms => {
            delays.push(ms);
          },
        },
      ),
      (error: any) => {
        assert.ok(error instanceof ModelRetryExhaustedError);
        assert.equal(error.attempts, 6);
        assert.equal(error.classified.status, 503);
        assert.equal((error.lastError as any).status, 503);
        return true;
      },
    );

    assert.equal(calls, 6);
    assert.deepEqual(delays, [2000, 5000, 10000, 30000, 60000]);
  });

  it('rethrows non-retryable errors without sleeping', async () => {
    const error = httpError(401);
    let calls = 0;

    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          throw error;
        },
        {
          sleep: async () => {
            throw new Error('should not sleep');
          },
        },
      ),
      thrown => thrown === error,
    );

    assert.equal(calls, 1);
  });

  it('does not start an attempt when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          return 'ok';
        },
        { signal: controller.signal },
      ),
      /abort/i,
    );

    assert.equal(calls, 0);
  });

  it('stops retrying when the signal aborts during backoff', async () => {
    const controller = new AbortController();
    let calls = 0;

    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          throw httpError(503);
        },
        {
          signal: controller.signal,
          sleep: async (_ms, signal) => {
            controller.abort();
            await sleepWithSignal(10, signal);
          },
        },
      ),
      /abort/i,
    );

    assert.equal(calls, 1);
  });

  it('honours a custom retry policy', async () => {
    const policy: RetryPolicy = { delaysMs: [10, 20], maxRetryAfterMs: 1000 };
    const delays: number[] = [];
    let calls = 0;

    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          throw httpError(503);
        },
        {
          policy,
          sleep: async ms => {
            delays.push(ms);
          },
        },
      ),
      (error: any) => error instanceof ModelRetryExhaustedError && error.attempts === 3,
    );

    assert.equal(calls, 3);
    assert.deepEqual(delays, [10, 20]);
  });
});

describe('status precedence over message text', () => {
  it('retries a retryable status even when the message looks like an auth failure', () => {
    const classified = classifyModelError(httpError(503, 'authentication failed'));

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'upstream');
    assert.equal(classified.status, 503);
  });

  it('retries a retryable status even when the message mentions context length', () => {
    const classified = classifyModelError(httpError(429, 'maximum context length exceeded'));

    assert.equal(classified.retryable, true);
    assert.equal(classified.category, 'rate_limit');
    assert.equal(classified.status, 429);
  });

  it('still lets an explicit non-retryable provider code win over a retryable status', () => {
    const error: any = httpError(503, 'provider error');
    error.error = { code: 'context_length_exceeded', message: 'too long' };

    const classified = classifyModelError(error);

    assert.equal(classified.retryable, false);
    assert.equal(classified.category, 'invalid_request');
    assert.equal(classified.code, 'context_length_exceeded');
  });
});

function conversationState(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'session',
    messages: [{ role: 'user', content: 'hello' }],
    status: 'in_progress',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('hasConversationProgress', () => {
  it('returns false when the current state is missing', () => {
    assert.equal(hasConversationProgress(conversationState(), null), false);
  });

  it('treats a timestamp-only save as no progress', () => {
    const baseline = conversationState();
    const current = conversationState({ updatedAt: 9_999 });

    assert.equal(hasConversationProgress(baseline, current), false);
  });

  it('ignores object key order', () => {
    const baseline = { id: 's', messages: [], status: 'active', createdAt: 1, updatedAt: 1 } as any;
    const current = { updatedAt: 1, status: 'active', messages: [], createdAt: 1, id: 's' } as any;

    assert.equal(hasConversationProgress(baseline, current), false);
  });

  it('detects an appended message', () => {
    const baseline = conversationState();
    const current = conversationState({
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'user', content: 'next' },
      ],
    });

    assert.equal(hasConversationProgress(baseline, current), true);
  });

  it('detects changed message content without a count change', () => {
    const baseline = conversationState();
    const current = conversationState({ messages: [{ role: 'user', content: 'hello world' }] });

    assert.equal(hasConversationProgress(baseline, current), true);
  });

  it('detects persisted partial progress that leaves message count unchanged', () => {
    const baseline = conversationState();
    const current = conversationState({
      partialResponse: { text: 'half an answer', toolCalls: [] },
    });

    assert.equal(hasConversationProgress(baseline, current), true);
  });

  it('detects a new response id', () => {
    const baseline = conversationState({ previousResponseId: 'a' });
    const current = conversationState({ previousResponseId: 'b' });

    assert.equal(hasConversationProgress(baseline, current), true);
  });

  it('requires a persisted message for a new session', () => {
    assert.equal(hasConversationProgress(null, conversationState({ messages: [] })), false);
    assert.equal(hasConversationProgress(null, conversationState()), true);
  });
});
