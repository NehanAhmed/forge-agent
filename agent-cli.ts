#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { stepCountIs, type StateAccessor, type ConversationState } from '@openrouter/agent';
import { createTools } from './tools.js';
import { client } from './openrouter.js';
import { MAX_ITERATIONS, MODEL } from './constant.js';

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

const SESSIONS_DIR = path.join(process.cwd(), '.agent-sessions');

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Backs the SDK's own conversation state directly with your existing file
// storage — this REPLACES loadSession/saveSession's role for agent turns.
// It stores ConversationState (Item format), not your old Message[] shape.
function createFileStateAccessor(sessionId: string): StateAccessor {
  ensureDir();
  const statePath = path.join(SESSIONS_DIR, `${sessionId}.state.json`);
  return {
    load: async () => {
      if (!fs.existsSync(statePath)) return null;
      try {
        return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      } catch {
        return null;
      }
    },
    save: async (state: ConversationState) => {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    },
  };
}

export async function runAgent(
  sessionId: string,
  userMessage: string,
  callbacks: Callbacks
): Promise<void> {
  const tools = createTools(callbacks.onConfirm);
  const state = createFileStateAccessor(sessionId);

  let result;
  try {
    result = client.callModel({
      model: MODEL,
      input: userMessage, // ONLY the new message — state carries prior history
      tools,
      stopWhen: [stepCountIs(MAX_ITERATIONS)],
      state, // SDK loads prior state, appends this turn, saves after
    });
  } catch (err: any) {
    const errMsg = err?.error?.message ?? err?.message ?? String(err);
    callbacks.onLog({ type: 'info', content: `Model call failed: ${errMsg}` });
    return;
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

}