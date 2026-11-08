/**
 * Shared retry policy for model calls.
 *
 * A model call can fail before any response arrives (DNS failure, dropped
 * socket, upstream 5xx) or mid-stream (the provider closes the connection after
 * partial output). This module classifies those failures, decides whether a
 * retry is safe, and runs the retry loop with the production backoff schedule.
 *
 * The module is framework-free so every model-call path (headless task runs,
 * interactive chat, sub-agents, and compaction) can share one policy.
 */

import type { ConversationState } from '@openrouter/agent';

export const DEFAULT_MODEL_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000, 60_000] as const;

/** Compaction runs inside `state.save`, so keep its worst-case stall short. */
export const COMPACTION_RETRY_DELAYS_MS = [2_000, 5_000, 10_000] as const;

export const DEFAULT_MAX_RETRY_AFTER_MS = 60_000;

export interface RetryPolicy {
  /** Delay before each retry. Its length is the maximum number of retries. */
  delaysMs: readonly number[];
  /** A provider `Retry-After` value is clamped to this. */
  maxRetryAfterMs: number;
}

export const DEFAULT_MODEL_RETRY_POLICY: RetryPolicy = {
  delaysMs: DEFAULT_MODEL_RETRY_DELAYS_MS,
  maxRetryAfterMs: DEFAULT_MAX_RETRY_AFTER_MS,
};

export const COMPACTION_RETRY_POLICY: RetryPolicy = {
  delaysMs: COMPACTION_RETRY_DELAYS_MS,
  maxRetryAfterMs: DEFAULT_MAX_RETRY_AFTER_MS,
};

export type ModelErrorCategory =
  'aborted' | 'auth' | 'invalid_request' | 'rate_limit' | 'upstream' | 'network' | 'timeout' | 'unknown';

export interface ClassifiedModelError {
  /** Whether retrying the same call can reasonably succeed. */
  retryable: boolean;
  category: ModelErrorCategory;
  /** HTTP status when the error carried one. */
  status?: number;
  /** Provider or runtime error code when the error carried one. */
  code?: string;
  /** Upstream provider name when the response metadata exposed one. */
  provider?: string;
  message: string;
  /** Parsed `Retry-After` delay in milliseconds. */
  retryAfterMs?: number;
}

function stateMessageCount(state: ConversationState | null): number {
  if (!state) return 0;
  const messages = (state as { messages?: unknown }).messages;
  return Array.isArray(messages) ? messages.length : 0;
}

/**
 * Detect whether a failed attempt left durable progress behind. When it did,
 * the retry must resume from that state instead of re-sending the original
 * input (which would duplicate the user message and could replay tool work).
 */
export function hasConversationProgress(
  baseline: ConversationState | null,
  current: ConversationState | null,
): boolean {
  if (!current) return false;
  if (!baseline) return stateMessageCount(current) > 0;
  if (stateMessageCount(current) > stateMessageCount(baseline)) return true;
  if (current.previousResponseId !== baseline.previousResponseId) return true;
  if ((current.pendingToolCalls?.length ?? 0) > 0) return true;
  if ((current.pendingAsyncTools?.length ?? 0) > 0) return true;
  return false;
}

const MAX_ERROR_DEPTH = 6;
const MAX_JSON_LENGTH = 64 * 1024;

const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 402, 403, 404, 405, 409, 413, 422]);

const RETRYABLE_PROVIDER_CODES = new Set([
  'server_error',
  'internal_server_error',
  'internal_error',
  'api_error',
  'provider_error',
  'rate_limit_exceeded',
  'rate_limited',
  'provider_overloaded',
  'provider_unavailable',
  'upstream_error',
  'upstream_timeout',
  'timeout',
  'overloaded',
  'service_unavailable',
  'bad_gateway',
  'gateway_timeout',
  'no_available_provider',
  'temporarily_unavailable',
]);

