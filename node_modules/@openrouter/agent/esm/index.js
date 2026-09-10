// SDK type re-exports — every SDK type used in this package's public API
// so consumers don't need to depend on @openrouter/sdk directly.
// Hooks — interception points for requests and responses
export { SDKHooks } from '@openrouter/sdk/hooks/hooks';
// Message format compatibility helpers
// High-level model calling
export { callModel } from './inner-loop/call-model.js';
export { resumeToolResults, ToolTaskAlreadySettledError, } from './inner-loop/resume-tool-results.js';
export { AgentTranscriptSource } from './lib/agent-tool.js';
export { fromClaudeMessages, toClaudeMessage } from './lib/anthropic-compat.js';
export { hasAsyncFunctions, resolveAsyncFunctions, TOOL_SET_SNAPSHOT, } from './lib/async-params.js';
export { AsyncToolRegistry } from './lib/async-tool-registry.js';
export { fromChatMessages, toChatMessage } from './lib/chat-compat.js';
// Claude constants and type guards
export { ClaudeContentBlockType, NonClaudeMessageRole } from './lib/claude-constants.js';
export { isClaudeStyleMessages } from './lib/claude-type-guards.js';
// Conversation state helpers
export { appendToMessages, CONVERSATION_STATE_VERSION, createInitialState, createRejectedResult, createUnsentResult, deserializeConversationState, generateConversationId, InvalidStateError, partitionToolCalls, serializeConversationState, toolRequiresApproval, UnsupportedStateVersionError, updateState, } from './lib/conversation-state.js';
export { canonicalizeKeyMaterial, DEFAULT_DOOM_LOOP_LADDER, DEFAULT_MAX_ESCALATIONS, DoomLoopMonitor, detectTextRepetition, fingerprintKeyMaterial, fingerprintToolCall, MAX_CANONICALIZE_DEPTH, resolveDoomLoopOption, resolveLoopKeyMaterial, } from './lib/doom-loop.js';
// Lifecycle hooks system (PreToolUse, PostToolUse, Stop, SessionStart, ...).
// Distinct from the SDK transport hooks re-exported above (SDKHooks,
// BeforeRequestHook, HookContext, ...), which intercept HTTP requests.
// Internals (matchesTool, resolveHooks, BUILT_IN_HOOKS, raw Zod schemas) are
// deliberately NOT exported: everything here is semver surface, and the raw
// schema objects are mutable.
export { HooksManager } from './lib/hooks-manager.js';
export { HookName, isAsyncOutput } from './lib/hooks-types.js';
export { DEFAULT_FINAL_RESPONSE_DIRECTIVE, ModelResult } from './lib/model-result.js';
// Next turn params helpers
export { applyNextTurnParamsToRequest, buildNextTurnParamsContext, executeNextTurnParamsFunctions, } from './lib/next-turn-params.js';
// Stop condition helpers
export { finishReasonIs, hasToolCall, isStopConditionMet, maxCost, maxTokensUsed, stepCountIs, } from './lib/stop-conditions.js';
export { extractUnsupportedContent, getUnsupportedContentSummary, hasUnsupportedContent, } from './lib/stream-transformers.js';
// Tool creation helpers (tool also carries tool.background / tool.deferred)
export { markMcp, serverTool, tool } from './lib/tool.js';
export { TASK_TOOL_NAME, TaskToolInputSchema } from './lib/tool-check.js';
export { acquireAll, Semaphore } from './lib/tool-concurrency.js';
// Tool context helpers
export { buildToolExecuteContext, ToolContextStore } from './lib/tool-context.js';
// Real-time tool event broadcasting
export { ToolEventBroadcaster } from './lib/tool-event-broadcaster.js';
export { DEFAULT_TASK_LOG_LIMITS, ToolTask } from './lib/tool-task.js';
export { hasApprovalRequiredTools, hasExecuteFunction, isAgentTool, isAutoResolvableTool, isClientTool, isDeferredHandle, isGeneratorTool, isHITLTool, isLongRunningTool, isManualTool, isMcpTool, isRegularExecuteTool, isServerTool, isToolAsyncSettledEvent, isToolAsyncStartedEvent, isToolCallOutputEvent, isToolPreliminaryResultEvent, isToolResultEvent, isTurnEndEvent, isTurnStartEvent, isUnifiedTool, ToolType, toolHasApprovalConfigured, } from './lib/tool-types.js';
// Turn context helpers
export { buildTurnContext, normalizeInputToArray } from './lib/turn-context.js';
export { OpenRouter } from './openrouter.js';
//# sourceMappingURL=index.js.map