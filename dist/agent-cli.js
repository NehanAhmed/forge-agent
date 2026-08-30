#!/usr/bin/env node
import { tools } from './tools.js';
import { toolExecutors } from './toolHelper.js';
import { saveSession } from './session.js';
import { client } from './openrouter.js';
import { FALLBACK_MODELS, MAX_ITERATIONS, MODEL, RISKY_TOOLS } from './constant.js';
import { compactHistoryIfNeeded } from './compaction.js';
export async function runAgent(sessionId, messages, callbacks) {
    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        messages = await compactHistoryIfNeeded(messages);
        saveSession(sessionId, messages);
        const stream = await client.chat.send({
            chatRequest: { model: MODEL, models: FALLBACK_MODELS, messages, tools, stream: true },
        });
        let content = '';
        let reasoning = '';
        const toolCallsAccumulator = {};
        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta;
            if (!delta)
                continue;
            if (delta.content) {
                content += delta.content;
                callbacks.onLog({ type: 'assistant_delta', content: delta.content });
            }
            if (delta.reasoning) {
                reasoning += delta.reasoning;
            }
            if (delta.toolCalls) {
                for (const tc of delta.toolCalls) {
                    const idx = tc.index ?? 0;
                    if (!toolCallsAccumulator[idx])
                        toolCallsAccumulator[idx] = { arguments: '' };
                    if (tc.id)
                        toolCallsAccumulator[idx].id = tc.id;
                    if (tc.function?.name)
                        toolCallsAccumulator[idx].name = tc.function.name;
                    if (tc.function?.arguments)
                        toolCallsAccumulator[idx].arguments += tc.function.arguments;
                }
            }
        }
        if (reasoning) {
            callbacks.onLog({ type: 'reasoning', content: reasoning });
        }
        const toolCallEntries = Object.values(toolCallsAccumulator);
        const toolCalls = toolCallEntries.length > 0
            ? toolCallEntries.map((tc, i) => ({
                id: tc.id ?? `call_${i}`,
                type: 'function',
                function: { name: tc.name, arguments: tc.arguments },
            }))
            : undefined;
        const message = {
            role: 'assistant',
            content: content || null,
            reasoning: reasoning || undefined,
            toolCalls,
        };
        if (!message.toolCalls || message.toolCalls.length === 0) {
            messages.push(message);
            saveSession(sessionId, messages);
            return messages;
        }
        messages.push(message);
        for (const call of message.toolCalls) {
            const args = JSON.parse(call.function.arguments);
            callbacks.onLog({ type: 'tool_call', name: call.function.name, args });
            const executor = toolExecutors[call.function.name];
            if (!executor) {
                messages.push({
                    role: 'tool',
                    toolCallId: call.id,
                    content: `ERROR: No executor found for tool: ${call.function.name}`,
                });
                continue;
            }
            if (RISKY_TOOLS.has(call.function.name)) {
                const allowed = await callbacks.onConfirm(`${call.function.name}(${JSON.stringify(args)})`);
                if (!allowed) {
                    callbacks.onLog({ type: 'info', content: `Denied: ${call.function.name}` });
                    messages.push({ role: 'tool', toolCallId: call.id, content: 'User denied this action.' });
                    continue;
                }
            }
            const output = executor(args);
            callbacks.onLog({ type: 'tool_result', content: output });
            messages.push({ role: 'tool', toolCallId: call.id, content: output });
        }
        saveSession(sessionId, messages);
    }
    callbacks.onLog({ type: 'info', content: 'Max iterations reached without a final answer.' });
    saveSession(sessionId, messages);
    return messages;
}
//# sourceMappingURL=agent-cli.js.map