const NON_RETRYABLE_PROVIDER_CODES = new Set([
  'invalid_request',
  'invalid_request_error',
  'invalid_prompt',
  'context_length_exceeded',
  'content_policy_violation',
  'insufficient_quota',
  'authentication_error',
  'permission_denied',
  'model_not_found',
  'invalid_api_key',
  'not_found',
  'unsupported_parameter',
  'unsupported_value',
  'validation_error',
]);

const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENETDOWN',
  'ENETRESET',
  'ERR_NETWORK',
  'ERR_STREAM_PREMATURE_CLOSE',
  'ERR_STREAM_DESTROYED',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_CLOSED',
]);

const TIMEOUT_NETWORK_CODES = new Set([
  'ETIMEDOUT',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

interface MessagePattern {
  pattern: RegExp;
  category: ModelErrorCategory;
}

const NON_RETRYABLE_MESSAGE_PATTERNS: readonly MessagePattern[] = [
  {
    pattern: /\b(?:invalid|malformed)\s+(?:request|prompt|input|argument|parameter)\b/i,
    category: 'invalid_request',
  },
  {
    pattern: /context[_\s-]?length[_\s-]?exceeded|maximum context length|context window/i,
    category: 'invalid_request',
  },
  {
    pattern: /content[_\s-]?policy|moderation|safety (?:system|policy)|response was flagged/i,
    category: 'invalid_request',
  },
  {
    pattern: /insufficient[_\s-]?quota|quota exceeded|payment required|out of credits/i,
    category: 'invalid_request',
  },
  {
    pattern:
      /authentication|unauthori[sz]ed|invalid api key|missing api key|permission denied|forbidden|not authorized/i,
    category: 'auth',
  },
  { pattern: /model[_\s-]?not[_\s-]?found|no such model|unknown model/i, category: 'invalid_request' },
  { pattern: /schema validation|validation error/i, category: 'invalid_request' },
];

const RETRYABLE_MESSAGE_PATTERNS: readonly MessagePattern[] = [
  { pattern: /rate[_\s-]?limit|too many requests|\b429\b/i, category: 'rate_limit' },
  { pattern: /\btimeout\b|\btimed out\b|etimedout/i, category: 'timeout' },
  {
    pattern: /econnreset|econnrefused|econnaborted|enotfound|eai_again|epipe|enetunreach|ehostunreach|und_err/i,
    category: 'network',
  },
  {
    pattern:
      /fetch failed|socket hang up|other side closed|premature close|connection (?:reset|closed|refused|timed out)|network (?:error|failure)|stream ended without completion|\bterminated\b/i,
    category: 'network',
  },
  {
    pattern:
      /upstream|provider returned error|provider error|bad gateway|gateway timeout|service unavailable|server error|internal server error|temporarily unavailable|overloaded|try again/i,
    category: 'upstream',
  },
];

interface ErrorSignals {
  statuses: number[];
  codes: string[];
  networkCodes: string[];
  messages: string[];
  provider?: string;
  retryAfterMs?: number;
  aborted: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStatusCode(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(numeric)) return undefined;
  const status = Math.trunc(numeric);
  return status >= 100 && status <= 599 ? status : undefined;
}

function isNetworkCode(code: string): boolean {
  return RETRYABLE_NETWORK_CODES.has(code.toUpperCase());
}

function isKnownProviderCode(code: string): boolean {
  const normalized = code.toLowerCase();
  return RETRYABLE_PROVIDER_CODES.has(normalized) || NON_RETRYABLE_PROVIDER_CODES.has(normalized);
}

function parseEmbeddedJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  let candidate: string | undefined;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    candidate = trimmed;
  } else {
    const brace = trimmed.indexOf('{');
    if (brace === -1) return undefined;
    candidate = trimmed.slice(brace);
  }
  if (candidate.length > MAX_JSON_LENGTH) return undefined;

  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function extractRetryAfterMs(headers: unknown): number | undefined {
  if (headers === null || headers === undefined || typeof headers !== 'object') return undefined;

  let raw: string | undefined;
  const getter = (headers as { get?: unknown }).get;
  if (typeof getter === 'function') {
    try {
      const value = (getter as (name: string) => unknown).call(headers, 'retry-after');
      if (typeof value === 'string') raw = value;
      else if (typeof value === 'number') raw = String(value);
    } catch {
      // Fall through to plain-object handling.
    }
  }

  if (raw === undefined && isRecord(headers)) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() !== 'retry-after') continue;
      const value = headers[key];
      if (typeof value === 'string') raw = value;
      else if (typeof value === 'number') raw = String(value);
      break;
    }
  }

  if (raw === undefined || raw.trim() === '') return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(raw);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}

