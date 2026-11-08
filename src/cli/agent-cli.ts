#!/usr/bin/env node
import { stepCountIs, type ConversationState, type StateAccessor } from '@openrouter/agent';
import { createTools } from '../tools/definitions.js';
import { buildSystemPrompt, MAX_ITERATIONS } from '../core/constants.js';
import { saveSessionTitle } from '../core/state.js';
import { deriveSessionTitle } from '../tools/helpers.js';
import { DEFAULT_MODEL_ID } from '../core/models.js';
import type { AgentContext } from '../core/context.js';
import {
  classifyModelError,
  hasConversationProgress,
  ModelRetryExhaustedError,
  withModelRetry,
  type ClassifiedModelError,
  type RetryOptions,
} from '../core/retry.js';

export type LogEvent =
  | { type: 'reasoning_delta'; content: string }
  | { type: 'tool_call'; name: string; args: any }
  | { type: 'tool_result'; content: string }
  | { type: 'assistant_delta'; content: string }
  | { type: 'info'; content: string }
  | { type: 'sub_agent'; content: string };

export type Callbacks = {
  onLog: (event: LogEvent) => void;
  onConfirm: (description: string) => Promise<boolean>;
  onUsage: (inputTokens: number, outputTokens: number, cost: number | undefined) => void;
};

export interface RunAgentOptions {
  /** Retry overrides for tests and callers that need a different policy. */
  retry?: RetryOptions;
}

type ModelResultInstance = ReturnType<AgentContext['callModel']>;
type ModelUsage = Awaited<ReturnType<ModelResultInstance['getUsage']>>;

function abortError(signal: AbortSignal): unknown {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error(typeof signal.reason === 'string' ? signal.reason : 'Operation aborted');
  error.name = 'AbortError';
  return error;
}

async function loadStateQuietly(state: StateAccessor): Promise<ConversationState | null> {
  try {
    return await state.load();
  } catch {
    return null;
  }
}

async function readUsageQuietly(result: ModelResultInstance | undefined): Promise<ModelUsage | null> {
  if (!result || typeof result.getUsage !== 'function') return null;
  try {
    return await result.getUsage();
  } catch {
    return null;
  }
}

async function cancelQuietly(result: ModelResultInstance | undefined): Promise<void> {
  if (!result || typeof result.cancel !== 'function') return;
  try {
    await result.cancel();
  } catch {
    // Cancellation is best-effort; the retry loop must not fail because of it.
  }
}

function formatDelay(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${Math.round(ms / 1000)}s`;
}

function formatErrorDetail(error: ClassifiedModelError): string {
  return [error.category, error.status, error.code, error.provider].filter(value => value !== undefined).join(' ');
}

export async function runAgent(
  sessionId: string,
  userMessage: string,
  callbacks: Callbacks,
  ctx: AgentContext,
  modelId: string = DEFAULT_MODEL_ID,
  options: RunAgentOptions = {},
): Promise<ConversationState> {
  const tools = createTools(ctx);
  const stateAccessor = ctx.state;

  const priorState = await stateAccessor.load();
  const isNewSession = priorState === null;
  const baselineState = priorState;
  let titleSaved = false;

  const retryOptions: RetryOptions = {
    ...options.retry,
    signal: options.retry?.signal ?? ctx.signal,
    onRetry: info => {
      options.retry?.onRetry?.(info);
      callbacks.onLog({
        type: 'info',
        content: `Model call failed (attempt ${info.retry}/${info.maxRetries + 1}): ${formatErrorDetail(info.error)} — retrying in ${formatDelay(info.delayMs)}`,
      });
    },
  };

  try {
    await withModelRetry(async attempt => {
      if (ctx.signal.aborted) throw abortError(ctx.signal);

      // Resume from durable progress after a mid-stream drop; otherwise the
      // user message was never persisted and must be sent again.
      const currentState = attempt > 1 ? await loadStateQuietly(stateAccessor) : null;
      const input = attempt > 1 && hasConversationProgress(baselineState, currentState) ? [] : userMessage;

      let currentResult: ModelResultInstance | undefined;
      let reasoningTask: Promise<void> | undefined;
      let toolCallTask: Promise<void> | undefined;

      try {
        currentResult = ctx.callModel({
          model: modelId,
          instructions: buildSystemPrompt(ctx.cwd),
          input,
          tools,
          stopWhen: [stepCountIs(MAX_ITERATIONS)],
          state: stateAccessor,
          signal: ctx.signal,
        });

        if (isNewSession && !titleSaved) {
          saveSessionTitle(sessionId, deriveSessionTitle(userMessage), modelId);
          titleSaved = true;
        }

        const activeResult = currentResult;
        reasoningTask = (async () => {
          try {
            for await (const delta of activeResult.getReasoningStream()) {
              callbacks.onLog({ type: 'reasoning_delta', content: delta });
            }
          } catch {
            // best-effort
          }
        })();

        toolCallTask = (async () => {
          try {
            for await (const call of activeResult.getToolCallsStream()) {
              callbacks.onLog({ type: 'tool_call', name: call.name, args: call.arguments });
            }
          } catch (err: any) {
            const errMsg = err?.error?.message ?? err?.message ?? String(err);
            callbacks.onLog({ type: 'info', content: `Tool call stream failed: ${errMsg}` });
          }
        })();

        for await (const delta of activeResult.getTextStream()) {
          if (ctx.signal.aborted) throw abortError(ctx.signal);
          callbacks.onLog({ type: 'assistant_delta', content: delta });
        }

        await Promise.allSettled([reasoningTask, toolCallTask]);

        const finalUsage = await readUsageQuietly(currentResult);
        if (finalUsage) {
          callbacks.onUsage(finalUsage.inputTokens, finalUsage.outputTokens, finalUsage.cost);
        }
      } catch (error) {
        // Stop the overlapping consumers before the next attempt starts, and
        // account for whatever the provider already billed.
        const partialUsage = await readUsageQuietly(currentResult);
        await cancelQuietly(currentResult);
        await Promise.allSettled(
          [reasoningTask, toolCallTask].filter((task): task is Promise<void> => task !== undefined),
        );
        if (partialUsage) {
          callbacks.onUsage(partialUsage.inputTokens, partialUsage.outputTokens, partialUsage.cost);
        }
        throw error;
      }
    }, retryOptions);
  } catch (error) {
    const classified = error instanceof ModelRetryExhaustedError ? error.classified : classifyModelError(error);
    const errMsg =
      error instanceof ModelRetryExhaustedError
        ? classified.message
        : ((error as any)?.error?.message ?? (error as any)?.message ?? String(error));
    const prefix =
      error instanceof ModelRetryExhaustedError
        ? `Model call failed after ${error.attempts} attempts`
        : 'Model call failed';
    callbacks.onLog({ type: 'info', content: `${prefix}: ${errMsg}` });

    const fallbackState = await stateAccessor.load();
    if (fallbackState) return fallbackState;
    throw error;
  }

  const finalState = await stateAccessor.load();
  if (!finalState) {
    throw new Error('Failed to load final state after agent completion');
  }
  return finalState;
}
