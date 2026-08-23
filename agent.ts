// agent.ts
import 'dotenv/config';
import { OpenRouter } from '@openrouter/sdk';
import readline from 'readline/promises';
import { tools } from './tools.js';
import { toolExecutors } from './toolHelper.js';
import { loadSession, saveSession, type Message } from './session.js';
import { client } from './openrouter.js';
import { MAX_ITERATIONS, MODEL, RISKY_TOOLS, SYSTEM_PROMPT } from './constant.js';


const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function confirmAction(description: string): Promise<boolean> {
  const answer = await rl.question(`${description} (y/n): `);
  return answer.trim().toLowerCase() === 'y';
}

async function runAgent(messages: Message[]) {
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.chat.send({
      chatRequest: { model: MODEL, messages, tools },
    });

    const message = response.choices[0].message as Message;
    console.log(`\n--- Assistant Reasoning ---\n${message.reasoning ?? 'No reasoning provided.'}`);

    if (!message.toolCalls || message.toolCalls.length === 0) {
      console.log('\n--- Final answer ---');
      console.log(message.content);
      messages.push(message);
      saveSession(messages);
      rl.close();
      return;
    }

    messages.push(message);

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
  rl.close();
}

// ---- Entry point ----
const messages = loadSession();
if (messages.length === 0) {
  messages.push({ role: 'system', content: SYSTEM_PROMPT });
}
messages.push({ role: 'user', content: process.argv[2] ?? 'What is my favorite number?' });

runAgent(messages).catch((err) => {
  console.error(err);
  rl.close();
});