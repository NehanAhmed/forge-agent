import { MODEL, COMPACTION_THRESHOLD_TOKENS, COMPACTION_KEEP_RECENT, SYSTEM_PROMPT } from './constants.js';
import { client } from './client.js';
import type { ConversationState } from '@openrouter/agent';

export interface CompactionConfig {
  thresholdTokens: number;
  keepRecentTurns: number;
  model: string;
}

export const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
  thresholdTokens: COMPACTION_THRESHOLD_TOKENS,
  keepRecentTurns: COMPACTION_KEEP_RECENT,
  model: MODEL,
};

type SDKMessage = {
  role?: string;
  content?: string | unknown[];
  reasoning?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  callId?: string;
  output?: string | unknown[];
  type?: string;
};

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => extractTextContent(c)).join('');
  }
  if (content && typeof content === 'object' && 'text' in content) {
    return String((content as { text: unknown }).text);
  }
  return '';
}

function stateToLegacyMessages(state: ConversationState): Array<{
  role: string;
  content: string | null;
  reasoning?: string;
  toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  toolCallId?: string;
}> {
  const messages: Array<{
    role: string;
    content: string | null;
    reasoning?: string;
    toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    toolCallId?: string;
  }> = [];

  const stateAny = state as { messages?: unknown[] };
  if (stateAny.messages) {
    for (const msg of stateAny.messages) {
      const m = msg as SDKMessage;
      const role = m.role;
      if (role === 'user') {
        messages.push({ role: 'user', content: extractTextContent(m.content ?? '') });
      } else if (role === 'assistant') {
        const toolCalls = m.toolCalls?.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));
        messages.push({
          role: 'assistant',
          content: m.content ? extractTextContent(m.content) : null,
          reasoning: m.reasoning,
          toolCalls: toolCalls?.length ? toolCalls : undefined,
        });
      } else if (role === 'tool') {
        messages.push({
          role: 'tool',
          toolCallId: m.callId ?? '',
          content: extractTextContent(m.output ?? ''),
        });
      } else if (role === 'system' || role === 'developer') {
        messages.push({ role: 'system', content: extractTextContent(m.content ?? '') });
      }
    }
  }

  return messages;
}

function legacyToSDKMessage(msg: {
  role: string;
  content: string | null;
  reasoning?: string;
  toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  toolCallId?: string;
}): SDKMessage {
  if (msg.role === 'user') {
    return { role: 'user', content: msg.content ?? '' };
  }
  if (msg.role === 'assistant') {
    return {
      role: 'assistant',
      content: msg.content ?? undefined,
      reasoning: msg.reasoning,
      toolCalls: msg.toolCalls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })),
    };
  }
  if (msg.role === 'tool') {
    return { role: 'tool', callId: msg.toolCallId, output: msg.content ?? '' };
  }
  return { role: 'system', content: msg.content ?? '' };
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function toSystemItem(msg: SDKMessage) {
  return {
    id: generateId(),
    role: 'system' as const,
    content: msg.content ?? '',
  };
}

function toUserItem(msg: SDKMessage) {
  return {
    id: generateId(),
    role: 'user' as const,
    content: msg.content ?? '',
  };
}

function toAssistantItem(msg: SDKMessage) {
  return {
    id: generateId(),
    role: 'assistant' as const,
    content: msg.content ?? undefined,
    reasoning: msg.reasoning,
    toolCalls: msg.toolCalls,
  };
}

function toToolItem(msg: SDKMessage) {
  return {
    id: generateId(),
    callId: msg.callId ?? generateId(),
    output: msg.output ?? '',
    type: 'function_call_output' as const,
  };
}

export async function compactIfNeeded(
  state: ConversationState,
  config: CompactionConfig = DEFAULT_COMPACTION_CONFIG
): Promise<ConversationState> {
  const legacyMessages = stateToLegacyMessages(state);
  const estimatedTokens = JSON.stringify(legacyMessages).length / 4;

  console.log(`[compaction check] ~${Math.round(estimatedTokens)} tokens (threshold: ${config.thresholdTokens})`);

  if (estimatedTokens < config.thresholdTokens) return state;

  const systemMsg = legacyMessages.find(m => m.role === 'system') ?? { role: 'system', content: SYSTEM_PROMPT };

  const recent = legacyMessages.slice(-config.keepRecentTurns);
  const toSummarize = legacyMessages.slice(1, -config.keepRecentTurns);

  if (toSummarize.length === 0) return state;

  console.log(`[compaction] compacting ${toSummarize.length} messages...`);

  try {
    const summaryResponse = await client.callModel({
      model: config.model,
      input: [
        {
          role: 'system',
          content: 'Summarize this conversation history concisely. You MUST explicitly state, verbatim or near-verbatim, what the user\'s most recent request/goal was — this is the single most important thing to preserve. Also preserve: file paths touched, key decisions made, and any unresolved sub-tasks. Discard: verbose reasoning, redundant tool output, and repeated file contents already summarized elsewhere.',
        } as any,
        { role: 'user', content: JSON.stringify(toSummarize) } as any,
      ],
      tools: [],
    });

    const summary = await summaryResponse.getText();

    if (!summary) {
      console.log('[compaction] empty summary returned, skipping compaction this round.');
      return state;
    }

    console.log(`[compaction] done — collapsed ${toSummarize.length} messages into 1.`);

    const compactedLegacy: Array<{
      role: string;
      content: string | null;
      reasoning?: string;
      toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
      toolCallId?: string;
    }> = [
      systemMsg,
      { role: 'system', content: `[Compacted history — the user's active request is stated below; continue working on it]: ${summary}` },
      ...recent,
    ];

    const compactedSDKMessages: SDKMessage[] = compactedLegacy.map(legacyToSDKMessage);

    const convertedMessages = compactedSDKMessages.map(m => {
      if (m.role === 'system') return toSystemItem(m);
      if (m.role === 'user') return toUserItem(m);
      if (m.role === 'assistant') return toAssistantItem(m);
      if (m.role === 'tool') return toToolItem(m);
      return toSystemItem(m);
    }) as any;

    const compactedState: ConversationState = {
      ...state,
      messages: convertedMessages,
      updatedAt: Date.now(),
    };

    return compactedState;
  } catch (err) {
    console.log('[compaction] failed, continuing with uncompacted history:', err);
    return state;
  }
}