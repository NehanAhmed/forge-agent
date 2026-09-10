import { applyNextTurnParamsToRequest, executeNextTurnParamsFunctions, } from './next-turn-params.js';
import { extractToolCallsFromResponse, responseHasToolCalls } from './stream-transformers.js';
import { isFunctionCallItem } from './stream-type-guards.js';
import { executeTool, findToolByName, isAsyncToolInvocation } from './tool-executor.js';
import { isAutoResolvableTool, isMcpTool, isUnifiedTool } from './tool-types.js';
import { buildTurnContext } from './turn-context.js';
/**
 * Execute tool calls and manage multi-turn conversations
 * This orchestrates the loop of: request -> tool calls -> execute -> send results -> repeat
 *
 * @param sendRequest - Function to send a request and get a response
 * @param initialInput - Starting input for the conversation
 * @param initialRequest - Full initial request with all parameters
 * @param tools - Enhanced tools with Zod schemas and execute functions
 * @param apiTools - Converted tools in API format (JSON Schema)
 * @param options - Execution options
 * @returns Result containing final response and all execution data
 */
// biome-ignore lint: parameters match the public API shape
export async function executeToolLoop(sendRequest, initialInput, initialRequest, tools, apiTools, options = {}) {
    const onPreliminaryResult = options.onPreliminaryResult;
    const allResponses = [];
    const toolExecutionResults = [];
    let conversationInput = initialInput;
    let currentRequest = {
        ...initialRequest,
    };
    let currentRound = 0;
    let currentResponse;
    // Initial request
    currentResponse = await sendRequest(conversationInput, apiTools);
    allResponses.push(currentResponse);
    // Loop until no more tool calls (model decides when to stop)
    while (responseHasToolCalls(currentResponse)) {
        currentRound++;
        // Extract tool calls from response
        const toolCalls = extractToolCallsFromResponse(currentResponse);
        if (toolCalls.length === 0) {
            break;
        }
        // Check if any tools can be auto-resolved (execute or HITL onToolCalled)
        const hasExecutableTools = toolCalls.some((toolCall) => {
            const tool = findToolByName(tools, toolCall.name);
            return tool && isAutoResolvableTool(tool);
        });
        // If no auto-resolvable tools, return (manual execution mode)
        if (!hasExecutableTools) {
            break;
        }
        // Execute all tool calls in parallel (parallel tool calling)
        const toolCallPromises = toolCalls.map((toolCall) => executeOrchestratedCall(toolCall, {
            tools,
            response: currentResponse,
            request: currentRequest,
            round: currentRound,
            onPreliminaryResult,
        }));
        // Wait for all tool executions to complete in parallel
        const settledResults = await Promise.allSettled(toolCallPromises);
        // Process settled results, handling both fulfilled and rejected promises
        const roundResults = [];
        settledResults.forEach((settled, i) => {
            const toolCall = toolCalls[i];
            if (!toolCall) {
                return;
            }
            const errorResult = (error) => {
                const failedTool = findToolByName(tools, toolCall.name);
                return {
                    toolCallId: toolCall.id,
                    toolName: toolCall.name,
                    source: failedTool !== undefined && isMcpTool(failedTool) ? 'mcp' : 'client',
                    result: null,
                    error,
                };
            };
            if (settled.status === 'fulfilled') {
                // This legacy loop predates async tools and only understands
                // synchronous execution results (background/deferred invocations
                // are handled by ModelResult's live loop). Surface an explicit
                // error rather than silently dropping the call — an unpaired
                // function_call would poison any history built from these results.
                if (settled.value !== null && isAsyncToolInvocation(settled.value)) {
                    roundResults.push(errorResult(new Error(`Tool "${toolCall.name}" uses an async lifecycle (background/deferred), which executeToolLoop does not support — run it through callModel instead.`)));
                }
                else if (settled.value !== null) {
                    roundResults.push(settled.value);
                }
            }
            else {
                // Promise rejected - create error result
                roundResults.push(errorResult(settled.reason instanceof Error ? settled.reason : new Error(String(settled.reason))));
            }
        });
        toolExecutionResults.push(...roundResults);
        // Execute nextTurnParams functions for tools that were called
        const computedParams = await executeNextTurnParamsFunctions(toolCalls, tools, currentRequest);
        // Apply computed parameters to request
        if (Object.keys(computedParams).length > 0) {
            currentRequest = applyNextTurnParamsToRequest(currentRequest, computedParams);
            conversationInput = currentRequest.input ?? conversationInput;
        }
        // Build array input with all output from previous response plus tool results
        // The API expects continuation via previousResponseId, not by including outputs
        // For now, we'll keep the conversation going via previousResponseId
        // conversationInput is updated above if nextTurnParams modified it
        // Note: The OpenRouter Responses API uses previousResponseId for continuation
        // Tool results are automatically associated with the previous response's tool calls
        // Send updated conversation to API - this should use previousResponseId
        currentResponse = await sendRequest(conversationInput, apiTools);
        allResponses.push(currentResponse);
    }
    return {
        finalResponse: currentResponse,
        allResponses,
        toolExecutionResults,
        conversationInput,
    };
}
/**
 * Convert tool execution results to a map for easy lookup
 */
