import type { OpenRouterCore } from '@openrouter/sdk/core';
import type { RequestOptions } from '@openrouter/sdk/lib/sdks';
import type * as models from '@openrouter/sdk/models';
import type { $ZodObject, $ZodShape } from 'zod/v4/core';
import type { CallModelInput } from './async-params.js';
import type { DoomLoopOption, DoomLoopVerdict } from './doom-loop.js';
import type { HooksManager } from './hooks-manager.js';
import type { SessionUsageTotals } from './hooks-types.js';
import type { StreamReplay } from './reusable-stream.js';
import type { StreamableOutputItem } from './stream-transformers.js';
import type { ContextInput } from './tool-context.js';
import type { ConversationState, CorrelatedResponseStreamEvent, CorrelatedToolStreamEvent, ParsedToolCall, PendingAsyncTool, StateAccessor, StopWhen, Tool, ToolContextMapWithShared, TurnContext } from './tool-types.js';
/**
 * Default directive appended as a final user message on the forced final
 * turn (`allowFinalResponse` defaulting to on, or explicitly `true`).
 * Forbidding tools via `toolChoice: 'none'` alone is not enough: models
 * that emit tool-call syntax as text (e.g. GLM) will attempt another call
 * and leak it into `content` as unparsed `<tool_call>…` text unless they
 * are told this is the final turn.
 * Pass a non-empty string to `allowFinalResponse` to override the wording,
 * or `''` to append no message at all (legacy behavior).
 */
export declare const DEFAULT_FINAL_RESPONSE_DIRECTIVE = "You have reached the tool-use limit, and tools are no longer available. Do not attempt to call any more tools. Using the information you already have, write your final answer now.";
export interface GetResponseOptions<TTools extends readonly Tool[], TShared extends Record<string, unknown> = Record<string, never>> {
    request: CallModelInput<TTools, TShared>;
    client: OpenRouterCore;
    options?: RequestOptions;
    tools?: TTools;
    stopWhen?: StopWhen<TTools>;
    state?: StateAccessor<TTools>;
    /** Typed context data passed to tools via contextSchema. `shared` key for shared context. */
    context?: ContextInput<ToolContextMapWithShared<TTools, TShared>>;
    /** Zod schema for shared context validation */
    sharedContextSchema?: $ZodObject<$ZodShape>;
    /**
     * Call-level approval check - overrides tool-level requireApproval setting
     * Receives normalized arguments when schema parsing succeeds and raw arguments otherwise
     */
    requireApproval?: (toolCall: ParsedToolCall<TTools[number]>, context: TurnContext) => boolean | Promise<boolean>;
    approveToolCalls?: string[];
    rejectToolCalls?: string[];
    /** Callback invoked at the start of each tool execution turn */
    onTurnStart?: (context: TurnContext) => void | Promise<void>;
    /** Callback invoked at the end of each tool execution turn */
    onTurnEnd?: (context: TurnContext, response: models.OpenResponsesResult) => void | Promise<void>;
    /** Replay history retained for delayed and sequential stream consumers. */
    streamReplay?: StreamReplay;
    /**
     * When the loop exits because `stopWhen` was met and the last response
     * still contained tool calls, make one more model request with no tools so
     * the model produces a final text response. A string value is appended as
     * a final user message.
     */
    allowFinalResponse?: boolean | string;
    /**
     * When true, always throw if the final response has an empty `output` array
     * (legacy behavior). Default false: after at least one completed tool
     * execution round, an empty final turn is retried once and then accepted
     * so tool-terminal runs are not reported as failures.
     */
    strictFinalResponse?: boolean;
    /** Hook system for lifecycle events */
    hooks?: HooksManager;
    /**
     * Doom-loop detection: catch runs that repeat the same tool call with
     * identical arguments (including repeated empty or unparseable calls) or
     * emit the same text over and over, and respond with a graduated ladder
     * (observe → steer → block → stop). `true` enables recommended defaults;
     * an object tunes thresholds. Off by default.
     */
    doomLoop?: DoomLoopOption;
    /**
     * Cancel the whole run: stops the loop at the next boundary and aborts
     * the in-flight API request/stream. See `CallModelInput.signal`.
     */
    signal?: AbortSignal;
    /**
     * Default per-tool execution deadline in milliseconds. A tool-level
     * `timeoutMs` overrides it. See `BaseToolFunction.timeoutMs` for the
     * semantics (bounds the round's wait, not the tool body).
     */
    toolTimeoutMs?: number;
    /**
     * Concurrency limits for tool execution. A bare number is shorthand for
     * `{ round: n }`. `round` bounds simultaneous executions within a tool
     * round (unbounded by default — matching existing behavior); `background`
     * bounds detached background-tool work (default 16).
     */
    toolConcurrency?: number | {
        round?: number;
        background?: number;
    };
    /**
     * Behavior for async tools (`tool.background` / `tool.deferred`).
     */
    asyncTools?: {
        /**
         * What to do when the run would end with background tasks in flight:
         * - `'drain'` (default): wait (bounded by `drainTimeoutMs`) and give the
         *   model up to `maxDrainTurns` extra turns so the final answer
         *   incorporates late results;
         * - `'detach'`: return immediately; tasks keep running and their results
         *   are dropped (persisted as `orphaned` when a StateAccessor exists);
         * - `'cancel'`: abort in-flight tasks and finish.
         */
        onRunEnd?: 'drain' | 'detach' | 'cancel';
        /** Bound on each end-of-run drain wait. Default 30_000. */
        drainTimeoutMs?: number;
        /** Max extra model turns granted to deliver drained results. Default 2. */
        maxDrainTurns?: number;
        /**
         * Model-side check-ins: whether calling a long-running tool with a
         * `taskId` answers status/logs/transcript instead of starting new work.
         * Default true. When false, placeholders revert to "do not call this
         * tool again" and the check schema is not advertised.
         */
        checkins?: boolean;
        /** Max characters for the `transcript` check view. Default 20_000. */
        maxTranscriptChars?: number;
    };
}
/**
 * A wrapper around a streaming response that provides multiple consumption patterns.
 *
 * Allows consuming the response in multiple ways:
 * - `await result.getText()` - Get just the text
 * - `await result.getResponse()` - Get the full response object
 * - `for await (const delta of result.getTextStream())` - Stream text deltas
 * - `for await (const msg of result.getNewMessagesStream())` - Stream cumulative message snapshots
 * - `for await (const event of result.getFullResponsesStream())` - Stream all response events
 *
 * For message format conversion, use the helper functions:
 * - `toChatMessage(response)` for OpenAI chat format
 * - `toClaudeMessage(response)` for Anthropic Claude format
 *
 * All consumption patterns can be used concurrently thanks to the underlying
 * ReusableReadableStream implementation.
 *
 * @template TTools - The tools array type to enable typed tool calls and results
 * @template TShared - The shape of the shared context (inferred from sharedContextSchema)
 */