function collectSignals(error: unknown): ErrorSignals {
  const signals: ErrorSignals = {
    statuses: [],
    codes: [],
    networkCodes: [],
    messages: [],
    aborted: false,
  };
  const seen = new WeakSet<object>();

  const visit = (value: unknown, depth: number): void => {
    if (value === null || value === undefined || depth > MAX_ERROR_DEPTH) return;

    if (typeof value === 'string') {
      signals.messages.push(value);
      const parsed = parseEmbeddedJson(value);
      if (parsed !== undefined) visit(parsed, depth + 1);
      return;
    }

    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    const node = value as Record<string, unknown>;

    if (node.name === 'AbortError' || node.code === 'ABORT_ERR') {
      signals.aborted = true;
    }

    for (const key of ['status', 'statusCode', 'status_code'] as const) {
      const status = toStatusCode(node[key]);
      if (status !== undefined) signals.statuses.push(status);
    }

    if (isRecord(node.response)) {
      const status = toStatusCode(node.response.status);
      if (status !== undefined) signals.statuses.push(status);
    }
    if (isRecord(node.rawResponse)) {
      const status = toStatusCode(node.rawResponse.status);
      if (status !== undefined) signals.statuses.push(status);
    }

    const codeValue = node.code;
    if (typeof codeValue === 'string' || typeof codeValue === 'number') {
      const code = String(codeValue).trim();
      const status = toStatusCode(code);
      if (status !== undefined) {
        signals.statuses.push(status);
      } else if (code && !signals.aborted && code.toUpperCase() !== 'ABORT_ERR') {
        if (isNetworkCode(code)) signals.networkCodes.push(code.toUpperCase());
        else signals.codes.push(code);
      }
    }

    if (typeof node.message === 'string') signals.messages.push(node.message);

    if (isRecord(node.metadata)) {
      const provider = node.metadata.provider_name ?? node.metadata.provider;
      if (typeof provider === 'string' && !signals.provider) signals.provider = provider;
    }
    if (typeof node.provider === 'string' && !signals.provider) signals.provider = node.provider;

    const retryAfter =
      extractRetryAfterMs(node.headers) ??
      (isRecord(node.response) ? extractRetryAfterMs(node.response.headers) : undefined) ??
      (isRecord(node.rawResponse) ? extractRetryAfterMs(node.rawResponse.headers) : undefined);
    if (retryAfter !== undefined && signals.retryAfterMs === undefined) signals.retryAfterMs = retryAfter;

    if (typeof node.body === 'string') {
      visit(node.body, depth + 1);
    } else if (node.body !== undefined) {
      visit(node.body, depth + 1);
    }

    visit(node.error, depth + 1);
    visit(node.cause, depth + 1);
    visit(node.data$, depth + 1);
  };

  visit(error, 0);
  return signals;
}

function pickMessage(messages: readonly string[]): string {
  for (const raw of messages) {
    const message = raw.trim();
    if (!message) continue;
    if (message.startsWith('{') || message.startsWith('[')) continue;
    if (message.startsWith('Response failed:')) continue;
    return message;
  }
  for (const raw of messages) {
    const message = raw.trim();
    if (message) return message;
  }
  return 'Unknown model error';
}