export function toolResultsToMap(results) {
    const map = new Map();
    for (const result of results) {
        map.set(result.toolCallId, {
            result: result.result,
            preliminaryResults: result.preliminaryResults,
        });
    }
    return map;
}
/**
 * Build a summary of tool executions for debugging/logging
 */
export function summarizeToolExecutions(results) {
    const lines = [];
    for (const result of results) {
        if (result.error) {
            lines.push(`❌ ${result.toolName} (${result.toolCallId}): ERROR - ${result.error.message}`);
        }
        else {
            const prelimCount = result.preliminaryResults?.length ?? 0;
            const prelimInfo = prelimCount > 0 ? ` (${prelimCount} preliminary results)` : '';
            lines.push(`✅ ${result.toolName} (${result.toolCallId}): SUCCESS${prelimInfo}`);
        }
    }
    return lines.join('\n');
}
/**
 * Check if any tool executions had errors
 */
export function hasToolExecutionErrors(results) {
    return results.some((result) => result.error !== undefined);
}
/**
 * Get all tool execution errors
 */
export function getToolExecutionErrors(results) {
    return results
        .filter((result) => result.error !== undefined)
        .map((result) => result.error);
}
/**
 * Execute one orchestrated tool call: resolve the tool, rebuild the raw
 * `function_call` item, build the turn context, and run the tool. Returns
 * `null` for calls with nothing to execute (manual tools), an error-shaped
 * result for unknown tools.
 */
async function executeOrchestratedCall(toolCall, round) {
    const tool = findToolByName(round.tools, toolCall.name);
    if (!tool) {
        // Tool not found in definitions
        return {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            source: 'client',
            result: null,
            error: new Error(`Tool "${toolCall.name}" not found in tool definitions`),
        };
    }
    if (!isAutoResolvableTool(tool)) {
        // Tool has no execute/onToolCalled - return null to filter out
        return null;
    }
    // Async lifecycles are unsupported here — short-circuit BEFORE running
    // the body. This matters for deferred tools especially: their run()
    // executes in-round and would open an external ticket that this loop can
    // never resolve (an orphan external task).
    if (isUnifiedTool(tool) && tool.function.lifecycle && tool.function.lifecycle !== 'sync') {
        return {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            source: isMcpTool(tool) ? 'mcp' : 'client',
            result: null,
            error: new Error(`Tool "${toolCall.name}" uses an async lifecycle ('${tool.function.lifecycle}'), which executeToolLoop does not support — run it through callModel instead.`),
        };
    }
    // Find the raw tool call from the response output
    const rawToolCall = round.response.output.find((item) => isFunctionCallItem(item) && item.callId === toolCall.id);
    if (!rawToolCall) {
        throw new Error(`Could not find raw tool call for ${toolCall.id}`);
    }
    // Convert to FunctionCallItem format
    const openResponsesToolCall = {
        type: 'function_call',
        callId: rawToolCall.callId,
        name: rawToolCall.name,
        arguments: rawToolCall.arguments,
        id: rawToolCall.callId,
        status: rawToolCall.status,
    };
    // Build turn context with full information
    const turnContext = buildTurnContext({
        numberOfTurns: round.round,
        toolCall: openResponsesToolCall,
        turnRequest: round.request,
    });
    // Execute the tool
    return executeTool(tool, toolCall, turnContext, round.onPreliminaryResult);
}
//# sourceMappingURL=tool-orchestrator.js.map