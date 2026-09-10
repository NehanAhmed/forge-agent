/**
 * Tool type enum for enhanced tools
 */
export var ToolType;
(function (ToolType) {
    ToolType["Function"] = "function";
})(ToolType || (ToolType = {}));
/** Runtime guard for {@link DeferredHandle} (structural — brand is type-only). */
export function isDeferredHandle(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value;
    return candidate.__deferred === true && typeof candidate.taskId === 'string';
}
/**
 * Reserved key in the context store for shared context data.
 * The tool name 'shared' is forbidden — it's reserved for this purpose.
 */
export const SHARED_CONTEXT_KEY = 'shared';
/**
 * Type guard: discriminates server-executed tools from client tools.
 *
 * Relies on the `_brand` discriminator that `ServerToolBase` declares and
 * `ClientTool` lacks. `'_brand' in tool` narrows the union to the server
 * branch structurally, so `tool._brand` is reachable without a cast.
 */
export function isServerTool(tool) {
    if (typeof tool !== 'object' || tool === null) {
        return false;
    }
    if (!('_brand' in tool)) {
        return false;
    }
    return tool._brand === 'server-tool';
}
/**
 * Type guard: true if the tool carries the additive MCP brand (see
 * {@link McpBranded}). Structural check on `_mcp`, so no cast is needed.
 */
export function isMcpTool(tool) {
    if (typeof tool !== 'object' || tool === null) {
        return false;
    }
    if (!('_mcp' in tool)) {
        return false;
    }
    return tool._mcp === true;
}
/**
 * Type guard: true if the tool is a client-executed tool (function, generator, or manual).
 */
export function isClientTool(tool) {
    return !isServerTool(tool);
}
/**
 * Type guard to check if a tool is a unified `run`-based tool
 */
export function isUnifiedTool(tool) {
    if (isServerTool(tool)) {
        return false;
    }
    return 'run' in tool.function && typeof tool.function.run === 'function';
}
/**
 * True when the tool can outlive its round: a unified tool with a
 * non-'sync' lifecycle. Drives check-schema generation and placeholder
 * wording.
 */
export function isLongRunningTool(tool) {
    return isUnifiedTool(tool) && tool.function.lifecycle !== 'sync';
}
/**
 * True when the tool is an agent tool (`tool.agent()`): a unified tool
 * whose run drives a child conversation.
 */
export function isAgentTool(tool) {
    return isUnifiedTool(tool) && tool.function.kind === 'agent';
}
/**
 * Type guard to check if a tool has an execute function (regular or
 * generator). Unified `run` tools are excluded — they have their own
 * dispatch and this guard's predicate would misclassify them.
 */
export function hasExecuteFunction(tool) {
    if (isServerTool(tool) || isUnifiedTool(tool)) {
        return false;
    }
    return 'execute' in tool.function && typeof tool.function.execute === 'function';
}
/**
 * Type guard to check if a tool uses a generator (has eventSchema).
 * Unified tools may declare an `eventSchema` for run yields but are not
 * legacy generator tools.
 */
export function isGeneratorTool(tool) {
    if (isServerTool(tool) || isUnifiedTool(tool)) {
        return false;
    }
    return 'eventSchema' in tool.function;
}
/**
 * Type guard to check if a tool is a regular execution tool (not generator)
 */
export function isRegularExecuteTool(tool) {
    return hasExecuteFunction(tool) && !isGeneratorTool(tool);
}
/**
 * Type guard to check if a tool is a manual tool (no execute, no onToolCalled, no run)
 */
export function isManualTool(tool) {
    if (isServerTool(tool)) {
        return false;
    }
    return (!('execute' in tool.function) && !('onToolCalled' in tool.function) && !('run' in tool.function));
}
/**
 * Type guard to check if a tool is a human-in-the-loop tool (has onToolCalled)
 */
export function isHITLTool(tool) {
    if (isServerTool(tool)) {
        return false;
    }
    return 'onToolCalled' in tool.function && typeof tool.function.onToolCalled === 'function';
}
/**
 * Type guard: true if the tool can be auto-resolved within a turn — through a
 * client execute/generator function, a HITL onToolCalled hook, or a unified
 * `run` (which always produces at least a placeholder output). Returns false
 * for manual tools (which always pause) and server tools.
 */
export function isAutoResolvableTool(tool) {
    return hasExecuteFunction(tool) || isHITLTool(tool) || isUnifiedTool(tool);
}
/**
 * Type guard to check if an event is a tool async started event
 */
export function isToolAsyncStartedEvent(event) {
    return event.type === 'tool.async_started';
}
/**
 * Type guard to check if an event is a tool async settled event
 */
export function isToolAsyncSettledEvent(event) {
    return event.type === 'tool.async_settled';
}
/**
 * Type guard to check if an event is a tool preliminary result event
 */
export function isToolPreliminaryResultEvent(event) {
    return event.type === 'tool.preliminary_result';
}
/**
 * Type guard to check if an event is a tool result event
 */
export function isToolResultEvent(event) {
    return event.type === 'tool.result';
}
/**
 * Type guard to check if an event is a tool call output event
 */
export function isToolCallOutputEvent(event) {
    return event.type === 'tool.call_output';
}
/**
 * Type guard to check if an event is a turn start event
 */
export function isTurnStartEvent(event) {
    return event.type === 'turn.start';
}
/**
 * Type guard to check if an event is a turn end event
 */
export function isTurnEndEvent(event) {
    return event.type === 'turn.end';
}
/**
 * Type guard to check if a tool has approval configured at runtime
 */
export function toolHasApprovalConfigured(tool) {
    if (isServerTool(tool)) {
        return false;
    }
    const requireApproval = tool.function.requireApproval;
    return requireApproval === true || typeof requireApproval === 'function';
}
/**
 * Type guard to check if any tools in array have approval configured at runtime
 */
export function hasApprovalRequiredTools(tools) {
    return tools.some(toolHasApprovalConfigured);
}
//# sourceMappingURL=tool-types.js.map