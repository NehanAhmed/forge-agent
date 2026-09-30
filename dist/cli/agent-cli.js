#!/usr/bin/env node
import { stepCountIs, createInitialState } from '@openrouter/agent';
import { createTools } from '../tools/definitions.js';
import { getClient } from '../core/client.js';
import { buildSystemPrompt, MAX_ITERATIONS, MODEL, SYSTEM_PROMPT } from '../core/constants.js';
import { createStateAccessor, saveSessionTitle } from '../core/state.js';
import { deriveSessionTitle } from '../tools/helpers.js';
function generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
export async function runAgent(sessionId, userMessage, callbacks) {
    const tools = createTools(callbacks.onConfirm);
    const stateAccessor = createStateAccessor(sessionId);
    const priorState = await stateAccessor.load();
    const isNewSession = priorState === null;
    let result;
    try {
        result = getClient().callModel({
            model: MODEL,
            instructions: buildSystemPrompt(process.cwd()),
            input: userMessage,
            tools,
            stopWhen: [stepCountIs(MAX_ITERATIONS)],
            state: stateAccessor,
        });
    }
    catch (err) {
        const errMsg = err?.error?.message ?? err?.message ?? String(err);
        callbacks.onLog({ type: 'info', content: `Model call failed: ${errMsg}` });
        const fallbackState = await stateAccessor.load();
        if (fallbackState)
            return fallbackState;
        throw err;
    }
    if (isNewSession) {
        saveSessionTitle(sessionId, deriveSessionTitle(userMessage));
    }
    const reasoningTask = (async () => {
        try {
            for await (const delta of result.getReasoningStream()) {
                callbacks.onLog({ type: 'reasoning_delta', content: delta });
            }
        }
        catch {
            // best-effort
        }
    })();
    const toolCallTask = (async () => {
        try {
            for await (const call of result.getToolCallsStream()) {
                callbacks.onLog({ type: 'tool_call', name: call.name, args: call.arguments });
            }
        }
        catch (err) {
            const errMsg = err?.error?.message ?? err?.message ?? String(err);
            callbacks.onLog({ type: 'info', content: `Tool call stream failed: ${errMsg}` });
        }
    })();
    try {
        for await (const delta of result.getTextStream()) {
            callbacks.onLog({ type: 'assistant_delta', content: delta });
        }
    }
    catch (err) {
        const errMsg = err?.error?.message ?? err?.message ?? String(err);
        callbacks.onLog({ type: 'info', content: `Stream failed mid-response: ${errMsg}` });
    }
    const finalUsage = await result.getUsage();
    callbacks.onUsage(finalUsage.inputTokens, finalUsage.outputTokens, finalUsage.cost);
    await reasoningTask;
    await toolCallTask;
    const finalState = await stateAccessor.load();
    if (!finalState) {
        throw new Error('Failed to load final state after agent completion');
    }
    return finalState;
}
//# sourceMappingURL=agent-cli.js.map