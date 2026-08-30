import fs from 'fs';
import { execFileSync, execSync } from 'child_process';
import type { Message } from './session.js';
import { tools } from './tools.js';
import { MODEL, SUBAGENT_TOOLS } from './constant.js';
import { client } from './openrouter.js';
import { formatRgOutput } from './helpers.js';

export function runBash(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', timeout: 10_000 });
  } catch (err: any) {
    return `ERROR: ${err.stdout ?? ''}${err.stderr ?? err.message}`;
  }
}

export function readFile(path: string): string {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function writeFile(path: string, content: string): string {
  try {
    fs.writeFileSync(path, content, 'utf-8');
    return `File written successfully to ${path}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function editFile(path: string, oldContent: string, newContent: string): string {
  try {
    const content = fs.readFileSync(path, 'utf-8');
    const occurences = content.split(oldContent).length - 1;
    if (occurences === 0) {
      return `ERROR: The string "${oldContent}" was not found in the file.`;
    }
    const updatedContent = content.replace(oldContent, newContent);
    fs.writeFileSync(path, updatedContent, 'utf-8');
    return `Successfully replaced ${occurences} occurence(s) of "${oldContent}" with "${newContent}" in ${path}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }

}

export async function spawnSubAgent(task: string): Promise<string> {
  const MAX_ITERATIONS = 10;
  let subMessages: Message[] = [
    { role: "system", content: "..." },
    { role: "user", content: task },
  ];
  const subToolSchemas = tools.filter(t => SUBAGENT_TOOLS.includes(t.function.name));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.chat.send({
      chatRequest: { model: MODEL, messages: subMessages, tools: subToolSchemas },
    });
    const message = (response as any).choices[0].message;
    const rawToolCalls = message.toolCalls ?? [];

    subMessages.push({
      role: "assistant",
      content: message.content,
      toolCalls: rawToolCalls.length ? rawToolCalls : undefined,
    });
    if (!rawToolCalls.length) {
      return message.content ?? "(sub-agent returned no content)";
    }

    if (!rawToolCalls.length) {
      return message.content ?? "(sub-agent returned no content)";
    }

    for (const call of rawToolCalls) {
      const args = JSON.parse(call.function.arguments);
      const executor = toolExecutors[call.function.name];
      const result = executor
        ? await executor(args)
        : `ERROR: No executor found for tool: ${call.function.name}`;
      subMessages.push({
        role: "tool",
        toolCallId: call.id,
        content: result,
      });
    }
  }

  return "(sub-agent hit max iterations without a final answer)";
}

export function searchCodebase(pattern: string, path: string = '.', maxResults: number = 60): string {
  const cappedMax = Math.min(maxResults, 150);
  try {
    const output = execFileSync(
      'rg',
      [
        '--json', '-n', '-C', '2', '--max-count', String(cappedMax),
        '--glob', '!node_modules',
        '--glob', '!dist',
        '--glob', '!.git',
        '--glob', '!*.lock',
        '--glob', '!package-lock.json',
        '--', pattern, path,
      ],
      { encoding: 'utf-8', timeout: 10_000, maxBuffer: 10 * 1024 * 1024 }
    );
    return formatRgOutput(output, cappedMax);
  } catch (err: any) {
    if (err.status === 1) return 'No matches found.';
    return `ERROR: ${err.stderr ?? err.message}`;
  }
}
export const toolExecutors: Record<string, (args: any) => string | Promise<string>> = {
  run_bash: (args) => runBash(args.command),
  read_file: (args) => readFile(args.path),
  write_file: (args) => writeFile(args.path, args.content),
  replace_string_in_file: (args) => editFile(args.path, args.stringToReplace, args.newString),
  spawn_sub_agent: (args) => spawnSubAgent(args.task),
  search_code: (args) => searchCodebase(args.pattern, args.path, args.maxResults),
};