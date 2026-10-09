import { stepCountIs, type ConversationState } from '@openrouter/agent';
import { createTools } from '../tools/definitions.js';
import { buildSystemPrompt, MAX_ITERATIONS } from '../core/constants.js';
import { createStateAccessor } from '../core/state.js';
import type { AgentContext } from '../core/context.js';
import { DEFAULT_MODEL_ID } from '../core/models.js';

export interface RunResult {
  outcome: 'done' | 'failed' | 'cancelled';
  summary?: string;
  usage: { inputTokens: number; outputTokens: number; cost: number; requests: number };
  error?: { code: string; message: string };
}

export interface HeadlessRunOpts {
  maxSteps?: number;
  modelId?: string;
}

function isRetryableError(err: any): boolean {
  const msg = (err?.message ?? String(err)).toLowerCase();
  const status = err?.status ?? err?.statusCode ?? err?.error?.status;
  if (status === 429) return true;
  if (status === 502 || status === 503 || status === 504) return true;
  if (msg.includes('econnreset') || msg.includes('enotfound') || msg.includes('etimedout')) return true;
  if (msg.includes('network') && msg.includes('error')) return true;
  return false;
}

function getRetryAfterMs(err: any): number | null {
  const header = err?.headers?.['retry-after'] ?? err?.error?.headers?.['retry-after'];
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error('Aborted'));
    }, { once: true });
  });
}

export async function runAgentHeadless(
  goal: string,
  ctx: AgentContext,
  opts: HeadlessRunOpts = {},
): Promise<RunResult> {
  const maxSteps = opts.maxSteps ?? 50;
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;
  const usage = { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };

  // Check abort before starting
  if (ctx.signal.aborted) {
    return { outcome: 'cancelled', usage };
  }

  // Check budget before starting
  if (!ctx.budget.canSpend()) {
    return {
      outcome: 'failed',
      usage,
      error: { code: 'budget_exceeded', message: 'Budget exhausted before starting' },
    };
  }

  // Build tools respecting read_only policy
  const tools = createTools(ctx);

  let lastError: any = null;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    if (ctx.signal.aborted) {
      return { outcome: 'cancelled', usage };
    }

    try {
      const result = ctx.callModel({
        model: modelId,
        instructions: buildSystemPrompt(ctx.cwd),
        input: goal,
        tools,
        stopWhen: [stepCountIs(maxSteps)],
        state: ctx.state,
        signal: ctx.signal,
      });

      // Collect the full text (summary)
      let summary = '';
      try {
        for await (const delta of result.getTextStream()) {
          if (ctx.signal.aborted) {
            return { outcome: 'cancelled', usage };
          }
          summary += delta;
          ctx.log({ type: 'assistant', content: delta });
        }
      } catch (err: any) {
        if (ctx.signal.aborted) {
          return { outcome: 'cancelled', usage };
        }
        // Stream errors during text collection
        const errMsg = err?.error?.message ?? err?.message ?? String(err);
        ctx.log({ type: 'error', content: `Stream failed: ${errMsg}` });
      }

      // Collect usage
      const finalUsage = await result.getUsage();
      usage.inputTokens += finalUsage.inputTokens ?? 0;
      usage.outputTokens += finalUsage.outputTokens ?? 0;
      usage.cost += finalUsage.cost ?? 0;
      usage.requests += 1;

      // Record to budget
      ctx.budget.record({
        tokens: (finalUsage.inputTokens ?? 0) + (finalUsage.outputTokens ?? 0),
        cost: finalUsage.cost ?? 0,
        requests: 1,
      });

      return {
        outcome: 'done',
        summary: summary || undefined,
        usage,
      };
    } catch (err: any) {
      lastError = err;
      usage.requests += 1;

      if (ctx.signal.aborted) {
        return { outcome: 'cancelled', usage };
      }

      if (isRetryableError(err) && retryCount < maxRetries) {
        retryCount++;
        const retryAfter = getRetryAfterMs(err);
        const backoffMs = retryAfter ?? Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 30_000);

        ctx.log({
          type: 'info',
          content: `Retryable error (attempt ${retryCount}/${maxRetries}), retrying in ${Math.round(backoffMs / 1000)}s`,
          metadata: { retryCount, backoffMs },
        });

        try {
          await sleep(backoffMs, ctx.signal);
        } catch {
          return { outcome: 'cancelled', usage };
        }
        continue;
      }

      // Fatal or max retries
      const errMsg = err?.error?.message ?? err?.message ?? String(err);
      const code = err?.status === 401 || err?.status === 403
        ? 'auth_failure'
        : err?.status === 429
          ? 'rate_limited'
          : isRetryableError(err)
            ? 'max_retries'
            : 'fatal';

      ctx.log({ type: 'error', content: `Agent run failed: ${errMsg}` });

      return {
        outcome: 'failed',
        usage,
        error: { code, message: errMsg },
      };
    }
  }

  // Should not reach here, but be safe
  const errMsg = lastError?.message ?? 'Unknown error after retries';
  return {
    outcome: 'failed',
    usage,
    error: { code: 'max_retries', message: errMsg },
  };
}
