import { stepCountIs, type ConversationState, type StateAccessor } from '@openrouter/agent';
import { createTools } from '../tools/definitions.js';
import { buildSystemPrompt } from '../core/constants.js';
import type { AgentContext } from '../core/context.js';
import { DEFAULT_MODEL_ID } from '../core/models.js';
import { StreamCoalescer } from '../core/stream-buffer.js';
import {
  classifyModelError,
  hasConversationProgress,
  ModelRetryExhaustedError,
  withModelRetry,
  type ClassifiedModelError,
  type RetryOptions,
} from '../core/retry.js';

export interface RunResult {
  outcome: 'done' | 'failed' | 'cancelled';
  summary?: string;
  usage: { inputTokens: number; outputTokens: number; cost: number; requests: number };
  error?: { code: string; message: string };
}

export interface HeadlessRunOpts {
  maxSteps?: number;
  modelId?: string;
  /** Retry overrides for tests and callers that need a different policy. */
  retry?: RetryOptions;
}

type ModelResultInstance = ReturnType<AgentContext['callModel']>;
type ModelUsage = Awaited<ReturnType<ModelResultInstance['getUsage']>>;

/** Error used to stop a run before a model call when the budget is exhausted. */
class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

/** Build an abort error from the signal reason, preserving Error instances. */
function abortError(signal: AbortSignal): unknown {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error(typeof signal.reason === 'string' ? signal.reason : 'Operation aborted');
  error.name = 'AbortError';
  return error;
}

/** Load persisted conversation state, treating an unreadable store as empty. */
async function loadStateQuietly(state: StateAccessor): Promise<ConversationState | null> {
  try {
    return await state.load();
  } catch {
    return null;
  }
}

/** Read accrued usage without letting telemetry failures mask the run result. */
async function readUsageQuietly(
  result: ModelResultInstance | undefined,
  onError?: (error: unknown) => void,
): Promise<ModelUsage | null> {
  if (!result || typeof result.getUsage !== 'function') return null;
  try {
    return await result.getUsage();
  } catch (error) {
    onError?.(error);
    return null;
  }
}

/** Cancel a failed attempt's stream, ignoring errors during cleanup. */
async function cancelQuietly(result: ModelResultInstance | undefined): Promise<void> {
  if (!result || typeof result.cancel !== 'function') return;
  try {
    await result.cancel();
  } catch {
    // Cancellation is best-effort; the retry loop must not fail because of it.
  }
}