function classifyStatus(status: number): { retryable: boolean; category: ModelErrorCategory } | undefined {
  if (status === 401 || status === 403) return { retryable: false, category: 'auth' };
  if (NON_RETRYABLE_STATUS_CODES.has(status)) return { retryable: false, category: 'invalid_request' };
  if (status === 429) return { retryable: true, category: 'rate_limit' };
  if (status === 408 || status === 425) return { retryable: true, category: 'timeout' };
  if (status >= 500 && status <= 599 && status !== 501 && status !== 505) {
    return { retryable: true, category: 'upstream' };
  }
  return undefined;
}

function classifyProviderCode(code: string): { retryable: boolean; category: ModelErrorCategory } | undefined {
  const normalized = code.toLowerCase();
  if (NON_RETRYABLE_PROVIDER_CODES.has(normalized)) {
    const category: ModelErrorCategory =
      normalized.includes('auth') || normalized.includes('permission') || normalized.includes('api_key')
        ? 'auth'
        : 'invalid_request';
    return { retryable: false, category };
  }
  if (RETRYABLE_PROVIDER_CODES.has(normalized)) {
    const category: ModelErrorCategory = normalized.includes('rate')
      ? 'rate_limit'
      : normalized.includes('timeout')
        ? 'timeout'
        : 'upstream';
    return { retryable: true, category };
  }
  return undefined;
}

function matchMessage(
  messages: readonly string[],
  patterns: readonly MessagePattern[],
): { category: ModelErrorCategory } | undefined {
  for (const message of messages) {
    for (const { pattern, category } of patterns) {
      if (pattern.test(message)) return { category };
    }
  }
  return undefined;
}

/**
 * Inspect an arbitrary model-call error and decide whether retrying is safe.
 *
 * Handles the SDK's `OpenRouterError` (`statusCode`/`body`/`headers`), nested
 * `error` objects, mid-stream `Response failed: {...}` wrappers, Node/undici
 * `code` values, and `cause` chains. It never throws on malformed input.
 */
export function classifyModelError(error: unknown): ClassifiedModelError {
  const signals = collectSignals(error);
  const status = signals.statuses[0];
  const providerCode = signals.codes.find(code => isKnownProviderCode(code));
  const networkCode = signals.networkCodes[0];
  const code = providerCode ?? networkCode ?? signals.codes[0];
  const message = pickMessage(signals.messages);

  const base: ClassifiedModelError = {
    retryable: false,
    category: 'unknown',
    message,
    ...(status !== undefined ? { status } : {}),
    ...(code !== undefined ? { code } : {}),
    ...(signals.provider !== undefined ? { provider: signals.provider } : {}),
    ...(signals.retryAfterMs !== undefined ? { retryAfterMs: signals.retryAfterMs } : {}),
  };

  if (signals.aborted) return { ...base, category: 'aborted', retryable: false };

  if (status !== undefined) {
    const classified = classifyStatus(status);
    if (classified && !classified.retryable) return { ...base, ...classified };
  }

  if (providerCode) {
    const classified = classifyProviderCode(providerCode);
    if (classified && !classified.retryable) return { ...base, ...classified };
  }

  const nonRetryableMessage = matchMessage(signals.messages, NON_RETRYABLE_MESSAGE_PATTERNS);
  if (nonRetryableMessage) return { ...base, ...nonRetryableMessage, retryable: false };

  if (status !== undefined) {
    const classified = classifyStatus(status);
    if (classified) return { ...base, ...classified };
  }

  if (providerCode) {
    const classified = classifyProviderCode(providerCode);
    if (classified) return { ...base, ...classified };
  }

  if (networkCode) {
    return {
      ...base,
      retryable: true,
      category: TIMEOUT_NETWORK_CODES.has(networkCode) ? 'timeout' : 'network',
    };
  }

  const retryableMessage = matchMessage(signals.messages, RETRYABLE_MESSAGE_PATTERNS);
  if (retryableMessage) return { ...base, ...retryableMessage, retryable: true };

  return base;
}

