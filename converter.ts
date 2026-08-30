// converter.ts
import type { Message } from './session.js';

export type DisplayEntry = {
  id: number;
  kind: 'user' | 'reasoning' | 'tool_call' | 'tool_result' | 'assistant' | 'info';
  text: string;
};

export function messagesToEntries(messages: Message[], startId = 0): DisplayEntry[] {
  const entries: DisplayEntry[] = [];
  let id = startId;

  for (const msg of messages) {
    // Skip System Prompts
    if (msg.role === 'system') continue;

    // Detect Context Compaction summaries
    if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.startsWith('[SYSTEM SUMMARY]:')) {
      entries.push({
        id: id++,
        kind: 'info',
        text: `Context Compacted: ${msg.content.replace('[SYSTEM SUMMARY]:', '').trim()}`,
      });
      continue;
    }

    if (msg.role === 'user' && msg.content) {
      entries.push({ id: id++, kind: 'user', text: msg.content });
    }

    if (msg.role === 'assistant') {
      if (msg.reasoning) {
        entries.push({ id: id++, kind: 'reasoning', text: msg.reasoning });
      }
      if (msg.content) {
        entries.push({ id: id++, kind: 'assistant', text: msg.content });
      }
      for (const call of msg.toolCalls ?? []) {
        entries.push({
          id: id++,
          kind: 'tool_call',
          text: `${call.function.name}(${call.function.arguments})`,
        });
      }
    }
    if (msg.role === 'tool' && msg.content) {
      entries.push({ id: id++, kind: 'tool_result', text: msg.content });
    }
  }

  return entries;
}