/** Format a backoff delay for log output. */
function formatDelay(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${Math.round(ms / 1000)}s`;
}

/** Join the useful classification fields into one log-friendly string. */
function formatErrorDetail(error: ClassifiedModelError): string {
  return [error.category, error.status, error.code, error.provider].filter(value => value !== undefined).join(' ');
}

/** Pick the most useful human-readable message for a failed run. */
function describeError(error: unknown, classified: ClassifiedModelError): string {
  if (error instanceof ModelRetryExhaustedError) {
    return `${classified.message} (after ${error.attempts} attempts)`;
  }
  const candidate = error as { error?: { message?: string }; message?: string } | null;
  return candidate?.error?.message ?? candidate?.message ?? classified.message;
}

/** Map a classified error to the stable `RunResult` error code. */
function mapErrorCode(classified: ClassifiedModelError): string {
  if (classified.category === 'auth' || classified.status === 401 || classified.status === 403) {
    return 'auth_failure';
  }
  if (classified.category === 'rate_limit' || classified.status === 429) {
    return 'rate_limited';
  }
  return classified.retryable ? 'max_retries' : 'fatal';
}

/**
 * Run one task headlessly and return a stable result envelope.
 *
 * Retryable model failures are retried with the shared policy, resuming from
 * persisted conversation state when a failed attempt saved progress.
 */
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
  const baselineState = await loadStateQuietly(ctx.state);

  const retryOptions: RetryOptions = {
    ...opts.retry,
    signal: opts.retry?.signal ?? ctx.signal,
    onRetry: info => {
      opts.retry?.onRetry?.(info);
      ctx.log({
        type: 'info',
        content: `Model call failed (attempt ${info.retry}/${info.maxRetries + 1}): ${formatErrorDetail(info.error)} — retrying in ${formatDelay(info.delayMs)}`,
        metadata: {
          retry: info.retry,
          maxRetries: info.maxRetries,
          delayMs: info.delayMs,
          category: info.error.category,
          status: info.error.status,
          code: info.error.code,
          provider: info.error.provider,
        },
      });
    },
  };

  try {
    const summary = await withModelRetry(async attempt => {
      if (ctx.signal.aborted) throw abortError(ctx.signal);
      if (!ctx.budget.canSpend()) {
        throw new BudgetExceededError('Budget exhausted before model call');
      }

      // After a failed attempt, resume from persisted progress when the SDK
      // managed to save it. Otherwise the original goal is still unsent.
      const currentState = attempt > 1 ? await loadStateQuietly(ctx.state) : null;
      const input = attempt > 1 && hasConversationProgress(baselineState, currentState) ? [] : goal;

      let result: ModelResultInstance | undefined;
      try {
        result = ctx.callModel({
          model: modelId,
          instructions: buildSystemPrompt(ctx.cwd),
          input,
          tools,
          stopWhen: [stepCountIs(maxSteps)],
          state: ctx.state,
          signal: ctx.signal,
        });

        let summary = '';
        const stream = new StreamCoalescer({
          maxChars: 512,
          maxDelayMs: 120,
          onFlush: text => ctx.log({ type: 'assistant', content: text }),
        });

        try {
          for await (const delta of result.getTextStream()) {
            if (ctx.signal.aborted) {
              stream.flush();
              throw abortError(ctx.signal);
            }
            summary += delta;
            stream.push(delta);
          }
          stream.flush();
        } catch (error) {
          stream.flush();
          if (ctx.signal.aborted) throw abortError(ctx.signal);
          throw error;
        }

        const finalUsage = await readUsageQuietly(result, error => {
          ctx.log({ type: 'info', content: `Usage unavailable after model call: ${String(error)}` });
        });
        usage.requests += 1;
        if (finalUsage) {
          usage.inputTokens += finalUsage.inputTokens ?? 0;
          usage.outputTokens += finalUsage.outputTokens ?? 0;
          usage.cost += finalUsage.cost ?? 0;
        }
        ctx.budget.record({
          tokens: (finalUsage?.inputTokens ?? 0) + (finalUsage?.outputTokens ?? 0),
          cost: finalUsage?.cost ?? 0,
          requests: 1,
        });

        return summary;
      } catch (error) {
        // Failed attempts still consume a request and whatever tokens the
        // provider already billed. Record them before the retry decision.
        const partialUsage = await readUsageQuietly(result);
        await cancelQuietly(result);
        usage.requests += 1;
        if (partialUsage) {
          usage.inputTokens += partialUsage.inputTokens ?? 0;
          usage.outputTokens += partialUsage.outputTokens ?? 0;
          usage.cost += partialUsage.cost ?? 0;
        }
        ctx.budget.record({
          tokens: (partialUsage?.inputTokens ?? 0) + (partialUsage?.outputTokens ?? 0),
          cost: partialUsage?.cost ?? 0,
          requests: 1,
        });
        throw error;
      }
    }, retryOptions);

    return { outcome: 'done', summary: summary || undefined, usage };
  } catch (error) {
    if (ctx.signal.aborted) {
      return { outcome: 'cancelled', usage };
    }

    if (error instanceof BudgetExceededError) {
      ctx.log({ type: 'error', content: `Agent run stopped: ${error.message}` });
      return {
        outcome: 'failed',
        usage,
        error: { code: 'budget_exceeded', message: error.message },
      };
    }

    const classified = error instanceof ModelRetryExhaustedError ? error.classified : classifyModelError(error);
    const message = describeError(error, classified);
    ctx.log({ type: 'error', content: `Agent run failed: ${message}` });

    return {
      outcome: 'failed',
      usage,
      error: { code: mapErrorCode(classified), message },
    };
  }
}