/** Convenience wrapper for callers that only need a yes/no answer. */
export function isRetryableModelError(error: unknown): boolean {
  return classifyModelError(error).retryable;
}

/**
 * Pick the wait before retry `retryIndex` (0-based).
 *
 * A provider-supplied `Retry-After` wins over the fixed schedule and is capped
 * at `policy.maxRetryAfterMs`.
 */
export function computeRetryDelayMs(policy: RetryPolicy, retryIndex: number, classified: ClassifiedModelError): number {
  const retryAfter = classified.retryAfterMs;
  if (retryAfter !== undefined) {
    return Math.min(Math.max(0, retryAfter), policy.maxRetryAfterMs);
  }
  if (policy.delaysMs.length === 0) return 0;
  const index = Math.min(Math.max(0, retryIndex), policy.delaysMs.length - 1);
  return policy.delaysMs[index] ?? 0;
}

/** Abort-aware sleep used between retries. Cleans up its listener and timer. */
export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  const delay = Math.max(0, ms);

  if (!signal) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  if (signal.aborted) {
    return Promise.reject(abortReason(signal));
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function abortReason(signal: AbortSignal): unknown {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error(typeof signal.reason === 'string' ? signal.reason : 'Operation aborted');
  error.name = 'AbortError';
  return error;
}

export interface RetryAttemptInfo {
  /** 1-based retry number (the first retry is 1). */
  retry: number;
  maxRetries: number;
  delayMs: number;
  error: ClassifiedModelError;
}

export interface RetryOptions {
  signal?: AbortSignal;
  policy?: RetryPolicy;
  onRetry?: (info: RetryAttemptInfo) => void;
  /** Test seam; defaults to {@link sleepWithSignal}. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/** Thrown when every retry in the policy was used without success. */
export class ModelRetryExhaustedError extends Error {
  readonly attempts: number;
  readonly lastError: unknown;
  readonly classified: ClassifiedModelError;

  constructor(attempts: number, lastError: unknown, classified: ClassifiedModelError) {
    super(`Model call failed after ${attempts} attempt${attempts === 1 ? '' : 's'}: ${classified.message}`, {
      cause: lastError,
    });
    this.name = 'ModelRetryExhaustedError';
    this.attempts = attempts;
    this.lastError = lastError;
    this.classified = classified;
  }
}

/**
 * Run `operation` and retry retryable failures using `policy`.
 *
 * The operation receives the 1-based attempt number so callers can build a
 * resume-safe request (for example, sending an empty input once persisted
 * progress exists). Non-retryable errors are rethrown unchanged; retryable
 * errors that exhaust the policy are wrapped in {@link ModelRetryExhaustedError}.
 */
export async function withModelRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const policy = options.policy ?? DEFAULT_MODEL_RETRY_POLICY;
  const maxRetries = policy.delaysMs.length;
  const sleep = options.sleep ?? sleepWithSignal;
  let attempt = 1;

  for (;;) {
    if (options.signal?.aborted) throw abortReason(options.signal);

    try {
      return await operation(attempt);
    } catch (error) {
      if (options.signal?.aborted) throw abortReason(options.signal);

      const classified = classifyModelError(error);
      if (classified.category === 'aborted' || !classified.retryable) {
        throw error;
      }

      if (attempt > maxRetries) {
        if (maxRetries === 0) throw error;
        throw new ModelRetryExhaustedError(attempt, error, classified);
      }

      const delayMs = computeRetryDelayMs(policy, attempt - 1, classified);
      options.onRetry?.({ retry: attempt, maxRetries, delayMs, error: classified });
      await sleep(delayMs, options.signal);
      attempt++;
    }
  }
}
