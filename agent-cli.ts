#!/usr/bin/env node

import { tools } from './tools.js';
import { toolExecutors } from './toolHelper.js';
import { saveSession, type Message } from './session.js';
import { client } from './openrouter.js';
import { FALLBACK_MODELS, MAX_ITERATIONS, MODEL, RISKY_TOOLS } from './constant.js';
import { compactHistoryIfNeeded } from './compaction.js';

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
};

export async function runAgent(sessionId: string, messages: Message[], callbacks: Callbacks): Promise<Message[]> {
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    messages = await compactHistoryIfNeeded(messages);
    saveSession(sessionId, messages);

    let stream;
    try {
      stream = await client.chat.send({
        chatRequest: { model: MODEL, models: FALLBACK_MODELS, messages, tools, stream: true },
      });
    } catch (err: any) {
      const errMsg = err?.error?.message ?? err?.message ?? String(err);
      callbacks.onLog({ type: 'info', content: `Model call failed: ${errMsg}` });
      messages.push({
        role: 'assistant',
        content: `[Agent stopped: model call failed — ${errMsg}]`,
      });
      saveSession(sessionId, messages);
      return messages; // don't crash — bail out of this turn gracefully
    }

    let content = '';
    let reasoning = '';
    const toolCallsAccumulator: Record<number, { id?: string; name?: string; arguments: string }> = {};

    try {
      for await (const chunk of stream as any) {
        const delta = (chunk as any).choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          callbacks.onLog({ type: 'assistant_delta', content: delta.content });
        }

        if (delta.reasoning) {
          reasoning += delta.reasoning;
          callbacks.onLog({ type: 'reasoning_delta', content: delta.reasoning });
        }

        if (delta.toolCalls) {
          for (const tc of delta.toolCalls) {
            const idx = tc.index ?? 0;
            if (!toolCallsAccumulator[idx]) toolCallsAccumulator[idx] = { arguments: '' };
            if (tc.id) toolCallsAccumulator[idx].id = tc.id;
            if (tc.function?.name) toolCallsAccumulator[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallsAccumulator[idx].arguments += tc.function.arguments;
          }
        }
      }
    } catch (err: any) {
      // Stream itself can also fail mid-read (dropped connection, malformed chunk, etc.)
      const errMsg = err?.error?.message ?? err?.message ?? String(err);
      callbacks.onLog({ type: 'info', content: `Stream failed mid-response: ${errMsg}` });
      messages.push({
        role: 'assistant',
        content: content || `[Agent stopped: stream failed — ${errMsg}]`,
      });
      saveSession(sessionId, messages);
      return messages;
    }

    const toolCallEntries = Object.values(toolCallsAccumulator);
    const toolCalls =
      toolCallEntries.length > 0
        ? toolCallEntries.map((tc, i) => ({
          id: tc.id ?? `call_${i}`,
          type: 'function' as const,
          function: { name: tc.name!, arguments: tc.arguments },
        }))
        : undefined;

    const message: Message = {
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

    const riskyChecks: Array<typeof message.toolCalls[number]> = [];
    const safeCalls: Array<typeof message.toolCalls[number]> = [];

    for (const call of message.toolCalls) {
      if (RISKY_TOOLS.has(call.function.name)) {
        riskyChecks.push(call);
      } else {
        safeCalls.push(call);
      }
    }

    const safeToolsResult = await Promise.all(
      safeCalls.map(async (call) => {
        const args = JSON.parse(call.function.arguments);
        callbacks.onLog({ type: 'tool_call', name: call.function.name, args });

        const executor = toolExecutors[call.function.name];
        if (!executor) {
          return { callId: call.id, content: `ERROR: No executor found for tool: ${call.function.name}` };
        }

        const output = await executor(args);

        if (call.function.name === 'spawn_sub_agent') {
          callbacks.onLog({ type: 'sub_agent', content: 'Sub Agent Completed the Task.' });
        } else {
          callbacks.onLog({ type: 'tool_result', content: output });
        }

        return { callId: call.id, content: output };
      })
    );

    for (const call of riskyChecks) {
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

      const allowed = await callbacks.onConfirm(`${call.function.name}(${JSON.stringify(args)})`);
      if (!allowed) {
        callbacks.onLog({ type: 'info', content: `Denied: ${call.function.name}` });
        messages.push({ role: 'tool', toolCallId: call.id, content: 'User denied this action.' });
        continue;
      }

      const output = await executor(args);
      callbacks.onLog({ type: 'tool_result', content: output });
      messages.push({ role: 'tool', toolCallId: call.id, content: output });
    }

    for (const { callId, content } of safeToolsResult) {
      messages.push({ role: 'tool', toolCallId: callId, content });
    }

    saveSession(sessionId, messages);
  }

  callbacks.onLog({ type: 'info', content: 'Max iterations reached without a final answer.' });
  saveSession(sessionId, messages);
  return messages;
}