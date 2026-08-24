import { MODEL, COMPACTION_THRESHOLD_TOKENS, COMPACTION_KEEP_RECENT } from "./constant.js";
import { client } from "./openrouter.js";
import type { Message } from "./session.js";

export const compactHistoryIfNeeded = async (messages: Message[]): Promise<Message[]> => {
  const estimatedTokens = JSON.stringify(messages).length / 4;
  console.log(`[compaction check] ~${Math.round(estimatedTokens)} tokens (threshold: ${COMPACTION_THRESHOLD_TOKENS})`);

  if (estimatedTokens < COMPACTION_THRESHOLD_TOKENS) return messages;

  const systemMsg = messages.find(m => m.role === 'system') ?? messages[0];
  const recent = messages.slice(-COMPACTION_KEEP_RECENT);
  const toSummarize = messages.slice(1, -COMPACTION_KEEP_RECENT);

  if (toSummarize.length === 0) return messages;

  console.log(`[compaction] compacting ${toSummarize.length} messages...`);

  try {
    const summaryResponse = await client.chat.send({
      chatRequest: {
        model: MODEL,
        messages: [
          { role: 'system', content: 'Summarize this conversation history concisely. Preserve: file paths touched, key decisions, unresolved tasks. Discard: verbose reasoning, redundant tool output.' },
          { role: 'user', content: JSON.stringify(toSummarize) },
        ],
      },
    });

    const summary = summaryResponse.choices[0].message.content;

    if (!summary) {
      console.log('[compaction] empty summary returned, skipping compaction this round.');
      return messages;
    }

    console.log(`[compaction] done — collapsed ${toSummarize.length} messages into 1.`);

    return [
      systemMsg,
      { role: 'system', content: `[Compacted history]: ${summary}` },
      ...recent,
    ];
  } catch (err) {
    console.log('[compaction] failed, continuing with uncompacted history:', err);
    return messages;
  }
};