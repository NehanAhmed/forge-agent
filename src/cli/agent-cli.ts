#!/usr/bin/env node
import { stepCountIs, type ConversationState, createInitialState } from '@openrouter/agent';
import { createTools } from '../tools/definitions.js';
import { client } from '../core/client.js';
import { MAX_ITERATIONS, MODEL, SYSTEM_PROMPT } from '../core/constants.js';
import { createStateAccessor } from '../core/state.js';

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

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function runAgent(
  sessionId: string,
  userMessage: string,
  callbacks: Callbacks
): Promise<ConversationState> {
  const tools = createTools(callbacks.onConfirm);
  const stateAccessor = createStateAccessor(sessionId);

  let priorState: ConversationState | null = null;
  try {
    priorState = await stateAccessor.load();
  } catch {
    priorState = null;
  }

  // Initialize state with system prompt if new session
  if (!priorState) {
    priorState = createInitialState(sessionId);
    priorState.messages = [
      {
        id: generateId(),
        role: 'system',
        content: SYSTEM_PROMPT,
      }
    ] as any;
  }

  let result;
  try {
    result = client.callModel({
      model: MODEL,
      input: userMessage,
      tools,
      stopWhen: [stepCountIs(MAX_ITERATIONS)],
      state: stateAccessor,
    });
  } catch (err: any) {
    const errMsg = err?.error?.message ?? err?.message ?? String(err);
    callbacks.onLog({ type: 'info', content: `Model call failed: ${errMsg}` });
    throw err;
  }

  const reasoningTask = (async () => {
    try {
      for await (const delta of result.getReasoningStream()) {
        callbacks.onLog({ type: 'reasoning_delta', content: delta });
      }
    } catch {
      // best-effort
    }
  })();

  const toolCallTask = (async () => {
    try {
      for await (const call of result.getToolCallsStream()) {
        callbacks.onLog({ type: 'tool_call', name: call.name, args: call.arguments });
      }
    } catch (err: any) {
      const errMsg = err?.error?.message ?? err?.message ?? String(err);
      callbacks.onLog({ type: 'info', content: `Tool call stream failed: ${errMsg}` });
    }
  })();

  try {
    for await (const delta of result.getTextStream()) {
      callbacks.onLog({ type: 'assistant_delta', content: delta });
    }
  } catch (err: any) {
    const errMsg = err?.error?.message ?? err?.message ?? String(err);
    callbacks.onLog({ type: 'info', content: `Stream failed mid-response: ${errMsg}` });
  }

  await reasoningTask;
  await toolCallTask;

  const finalState = await stateAccessor.load();
  if (!finalState) {
    throw new Error('Failed to load final state after agent completion');
  }
  return finalState;
}