export declare class ModelResult<TTools extends readonly Tool[], TShared extends Record<string, unknown> = Record<string, never>> {
    private reusableStream;
    private textPromise;
    private options;
    private initPromise;
    private toolExecutionPromise;
    private finalResponse;
    private toolEventBroadcaster;
    private allToolExecutionRounds;
    private resolvedRequest;
    private activeConsumedForcedToolChoiceKey;
    private configuredForcedToolChoiceKey;
    private configuredToolChoice;
    private preparedEffectiveToolChoice;
    private preparedToolChoiceCommit;
    private dispatchedToolChoiceCommit;
    private dispatchedCallerToolChoice;
    private pendingFreshItems;
    private resumingFromClientTools;
    private resumingFromAsyncTools;
    private stateAccessor;
    private currentState;
    private requireApprovalFn;
    private approvedToolCalls;
    private rejectedToolCalls;
    private isResumingFromApproval;
    private turnBroadcaster;
    private initialStreamPipeStarted;
    private initialPipePromise;
    private initialResponse;
    private initialResponseError;
    private readonly streamReplay;
    private contextStore;
    private readonly hooksManager;
    private sessionStartEmitted;
    private sessionEndEmitted;
    private readonly hookDeniedCalls;
    private readonly preparedToolCalls;
    private readonly completedApprovalGates;
    private readonly approvalResponseOccurrences;
    private readonly approvalCallOccurrences;
    private nextApprovalResponseOccurrence;
    private nextApprovalCallOccurrence;
    private pendingModelCall;
    private readonly sessionUsage;
    private readonly doomLoopMonitor;
    private doomLoopStop;
    private pendingDoomLoopSteer;
    private doomLoopRound;
    private readonly doomLoopRoundDecisions;
    private readonly doomLoopRoundKeyMaterial;
    private doomLoopChain;
    private pendingDoomLoopEscalation;
    private readonly doomLoopEscalation;
    private asyncToolRegistry;
    private roundGate;
    private backgroundPool;
    private readonly perToolGates;
    private readonly inflightToolControllers;
    constructor(options: GetResponseOptions<TTools, TShared>);
    /** Lazily create the async tool registry. */
    private ensureAsyncToolRegistry;
    /** Per-tool concurrency gate, created on first use. */
    private perToolGate;
    /**
     * Compose the per-call abort signal for one tool execution: the run
     * signal plus a per-call controller the engine can abort independently
     * (timeout race, cancelTask, cancel()). The tool deadline deliberately
     * does NOT ride the signal here — the race in `executeSingleToolCall`
     * owns exactly one timer (which aborts the controller), so the round's
     * timeout resolution and the body's abort observation cannot disagree.
     */
    private composeToolSignal;
    /** Abort every in-flight tool execution and background task. */
    private abortAllToolWork;
    /**
     * Get or create the unified turn broadcaster (lazy initialization).
     * Broadcasts all API stream events, tool events, and turn delimiters across turns.
     */
    private ensureTurnBroadcaster;
    /**
     * Start piping the initial stream into the turn broadcaster.
     * Idempotent — only starts once even if called multiple times.
     * Wraps the initial stream events with turn.start(0) / turn.end(0) delimiters.
     */
    private startInitialStreamPipe;
    private captureInitialStreamEvent;
    private setReusableStream;
    /**
     * Pipe a follow-up stream into the turn broadcaster and capture the completed response.
     * Emits turn.start / turn.end delimiters around the stream events.
     */
    private pipeAndConsumeStream;
    /**
     * Resolve a tool's result `source` from its call name by looking it up in the
     * configured tools. Used where the concrete tool reference isn't in scope
     * (e.g. a rejected execution). Defaults to `'client'` when not found.
     */
    private toolSourceByName;
    /**
     * Push a tool result event to both the legacy tool event broadcaster
     * and the unified turn broadcaster.
     */
    private broadcastToolResult;
    /**
     * Push a preliminary result event to both the legacy tool event broadcaster
     * and the unified turn broadcaster.
     */
    private broadcastPreliminaryResult;
    /**
     * Set up the turn broadcaster with tool execution and return the consumer.
     * Used by stream methods that need to iterate over all turns.
     */
    private startTurnBroadcasterExecution;
    /**
     * Type guard to check if a value is a non-streaming response
     * Only requires 'output' field and absence of readable stream behavior
     */
    private isNonStreamingResponse;
    /**
     * Materialize a betaResponsesSend result value into a completed response:
     * streaming values are consumed to completion (through the turn
     * broadcaster when one is attached), non-streaming values pass through.
     */
    private materializeResponse;
    /**
     * Get initial response from stream or cached final response.
     * Consumes the stream to completion if needed to extract the response.
     *
     * @returns The complete non-streaming response
     * @throws Error if neither stream nor response has been initialized
     */
    private getInitialResponse;
    private extractCachedCompletion;
    private tryExtractCachedCompletion;
    /**
     * Save response output to state.
     * Appends the response output to the message history and records the response ID.
     *
     * @param response - The API response to save
     */
    private saveResponseToState;
    /**
     * Mark state as complete.
     * Sets the conversation status to 'complete' indicating no further tool execution is needed.
     */
    private markStateComplete;
    /**
     * Save tool results to state.
     * Appends tool execution results to the message history for multi-turn context.
     *
     * @param toolResults - The tool execution results to save
     */
    private saveToolResultsToState;
    /**
     * Check if execution should be interrupted by external signal.
     * Polls the state accessor for interruption flags set by external processes.
     *
     * @param currentResponse - The current response to save as partial state
     * @returns True if interrupted and caller should exit, false to continue
     */
    private checkForInterruption;
    /**
     * Inject a user-role message into the conversation state and into the
     * accumulated request input, so the next turn picks it up. Used by the
     * Stop hook's `appendPrompt` to nudge the model without forcing a resume.
     *
     * This advances observable state (messages/input change) so the next
     * iteration of the execution loop is not a no-op.
     */
    private injectAppendPromptMessage;
    /**
     * Check if stop conditions are met.
     * Returns true if execution should stop.
     *
     * @remarks
     * When no `stopWhen` is specified, this returns false and execution stops
     * only when the model produces a turn without tool calls. Pass an explicit
     * `stopWhen` (e.g. `stepCountIs(n)`, `maxCost(...)`) to bound the loop.
     * This evaluates stop conditions against the complete step history.
     */
    private shouldStopExecution;
    /**
     * Check if any tool calls can be auto-resolved in the current turn.
     * Used to determine if automatic tool execution should be attempted.
     *
     * A tool call is auto-resolvable if its tool has either an `execute` function
     * (regular or generator) or an `onToolCalled` hook (HITL). HITL tools are
     * included here because their hook fires before the model's follow-up request,
     * even when the hook ultimately decides to pause by returning `null`.
     *
     * @param toolCalls - The tool calls to check
     * @returns True if at least one tool call is auto-resolvable
     */
    private hasExecutableToolCalls;
    /**
     * A manual tool call is one whose tool has neither an `execute` function nor
     * an `onToolCalled` hook — i.e. the caller is expected to produce the output
     * externally. HITL tools are auto-resolvable even when they pause, so they
     * are not classified as manual here.
     */
    private isManualToolCall;
    /**
     * Shared helper: execute a single tool and emit the full Pre/Post lifecycle
     * hooks around it.
     *
     * Every code path that ultimately calls `executeTool()` for a user-visible
     * tool call funnels through here so that PreToolUse/PostToolUse/
     * PostToolUseFailure fire consistently — regardless of whether the tool was
     * auto-executed, required approval, or was approved later.
     *
     * Return shape:
     * - `parse_error`: `toolCall.arguments` was a raw JSON string the model
     *   failed to produce valid JSON for. The caller should use the prebuilt
     *   FunctionCallOutputItem and not execute the tool. No hooks fire.
     * - `hook_blocked`: PreToolUse returned `block` (boolean true or a reason
     *   string). The caller should synthesize a denied result without invoking
     *   the tool. The FunctionCallOutputItem is prebuilt for convenience.
     * - `execution`: The tool ran. `result` is the ToolExecutionResult.
     *   `effectiveToolCall` reflects any `mutatedInput` piped by PreToolUse.
     */
    private runToolWithHooks;
    /**
     * Advance the doom-loop round counter and declare the round's calls. Called
     * at every execution-batch boundary (main tool round, auto-approve batch
     * while pausing, approved-on-resume batch). Identical calls WITHIN one round
     * are duplicates — one piece of loop evidence, one shared decision.
     *
     * `batch` is every call the round will make. A round's identity for one tool
     * is the *set* of fingerprints it was called with, and that set has to be
     * complete before any of the round's calls is scored: accumulating it call
     * by call made a round that is a superset of the previous one transiently
     * match it, blocking calls that represented real progress, with the outcome
     * depending on emission order. Declaration is best-effort — a call whose key
     * material is exempt or unhashable is simply left out, and the per-call
     * fallback chain in `enqueueDoomLoopEvaluation` still governs identity at
     * record time.
     *
     * Only calls that the round will actually CHECK are declared. A `loopKey`
     * function is user code that may count or log, so it must not run for a call
     * the detector never evaluates: manual tool calls (no `execute`, no
     * `onToolCalled`) are handed to the caller and never recorded, and every
     * execution path skips them with the same `isAutoResolvableTool` predicate
     * used here. Their absence from the declared set is also correct on its own
     * terms — they are not evidence, so they are not part of the round.
     *
     * INVARIANT — every declared member must eventually be recorded. A call
     * that is declared but never reaches the doom-loop checkpoint is a phantom
     * member of the round's identity: the tool's streak silently resets the
     * moment the phantom stops being emitted (pinned by the "declared-but-
     * never-recorded member" test in doom-loop-fanout.test.ts). The filters
     * below therefore MIRROR every path that skips recording — unknown/manual
     * tools (`isAutoResolvableTool`, also gating executeAutoApproveTools and
     * the approval-resume loop), `hookDeniedCalls` (consumed before the
     * checkpoint in executeSingleToolCall), and `loopKey`-exempt calls (early
     * return in checkDoomLoopBeforeExecution; the same resolution is cached
     * here so both sides agree). If you add a new short-circuit between
     * declaration and the checkpoint — a pre-execution gate, a batch filter —
     * it MUST be reflected here, or fan-out detection degrades silently for
     * that tool rather than failing loudly.
     *
     * KNOWN RESIDUAL (documented, not mirrored): a per-request timeout or
     * abort can cancel a call AFTER declaration but BEFORE its checkpoint,
     * leaving a declared phantom for that round. Bounded and fail-safe: the
     * round-set streak for that tool resets when the phantom stops recurring,
     * while per-call streaks are unaffected — detection degrades to per-call
     * for the affected tool rather than being lost. Un-declaring mid-round
     * would mutate the round's identity while it is being scored, which is the
     * incremental-set order-dependence this design exists to prevent.
     */
    private beginDoomLoopRound;
    /**
     * Evaluate one call against the doom-loop monitor, serialized on
     * `doomLoopChain` so parallel executions record in the deterministic
     * order their evaluations were ENQUEUED (the `.map()` over a round's
     * calls runs synchronously to its first await, i.e. model-emission
     * order) — not in hash-completion order.
     *
     * Applies the fallback invariant: detection must never take down or
     * alter a run except via its defined actions. Unhashable key material
     * (bigint, non-finite numbers, circular/too-deep structures from a
     * computed loopKey) degrades to `fallbackKeyMaterial`; if THAT is also
     * unhashable (parse-error path passes null), detection is skipped for
     * the call and it proceeds normally.
     *
     * Returns the final decision for this call (`action: 'proceed'` when no
     * rung fired or the call is exempt/skipped; `message` carries the
     * verdict's explanation for block outputs). Side effects (steer queue,
     * stop arm) are applied here so every caller shares them.
     */
    private enqueueDoomLoopEvaluation;
    /**
     * Doom-loop checkpoint for one tool call, run before PreToolUse/execution.
     *
     * Resolves the tool's `loopKey` declaration (function |
     * false | absent — see {@link resolveLoopKeyMaterial}) and evaluates the
     * call against the monitor. Ladder actions:
     *
     * - `observe` — hook already emitted, nothing else.
     * - `steer`   — queue a corrective user message for the next model turn.
     * - `block`   — return `blocked` so the caller synthesizes an error output
     *   without executing. The model sees the explanation in the tool result.
     * - `stop`    — arm `doomLoopStop`; ALSO blocks this call (executing a
     *   call the detector just condemned, then stopping, would be
     *   incoherent). The loop halts before the next model request.
     */
    private checkDoomLoopBeforeExecution;
    /**
     * Emit the DoomLoopDetected hook for a verdict and resolve the final
     * action. Handlers may override per event (`overrideAction`), letting
     * userland escalate or de-escalate without reconfiguring the ladder;
     * the LAST override in the chain wins (matching PermissionRequest's
     * last-wins convention). Non-blockable verdicts (text, server tools —
     * the tokens are already emitted / the tool already ran) downgrade a
     * 'block' override to 'observe'. An 'escalate' override is honored only
     * when an escalation mechanism is configured with remaining budget;
     * otherwise it downgrades to 'observe' (never silently to a stronger
     * action).
     */
    private applyDoomLoopVerdict;
    /**
     * Apply the side effects of a resolved doom-loop action shared by every
     * checkpoint: queue steer guidance, arm an escalation for the next
     * request, or arm the stop verdict. 'block' has no shared side effect —
     * the calling checkpoint synthesizes the blocked output itself.
     */
    private applyDoomLoopSideEffects;
    /**
     * Consume a pending escalation into ONE-TURN request overrides:
     *
     * - `model` — replace the request's model for this dispatch only (the
     *   base `resolvedRequest` is never mutated, so the following turn
     *   reverts automatically).
     * - `advisor` — append an `openrouter:advisor` server tool (transcript
     *   forwarded, instructions describing the detected loop) and pin
     *   `toolChoice` to it via `allowed_tools`/`required`, so the stuck model
     *   must consult the advisor before doing anything else this turn.
     *
     * Burns one unit of the escalation budget (persisted via the monitor) at
     * APPLICATION time — verdicts the engine never got to apply (run stopped,
     * paused, or overridden) do not spend.
     */
    private takeDoomLoopEscalationOverrides;
    /**
     * Step-level doom-loop checkpoint on a fresh model response:
     *
     * 1. Text detectors — within-response token repetition + cross-step
     *    identical-text streak.
     * 2. Server-tool fingerprints — server tools (web_search_call etc.) never
     *    pass through runToolWithHooks; their repetition is detected here,
     *    post-execution, from the echoed call fields on the output item.
     *    Post-execution ⇒ block is meaningless (allowBlock: false); the
     *    actions are observe/steer/stop.
     *
     * Runs where the loop already inspects each fresh response, so scripted
     * transcripts exercise it deterministically.
     */
    private checkDoomLoopForResponse;
    /**
     * Queue steer guidance, deduplicating identical messages (one verdict can
     * repeat across calls in a round; the model needs the guidance once).
     */
    private queueDoomLoopSteer;
    /**
     * Inject any queued doom-loop steer messages as a user message before the
     * next model turn. Reuses the Stop-hook appendPrompt injection path, so
     * state/messages advance observably. Called in-loop before each follow-up
     * request AND before every pause-persist, so guidance queued right before
     * a pause lands in the persisted conversation instead of being dropped.
     */
    private flushDoomLoopSteer;
    /**
     * Halt the run for an armed doom-loop stop verdict, keeping the persisted
     * history well-formed: every executable `function_call` in the current
     * response that has no output yet gets a synthesized halt-error output
     * (persisted via the normal tool-result path), so a stateful resume never
     * sends a dangling `function_call` (providers reject those with a 400).
     *
     * Used by every stop site: the pre-round break, the post-round break, the
     * no-tools early return, the allow-final-response gate, and the approval-
     * resume gate.
     *
     * @param resolvedCallIds - call ids that already have outputs this round.
     */
    private sealDoomLoopStop;
    /**
     * Build the per-emit context for lifecycle hook emits. Threads this run's
     * session identity into `context.sessionId` on every emit, so a
     * `HooksManager` instance shared across concurrent runs never leaks one
     * run's id into another's handlers (the manager-level `setSessionId`
     * default is a single mutable field and would be clobbered by the last
     * run to start).
     */
    private hookEmitContext;
    /**
     * Emit PostToolUse / PostToolUseFailure for an async task at settlement —
     * the point its final output actually exists. Round-synchronous tools
     * emit these in runToolWithHooks; async invocations skip that emission
     * (no output yet) and land here instead. `durationMs` is the task's
     * start-to-settle wall clock (includes background-pool queue wait, which
     * counts against the task's own timeout budget). Observation-only — a
     * throwing hook must not break delivery.
     */
    private emitAsyncSettledHooks;
    /**
     * Emit SessionEnd exactly once, and only when a matching SessionStart
     * actually succeeded. Safe to call from multiple teardown paths.
     */
    private emitSessionEndOnce;
    /**
     * Materialize the running session aggregate as an immutable
     * `SessionUsageTotals`. `cost` is present only when at least one response
     * reported it, matching the hook payload's optionality (a summed cost of
     * `0` from cost-less responses would read as "free" rather than "unknown").
     *
     * Single source of truth for both `SessionEnd.totalUsage` and the public
     * `getUsage()` accessor, so the two can never drift.
     */
    private snapshotSessionUsage;
    /**
     * Emit PostModelCall for a completed model response and fold its usage
     * into the session aggregate. One emit per materialized response.
     *
     * Accumulation runs unconditionally — before the hooks short-circuit —
     * because `getUsage()` surfaces these totals to callers who configured no
     * hooks at all. Only the hook emit is gated on a `HooksManager`.
     */
    private emitPostModelCall;
    /**
     * Emit the parked initial/resume PostModelCall once its response has been
     * materialized. No-ops when nothing is parked (e.g. the non-streaming
     * branch already emitted). Safe to call from multiple materialization
     * sites; the first wins.
     */
    private emitPendingModelCallOnce;
    /**
     * Emit the Stop hook when a stopWhen condition halts the loop, and decide
     * whether the loop should resume.
     *
     * - `appendPrompt` values from all handlers are concatenated (newline
     *   separated) and injected as a user message. Honored independently of
     *   forceResume so a handler can nudge the next turn without resuming.
     * - `forceResume` is honored if ANY handler returns it, capped at
     *   MAX_FORCE_RESUME_OVERRIDES consecutive overrides without tool
     *   progress (the caller resets its counter when a tool round or a fresh
     *   response lands).
     *
     * Returns 'resume' when the loop should continue, 'stop' otherwise.
     */
    private runStopHook;
    /**
     * Session teardown for the no-tools stream paths, which bypass
     * executeToolsIfNeeded (the normal SessionEnd site). Materializes the
     * parked model-call telemetry, emits SessionEnd once, and drains pending
     * hook work. Never throws: teardown must not mask the stream's own outcome.
     */
    private finishHooksSessionForStream;
    /**
     * initStream wrapper for the streaming getters. initStream can throw
     * after SessionStart was emitted (e.g. the initial API call fails), and
     * the "Stream not initialized" guard can throw right after it — on both
     * paths the hook session must still be torn down (SessionEnd + drain),
     * otherwise Start/End handlers that treat the pair as a contract see a
     * dangling Start. Teardown is emit-once, so the tools path (which runs
     * its own teardown in executeToolsIfNeeded) is unaffected.
     */
    private initStreamGuarded;
    /**
     * Emit the PermissionRequest hook before the SDK blocks for user approval.
     *
     * Returns the hook's collective decision:
     * - `allow`: the tool should proceed as if auto-approved (skip approval gate)
     * - `deny`: the tool should NOT run; caller should produce a denied result
     * - `ask_user`: fall through to the existing approval flow (the default)
     *
     * Last-wins when multiple handlers return conflicting decisions.
     */
    private emitPermissionRequest;
    private prepareToolCallForApproval;
    private approvalResponseKey;
    private approvalGateKey;
    private assignApprovalCallOccurrences;
    /** Re-check only approval sources whose answer can depend on input. */
    private mutatedInputRequiresApproval;
    private emitPreparedFailure;
    private blockPreparedToolCall;
    private validatePreparedMutation;
    private prepareAfterInitialApproval;
    /**
     * Run the UserPromptSubmit hook, supporting both string and structured
     * inputs. If a handler returns a mutated prompt, the returned object
     * applies the mutation back to the original input shape (string in =
     * string out, message array in = message array out with the latest user
     * text replaced).
     *
     * Throws if any handler rejects the prompt.
     *
     * Returns `undefined` when the hook does nothing, or when no usable prompt
     * could be extracted from a structured input (handler is skipped and a
     * one-time `console.warn` in dev builds explains why).
     */
    private maybeRunUserPromptSubmit;
    /**
     * Settle an async invocation on the approval/resume path, where results
     * are accumulated as `UnsentToolResult`s rather than round outputs.
     *
     * - background: degrade to synchronous execution — the approval flow is
     *   already a discrete resume step, so there is no round to unblock; the
     *   work is awaited and its (validated) value becomes the unsent result.
     * - defer: the external task HAS been started by `start()`; record the
     *   pending placeholder as the unsent result and track the task on
     *   `pendingAsyncTools` so `resumeToolResults` can deliver the real
     *   result later as an envelope.
     */
    private settleAsyncInvocationAsUnsent;
    /**
     * Execute tools that can auto-execute (don't require approval) in parallel.
     *
     * @param toolCalls - The tool calls to execute
     * @param turnContext - The current turn context
     * @returns Array of unsent tool results for later submission
     */
    private executeAutoApproveTools;
    private classifyInitialApprovalCalls;
    private resolveApprovalPhases;
    /**
     * Check for tools requiring approval and handle accordingly.
     * Partitions tool calls into those needing approval and those that can auto-execute.
     *
     * @param toolCalls - The tool calls to check
     * @param currentRound - The current execution round (1-indexed)
     * @param currentResponse - The current response to save if pausing
     * @returns True if execution should pause for approval, false to continue
     * @throws Error if approval is required but no state accessor is configured
     */
    private handleApprovalCheck;
    /**
     * Persist state when one or more HITL tools paused during a round.
     *
     * Mirrors `handleApprovalCheck` so paused HITL calls are surfaced through
     * `pendingToolCalls` (visible via `getPendingToolCalls()` / `getState()`).
     * Sets the status to `awaiting_hitl` so the caller can discriminate HITL
     * pauses from approval pauses.
     *
     * Already-executed results from the same round are persisted on the turn's
     * message history via `saveToolResultsToState` (called by the outer loop
     * before this helper) — no need to duplicate them in `unsentToolResults`.
     *
     * @param currentResponse - The response that produced the paused tool calls
     * @param pausedCalls - HITL tool calls whose `onToolCalled` returned `null`
     */
    private persistHitlPause;
    /**
     * Persist state when the loop stops due to unresolved manual (client-executed)
     * tool calls — tools with neither `execute` nor `onToolCalled`.
     *
     * Mirrors `persistHitlPause` so callers can read the unresolved calls via
     * `getPendingToolCalls()` / `getState()` after the loop ends. Uses the
     * distinct status `awaiting_client_tools` so consumers can discriminate
     * manual pauses from HITL pauses (`awaiting_hitl`).
     *
     * Resume behavior: `awaiting_client_tools` is intentionally NOT treated as a
     * resumable status for `processApprovalDecisions` — manual tools are not
     * approved/rejected via call IDs; the caller executes them externally and
     * typically supplies `function_call_output` items as new input on the next
     * `callModel`. The paused status and calls remain durable until that request
     * produces a response; they are then cleared atomically with the response.
     *
     * Without a `StateAccessor` nothing is persisted (mirroring
     * `persistHitlPause`): `getPendingToolCalls()` returns `[]` and the caller
     * must read the unresolved `function_call` items off `getResponse().output`.
     * Manual tools require a StateAccessor to be recoverable across processes.
     *
     * @param currentResponse - The response that produced the unresolved calls
     * @param unresolvedCalls - Manual (or otherwise non-auto-resolvable) tool calls
     */
    private persistClientToolsPause;
    /**
     * Persist state when one or more deferred tools (`tool.deferred`) started
     * durable external tasks this round. The placeholder outputs are already
     * persisted (the round is fully paired), so — unlike HITL/manual pauses —
     * nothing dangles; the pause exists purely because the model's next turn
     * should wait for the real results.
     *
     * Mirrors `persistHitlPause` in shape. Status `awaiting_async_tools` is
     * distinct from `awaiting_client_tools`: the tool DID execute; only its
     * result is pending. Resumption happens via the deferred tool's
     * `.resolve()` / `.fail()` / `.cancel()` or `resumeToolResults()`.
     */
    private persistAsyncToolPause;
    /**
     * Harvest background tasks that settled since the last flush and inject
     * their outcomes into the conversation as `tool_task_result` envelope
     * messages (user role). Runs at the same safe point as
     * `flushDoomLoopSteer()` — after a fully-paired round, before the next
     * request — because injecting between a dangling `function_call` and its
     * future output would be invalid history.
     *
     * A delivery is forward progress: the text-repetition streak is reset so a
     * model saying "still waiting…" between deliveries is not condemned.
     */
    private flushAsyncToolDeliveries;
    /**
     * Compute the `output` payload sent to the model for a successfully
     * settled tool execution. Routes through `toModelOutput` when the tool
     * defines one (which may itself throw to surface an error), falls back to
     * `JSON.stringify(result)` otherwise, and emits an error envelope when the
     * executor itself reported an error.
     */
    private computeToolOutputForModel;
    /**
     * Execute all tools in a single round in parallel.
     * Emits tool.result events after tool execution completes.
     *
     * @param toolCalls - The tool calls to execute
     * @param turnContext - The current turn context
     * @returns Object with the function call outputs formatted for the API and
     *   the list of HITL tool calls that paused (returned `null` from
     *   `onToolCalled`). Callers should break out of the execution loop when
     *   `pausedCalls` is non-empty rather than sending an incomplete set of
     *   outputs back to the model.
     */
    /**
     * Execute one tool call for a round: resolve the tool, honor any pending
     * PermissionRequest denial, wire preliminary-result broadcasting, and run
     * the tool through the full Pre/Post lifecycle hooks. Returns a tagged
     * outcome consumed by `executeToolRound`'s aggregation loop.
     */
    private executeSingleToolCall;
    /**
     * The `tool_timeout` execution outcome for a call whose deadline fired:
     * the model receives an error output immediately (the abandoned body
     * keeps running detached).
     */
    private buildToolTimeoutOutcome;
    /**
     * PermissionRequest-hook denial for a call, as a `hook_blocked` outcome —
     * or null when the call was not denied. Consumes the entry so a later
     * round with a reused id is not affected.
     */
    private consumeHookDenial;
    /**
     * Race a tool execution against its deadline. Returns `'timeout'` when the
     * deadline fires first — the caller synthesizes the `tool_timeout` output —
     * and aborts the body's controller so cooperative tools stop working. The
     * timer is cleared on settle either way.
     */
    private raceToolDeadline;
    private executeToolRound;
    /**
     * Handle one async invocation from a round.
     *
     * Background: start the work under the background pool, race it against
     * the grace window — settle in time and the call yields a plain
     * synchronous output (no async machinery visible); otherwise emit the
     * pending placeholder and let the registry track the task.
     *
     * Deferred: emit the placeholder and report the task for the pause path.
     */
    private handleAsyncInvocation;
    /**
     * Reject a `ctx.defer()` taskId already claimed by ANOTHER pending task.
     * Task ids are the resolution key (resumeToolResults matches on them), so
     * a duplicate would make one of the two calls unresolvable — the
     * conversation would wait forever. Caller-supplied ids
     * (`ctx.defer(ticket.id)`) carry no uniqueness guarantee; reject the
     * collision at start time, when the tool can still see it.
     * @returns the error output for the colliding call, or null when unique.
     */
    private rejectDuplicateTaskId;
    /**
     * A mutable binding between a tool call's run context and its (created
     * later) ToolTask. `ctx.log()` entries before the task exists are
     * buffered; `ctx.onMessage()` registrations are forwarded on bind.
     */
    private createRunBinding;
    /**
     * Run a background tool's work under the tool's own concurrency gate AND
     * the background pool. The round path does not touch the per-tool gate
     * for background lifecycles (the thunk had not run yet), so the gate is
     * acquired here for the body's lifetime — `maxConcurrency` bounds
     * executions of the BODY, wherever they run.
     *
     * Acquisition order: per-tool gate FIRST, then the pool. The narrow gate
     * is where a saturated tool's excess calls queue — queuing them on the
     * shared pool instead would let 16 waiters on one maxConcurrency:2 tool
     * hold every global slot while only two bodies run, starving every other
     * background tool. Order is deadlock-safe: only background bodies take
     * the per-tool gate (the round path skips it for them), and every body
     * acquires in this same fixed order.
     *
     * Queue wait counts against the task's own timeout (tracked by the
     * registry); an abort observed before the slots free up short-circuits
     * without running the body.
     */
    private runBackgroundWork;
    /** Broadcast a `tool.async_started` event on the turn broadcaster. */
    private broadcastAsyncStarted;
    /** Broadcast a `tool.async_settled` event on the turn broadcaster. */
    private broadcastAsyncSettled;
    /**
     * Build the pending placeholder `function_call_output` for an async tool
     * call. Pairs the `function_call` immediately (providers 400 on unpaired
     * calls in follow-up history); the real result arrives later as a
     * `tool_task_result` envelope. The note steers the model: with check-ins
     * enabled it points at the universal `task` tool; with check-ins
     * disabled it forbids re-calling entirely.
     */
    private buildPendingPlaceholder;
    /**
     * True when the built-in task tool is active for this run. Mirrors
     * `needsTaskTool` exactly: when a user tool claims the reserved name the
     * built-in is not registered, so calls named "task" must NOT be
     * intercepted — they belong to the user's tool.
     */
    private taskToolActive;
    /**
     * Answer a call to the universal `task` tool: resolve the taskId to its
     * live registry task (or persisted pendingAsyncTools entry, post-restart)
     * and its OWNING tool, then dispatch by action:
     *
     * - `check` (default): the owning tool's `check.execute` when declared
     *   (custom `params` validated against `check.schema`), else the SDK
     *   default status / logs / transcript views.
     * - `steer`: deliver `message` to the run body's inbox.
     * - `result`: the final result if settled, else the status view.
     * - `cancel`: cancel the task.
     */
    private answerTaskToolCall;
    /** `task` tool, action=cancel. */
    private taskToolCancel;
    /** `task` tool, action=steer. Returns [result, error?] for `answer`. */
    private taskToolSteer;
    /**
     * `task` tool, action=check (and the status-view fallback for `result`
     * on an unsettled task): the owning tool's `check.execute` when
     * declared, else the SDK default views — live-task-backed when the task
     * is in this process, persisted-state-backed post-restart.
     */
    private taskToolCheck;
    /** Build the narrow ToolTaskHandle façade for check.execute handlers. */
    private buildTaskHandle;
    /**
     * Resolve async functions for the current turn.
     * Updates the resolved request with turn-specific parameter values.
     *
     * @param turnContext - The turn context for parameter resolution
     */
    private resolveAsyncFunctionsForTurn;
    /**
     * Apply nextTurnParams from executed tools.
     * Allows tools to modify request parameters for subsequent turns.
     *
     * @param toolCalls - The tool calls that were just executed
     */
    private applyNextTurnParams;
    /**
     * Make a follow-up API request with tool results.
     * Uses streaming and pipes events through the turn broadcaster when available.
     */
    private makeFollowupRequest;
    /**
     * Append a response's output items to the accumulated request input,
     * exactly as `makeFollowupRequest` does before adding tool results. Used
     * by the end-of-run drain, where envelope messages must land AFTER the
     * final assistant output in the request.
     */
    private accumulateResponseIntoInput;
    /**
     * End-of-run handling for async background tasks still in flight (or
     * settled but unharvested) when the loop is about to finalize.
     *
     * - `'drain'` (default): wait for tasks (bounded by `drainTimeoutMs`),
     *   inject their results, and give the model up to `maxDrainTurns` extra
     *   `toolChoice: 'none'` turns so the final answer incorporates them.
     * - `'detach'`: return immediately; still-working tasks are marked
     *   `orphaned` on persisted state and their eventual results are dropped.
     * - `'cancel'`: abort in-flight tasks and finish.
     *
     * @returns the (possibly replaced) final response.
     */
    private handleRunEndAsyncTasks;
    /**
     * Broadcast every unharvested settlement as dropped (no in-run delivery),
     * mirror the terminal status onto persisted `pendingAsyncTools`, and
     * append a terminal `tool_task_result` envelope to persisted history.
     *
     * The status mirror prevents a stuck resume: an entry persisted as
     * `working` for a task that only ever settles in-memory (abortAll at
     * drain exhaustion / run cancel) would pin a later cross-process resume
     * to `awaiting_async_tools` forever. The envelope keeps the pending
     * placeholder's "the result will be delivered" promise honest for
     * PERSISTED conversations: the run is over (no more model dispatch), but
     * the terminal outcome rides along on the next `callModel({ state })`
     * instead of vanishing.
     */
    private dropSettledTasks;
    /**
     * `onRunEnd: 'detach'`: mark still-working tasks orphaned on persisted
     * state (their eventual results are dropped) and drop unharvested
     * settlements.
     */
    private detachWorkingTasks;
    /**
     * Make a final no-tool-calls request to coerce a text response after the
     * loop was halted by `stopWhen` mid-tool-call. Reuses the resolved request
     * so `instructions`, `model`, and other API fields ride along unchanged.
     * `tools` stays in the request with `toolChoice: 'none'` — forbidding
     * calls while keeping the prompt-cache prefix intact (stripping the tools
     * block would bust the cache). The caller is expected to have already
     * executed the pending tool calls and to pass their outputs in
     * `toolOutputs` so every function_call in the input has a matching output.
     */
    private makeFinalResponseRequest;
    /**
     * Validate the final response has required fields.
     *
     * Message prefixes (`Invalid final response: missing required fields`,
     * `Invalid final response: empty or invalid output`) are load-bearing —
     * callers and tests match on them. Detail is appended after an em dash;
     * never reword the prefixes.
     *
     * The detail exists because the bare "empty or invalid output" message was
     * routinely misread as "the model returned a tool call and validation
     * rejected it" (issue #45). It does not: this is a pure array-length check,
     * so a `function_call`-only output passes. Naming the actual defect —
     * empty array vs. wrong type — stops that misdiagnosis at the error string.
     *
     * @param response - The response to validate
     * @param allowEmptyOutput - When true, tolerate an empty (but present) output array
     * @throws Error if response is missing required fields or has invalid output
     */
    private validateFinalResponse;
    /**
     * Re-send the current resolved request (same accumulated input) once.
     * Used when a follow-up after tool execution returned an empty `output`.
     *
     * `toolChoice` is forced to `'none'` when tools are present (mirroring
     * `makeFinalResponseRequest`) so the retry coerces a text turn: on the
     * natural-loop-completion path the resolved request still carries tools,
     * and a retry that emitted a fresh `function_call` would pass
     * `validateFinalResponse` but never be executed — silently dropping a
     * proposed tool call. Tools stay in the request to keep the prompt-cache
     * prefix intact.
     */
    private retryCurrentRequest;
    /**
     * Build the RequestOptions for one API dispatch, composing the run-level
     * cancellation signal (`options.signal`) with the caller's RequestOptions.
     *
     * The SDK only auto-wires `timeoutMs` into an abort signal when NO signal
     * is present on the options — a supplied signal silently disables the
     * timeout. Composing here keeps both: each request is bounded by
     * whichever of {run signal, caller signal, per-request timeout} fires
     * first. MUST be called once per dispatch — `AbortSignal.timeout()`
     * starts counting at creation, so a cached composite would burn its
     * budget across turns instead of per request.
     *
     * Also the per-request fail-fast checkpoint: an already-aborted run
     * signal throws its abort reason here, before any network I/O.
     */
    private dispatchRequestOptions;
    /**
     * Resolve async functions in the request for a given turn context.
     * Extracts non-function fields and resolves any async parameter functions.
     *
     * @param context - The turn context for parameter resolution
     * @returns The resolved request without async functions
     */
    private resolveRequestForContext;
    /**
     * Record the freshly-resolved caller choice before deriving its wire value.
     * An unforced turn clears the consumed key, re-arming the same forced value
     * if it appears again later. A different forced key re-arms immediately.
     */
    private applyResolvedForcedToolChoicePolicy;
    /**
     * Derive the caller-configured tool choice for the active logical run.
     * Engine-owned one-turn overrides (`none` for finalization, or a pinned
     * doom-loop advisor) are applied after this helper and therefore still win.
     */
    private applyForcedToolChoicePolicy;
    /**
     * Bind the prepared caller-policy transition to the actual wire request.
     * Engine-owned overrides (for example a forced advisor consult) deliberately
     * produce a different semantic key and therefore cannot commit caller state.
     */
    private beginToolChoiceDispatch;
    /**
     * Commit only after the prepared caller choice reached the wire and a
     * response was materialized. A pause before dispatch leaves persisted state
     * untouched; a forced choice is consumed only when that response called a
     * tool.
     */
    private commitToolChoiceDispatch;
    /** Clear all runtime and persisted policy state for a terminal run exit. */
    private resetForcedToolChoicePolicy;
    /**
     * Apply `onResponseReceived` hooks to the freshly-supplied input items
     * only, without re-hooking historical items that live in
     * `currentState.messages`. Historical `function_call` items are passed to
     * `applyOnResponseReceivedHooks` purely as callId → toolName
     * name-resolution context and are dropped from the returned array.
     *
     * This keeps hooks idempotent across `callModel` invocations on the same
     * conversation: the first call hooks the caller-supplied output, and
     * subsequent calls (which rehydrate state) do not re-fire it.
     *
     * @param freshItems - Items newly supplied this turn (not yet hooked).
     *   May contain any mix of InputsUnion array members — only
     *   `function_call_output` items are affected by hooks; everything else
     *   is returned unchanged.
     * @param historicalItems - Existing messages from loaded state. Only
     *   `function_call` entries are consulted for name resolution; no other
     *   items are inspected and none are mutated.
     * @param turnContext - Turn context for hook invocation
     * @returns The fresh items in original order, with `output` rewritten on
     *   any `function_call_output` whose matching HITL tool defines
     *   `onResponseReceived`.
     */
    private applyHooksToFreshItems;
    /**
     * Safely persist state with error handling.
     * Wraps state save operations to ensure failures are properly reported.
     *
     * @param updates - Optional partial state updates to apply before saving
     * @throws Error if state persistence fails
     */
    private saveStateSafely;
    /**
     * Remove optional properties from state when they should be cleared.
     * Uses delete to properly remove optional properties rather than setting undefined.
     *
     * @param props - Array of property names to remove from current state
     */
    private clearOptionalStateProperties;
    /**
     * Initialize the stream if not already started
     * This is idempotent - multiple calls will return the same promise
     */
    private initStream;
    /**
     * Process approval/rejection decisions and resume execution
     */
    private processApprovalDecisions;
    /**
     * Continue execution with unsent tool results
     */
    private continueWithUnsentResults;
    /**
     * Execute tools automatically if they are provided and have execute functions
     * This is idempotent - multiple calls will return the same promise
     */
    private executeToolsIfNeeded;
    /**
     * Internal helper to get the text after tool execution
     */
    private getTextInternal;
    /**
     * Get just the text content from the response.
     * This will consume the stream until completion, execute any tools, and extract the text.
     */
    getText(): Promise<string>;
    /**
     * Get the complete response object including usage information.
     * This will consume the stream until completion and execute any tools.
     * Returns the full OpenResponsesResult with usage data (inputTokens, outputTokens, cachedTokens, etc.)
     *
     * Note: in a multi-round tool loop this is the **final** round's response
     * only — its `usage` block covers that one generation, not the run. For
     * aggregate totals across every model call, use `getUsage()`.
     */
    getResponse(): Promise<models.OpenResponsesResult>;
    /**
     * Stream all response events as they arrive across all turns.
     * Multiple consumers can iterate over this stream concurrently.
     * Includes API events, tool events, and turn.start/turn.end delimiters.
     */
    getFullResponsesStream(): AsyncIterableIterator<CorrelatedResponseStreamEvent<TTools>>;
    /**
     * Stream only text deltas as they arrive from all turns.
     * This filters the full event stream to only yield text content,
     * including text from follow-up responses in multi-turn tool loops.
     */
    getTextStream(): AsyncIterableIterator<string>;
    /**
     * Stream all output items cumulatively as they arrive.
     * Items are emitted with the same ID but progressively updated content as streaming progresses.
     * Also yields tool results (function_call_output) after tool execution completes.
     *
     * Item types include:
     * - message: Assistant text responses (emitted cumulatively as text streams)
     * - function_call: Tool calls (emitted cumulatively as arguments stream)
     * - reasoning: Model reasoning (emitted cumulatively as thinking streams)
     * - web_search_call: Web search operations
     * - file_search_call: File search operations
     * - image_generation_call: Image generation operations
     * - function_call_output: Results from executed tools
     *
     * This stream carries **output items only** — no usage or response-level
     * metadata. The `response.completed` events (which hold each round's usage
     * block) are not surfaced here, and `getResponse()` afterwards returns only
     * the *final* round's response, so a multi-round tool loop's `tool_calls`
     * generations are not accounted for by either. For usage, reach for:
     * - `getUsage()` — aggregate token/cost totals across every round
     * - the `PostModelCall` hook — one emit per model call, with
     *   `turnType`/`turnNumber` and that call's own `usage`
     * - `getFullResponsesStream()` — raw events including each round's
     *   `response.completed`, and therefore its per-round usage block
     */
    getItemsStream(): AsyncIterableIterator<StreamableOutputItem<TTools>>;
    /**
     * Compute the runtime allow-list of item types that `getItemsStream()`
     * may yield, derived from the tools actually passed to callModel. The
     * three return modes correspond to the compile-time narrowing:
     *
     * - `acceptAll: true` — no tools or fully-unconstrained TTools; the
     *   yielded union is the widest `StreamableOutputItem`.
     * - Specific `allowed` set — client tools contribute
     *   `function_call` / `function_call_output`; mapped server tools
     *   contribute their SDK output item type literal
     *   (`web_search_call`, `file_search_call`, `image_generation_call`).
     * - `acceptGenericServerItem: true` — at least one server tool has a
     *   type the agent SDK does not have a dedicated output mapping for
     *   (e.g. `openrouter:datetime`, `mcp`, new SDK additions). Any
     *   non-client item type is accepted because these items pass through
     *   as `OutputServerToolItem`, whose `type` field is an open `string`.
     */
    private computeItemStreamScope;
    /**
     * @deprecated Use `getItemsStream()` instead. This method only streams messages,
     * while `getItemsStream()` streams all output item types (messages, function_calls,
     * reasoning, etc.) with cumulative updates.
     *
     * Stream cumulative message snapshots as content is added in responses format.
     * Each iteration yields an updated version of the message with new content.
     * Also yields function_call items and FunctionCallOutputItem after tool execution completes.
     * Returns OutputMessage, OutputFunctionCallItem, or FunctionCallOutputItem
     * compatible with OpenAI Responses API format.
     */
    getNewMessagesStream(): AsyncIterableIterator<models.OutputMessage | models.FunctionCallOutputItem | models.OutputFunctionCallItem>;
    /**
     * Stream only reasoning deltas as they arrive from all turns.
     * This filters the full event stream to only yield reasoning content,
     * including reasoning from follow-up responses in multi-turn tool loops.
     */
    getReasoningStream(): AsyncIterableIterator<string>;
    /**
     * Stream tool call argument deltas and preliminary results from all turns.
     * Preliminary results are streamed in REAL-TIME as generator tools yield.
     * - Tool call argument deltas as { type: "delta", content: string }
     * - Preliminary results as { type: "preliminary_result", toolCallId, result }
     */
    getToolStream(): AsyncIterableIterator<CorrelatedToolStreamEvent<TTools>>;
    /**
     * Get all tool calls from the completed response (before auto-execution).
     * Note: If tools have execute functions, they will be automatically executed
     * and this will return the tool calls from the initial response.
     * Returns structured tool calls with parsed arguments.
     */
    getToolCalls(): Promise<ParsedToolCall<TTools[number]>[]>;
    /**
     * Stream structured tool call objects as they're completed.
     * Each iteration yields a complete tool call with parsed arguments.
     */
    getToolCallsStream(): AsyncIterableIterator<ParsedToolCall<TTools[number]>>;
    /**
     * Returns an async iterable that emits a full context snapshot every time
     * any tool calls ctx.update(). Can be consumed concurrently with getText(),
     * getToolStream(), etc.
     *
     * @example
     * ```typescript
     * for await (const snapshot of result.getContextUpdates()) {
     *   console.log('Context changed:', snapshot);
     * }
     * ```
     */
    getContextUpdates(): AsyncGenerator<ToolContextMapWithShared<TTools, TShared>>;
    /**
     * Cancel the underlying stream and all consumers, and abort in-flight
     * tool executions and background tasks (their `ctx.signal` fires).
     *
     * Note: prior releases only cancelled the stream; aborting tool work is
     * new with async tool support.
     */
    cancel(): Promise<void>;
    /**
     * Snapshot of every async tool task tracked by this run (background and
     * deferred), including settled ones.
     */
    getAsyncTasks(): PendingAsyncTool[];
    /**
     * Cancel one in-process async task by its task id. Background tasks abort
     * their `ctx.signal`; the model receives a `status: 'cancelled'` envelope
     * at the next delivery point so it is not left waiting forever.
     *
     * For deferred tasks in a paused (possibly other-process) conversation,
     * use the deferred tool's `.cancel()` method instead.
     *
     * @returns true when a working task was found and cancelled.
     */
    cancelTask(taskId: string, reason?: string): boolean;
    /**
     * Send a steering message to a running in-process task. Delivered to the
     * run body's `ctx.onMessage` handler (queued until one registers). Agent
     * tools (`tool.agent()`) auto-forward messages into the child
     * conversation as user messages at the child's next turn boundary.
     *
     * Throws for deferred tasks — their work runs in an external system;
     * steer it there.
     *
     * @returns true when a working task received (or queued) the message.
     */
    sendToTask(taskId: string, message: unknown): boolean;
    /**
     * Queue a user-role message for injection into this run's conversation at
     * the next safe turn boundary (the same mechanism doom-loop steer
     * guidance uses — never between a dangling `function_call` and its
     * output). The primary consumer is `tool.agent()`, which forwards
     * steering messages into child conversations through this.
     *
     * Delivery requires a next dispatch: boundaries are post-tool-round
     * follow-ups, pause-persists, and end-of-run drain turns. A message
     * queued while the run is composing its FINAL text response (no further
     * dispatch of any kind) has no boundary left and is not delivered —
     * steer while the run still has work in flight.
     */
    queueUserMessage(text: string): void;
    /**
     * Check if the conversation requires human/client input to continue.
     * Returns true when the conversation is paused waiting on the CALLER —
     * approval/rejection (`awaiting_approval`), HITL tool resume
     * (`awaiting_hitl`), client-executed manual tools
     * (`awaiting_client_tools`), or an external async task resolution
     * (`awaiting_async_tools`, cleared via the deferred tool's `.resolve()` /
     * `.fail()` / `.cancel()` or `resumeToolResults()` — NOT via
     * `approveToolCalls`). Also returns true whenever `pendingToolCalls` is
     * populated regardless of status. To branch on the pause KIND, read
     * `(await getState()).status` instead.
     */
    requiresApproval(): Promise<boolean>;
    /**
     * Get the pending tool calls that require approval.
     * Returns empty array if no approvals needed.
     */
    getPendingToolCalls(): Promise<ParsedToolCall<TTools[number]>[]>;
    /**
     * Get the current conversation state.
     * Useful for inspection, debugging, or custom persistence.
     * Note: This returns the raw ConversationState for inspection only.
     * To resume a conversation, use the StateAccessor pattern.
     */
    getState(): Promise<ConversationState<TTools>>;
    /**
     * The doom-loop verdict that stopped this run, or null when the run was
     * not stopped by doom-loop detection (including when detection is off).
     * Resolves after the tool loop settles. For per-event observation use the
     * `DoomLoopDetected` hook.
     */
    getDoomLoopVerdict(): Promise<DoomLoopVerdict | null>;
    /**
     * Aggregate token/cost usage across **every** model call this run made —
     * the initial request, each tool-round follow-up, the empty-final retry,
     * the `allowFinalResponse` final turn, and approval-resume requests.
     *
     * This is the pull-based counterpart to the `SessionEnd.totalUsage` hook
     * payload (same `SessionUsageTotals` shape, same numbers) and exists
     * because `getResponse()` returns only the **final** round's response: in a
     * multi-round tool loop the `tool_calls` generations' tokens are otherwise
     * unreachable, and `getItemsStream()` carries output items only — no
     * `response.completed` usage block.
     *
     * Gates on run completion the same way `getResponse()` does, so totals are
     * final whether you await it directly, after `getResponse()`, or after
     * consuming any of the streaming getters — except on an approval-resumed
     * run, where reading usage never advances the tool loop: the resume
     * request's own generation is awaited and counted, but no further rounds
     * are driven, so totals can be mid-run. Await `getResponse()`/`getText()`
     * first for final totals there. On a run that paused (approval / HITL) or
     * failed, it returns the totals accrued so far — `modelCalls: 0` with
     * zeroed tokens when no model call ever completed.
     *
     * Unlike `getResponse()`, this never rejects: a failed run still consumed
     * tokens, and cost accounting typically runs in a `finally`/`catch` where a
     * second throw would mask the run's original error. Await the run itself
     * (e.g. `getResponse()`) if you need to observe the failure.
     *
     * `cost` is present only when the server reported cost accounting for at
     * least one call; a `0` would be indistinguishable from "free".
     *
     * For per-call granularity use the `PostModelCall` hook (one emit per model
     * call, with `turnType`/`turnNumber`) or `getFullResponsesStream()`, whose
     * `response.completed` events carry each round's own usage block.
     */
    getUsage(): Promise<SessionUsageTotals>;
}
//# sourceMappingURL=model-result.d.ts.map