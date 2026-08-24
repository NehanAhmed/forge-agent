// agent.ts
import 'dotenv/config';
import { OpenRouter } from '@openrouter/sdk';
import readline from 'readline/promises';
import { tools } from './tools.js';
import { toolExecutors } from './toolHelper.js';
import { loadSession, saveSession, type Message } from './session.js';
import { client } from './openrouter.js';
import { FALLBACK_MODELS, MAX_ITERATIONS, MODEL, RISKY_TOOLS, SYSTEM_PROMPT } from './constant.js';
import { compactHistoryIfNeeded } from './compaction.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function confirmAction(description: string): Promise<boolean> {
  const answer = await rl.question(`${description} (y/n): `);
  return answer.trim().toLowerCase() === 'y';
}

async function runAgent(messages: Message[]) {
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    messages = await compactHistoryIfNeeded(messages);
    saveSession(messages);
    const stream = await client.chat.send({
      chatRequest: { model: MODEL, models: FALLBACK_MODELS, messages, tools, stream: true },
    });

    // ---- Accumulate streamed chunks into a full message ----
    let content = '';
    let reasoning = '';
    const toolCallsAccumulator: Record<number, { id?: string; name?: string; arguments: string }> = {};

    console.log(''); // spacing before streamed output

    for await (const chunk of stream) {
      const delta = (chunk as any).choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        process.stdout.write(delta.content);
        content += delta.content;
      }

      if (delta.reasoning) {
        reasoning += delta.reasoning;
      }

      if (delta.toolCalls) {
        for (const tc of delta.toolCalls) {
          const idx = tc.index ?? 0;
          if (!toolCallsAccumulator[idx]) {
            toolCallsAccumulator[idx] = { arguments: '' };
          }
          if (tc.id) toolCallsAccumulator[idx].id = tc.id;
          if (tc.function?.name) toolCallsAccumulator[idx].name = tc.function.name;
          if (tc.function?.arguments) toolCallsAccumulator[idx].arguments += tc.function.arguments;
        }
      }
    }

    console.log(); // newline after streamed content finishes

    // ---- Reconstruct the full message object from accumulated chunks ----
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

    console.log(`\n--- Assistant Reasoning ---\n${message.reasoning ?? 'No reasoning provided.'}`);

    // No tool calls -> final answer, stop
    if (!message.toolCalls || message.toolCalls.length === 0) {
      console.log('\n--- Final answer ---');
      // content was already printed live during streaming, no need to reprint
      messages.push(message);
      saveSession(messages);
      return;
    }

    // Push the assistant's tool-call message into history
    messages.push(message);

    // Execute each requested tool call
    for (const call of message.toolCalls) {
      const args = JSON.parse(call.function.arguments);
      console.log(`\n[tool call] ${call.function.name}(${JSON.stringify(args)})`);

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
        const allowed = await confirmAction(`${call.function.name}(${JSON.stringify(args)})`);
        if (!allowed) {
          messages.push({ role: 'tool', toolCallId: call.id, content: 'User denied this action.' });
          continue;
        }
      }

      const output = executor(args);
      console.log(`[tool result]\n${output}`);
      messages.push({ role: 'tool', toolCallId: call.id, content: output });
    }

    saveSession(messages);
  }

  console.log('Max iterations reached without a final answer.');
  saveSession(messages);
}

// ---- Entry point: interactive REPL ----
async function main() {
  const messages = loadSession();
  if (messages.length === 0) {
    messages.push({ role: 'system', content: SYSTEM_PROMPT });
  }

  console.log('Agent ready. Type your request (or "exit" to quit).\n');

  while (true) {
    const userInput = await rl.question('> ');

    if (userInput.trim().toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    if (!userInput.trim()) continue;

    messages.push({ role: 'user', content: userInput });
    await runAgent(messages);
  }
}

main().catch((err) => {
  console.error(err);
  rl.close();
});