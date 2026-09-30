import fs from 'fs';
import { execFileSync, execSync } from 'child_process';
import { createTools } from './definitions.js';
import { MODEL, SUBAGENT_MAX_ITERATIONS, SUBAGENT_TOOLS, SYSTEM_PROMPT } from '../core/constants.js';
import { client } from '../core/client.js';
import { formatRgOutput } from './helpers.js';
import { stepCountIs } from '@openrouter/agent';

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
  let iterations = 0;
  const readOnlyTools = createTools(async () => false)
    .filter(t => SUBAGENT_TOOLS.includes(t.function.name));
  let result;
  try {
    result = client.callModel({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: task,
      tools: readOnlyTools,
      stopWhen: [stepCountIs(SUBAGENT_MAX_ITERATIONS)],
    });
  } catch (err: any) {
    return `ERROR: sub-agent model call failed — ${err?.error?.message ?? err?.message ?? String(err)}`;
  }
  try {
    return await result.getText();
  } catch (err: any) {
    return `ERROR: sub-agent stream failed — ${err?.error?.message ?? err?.message ?? String(err)}`;
  }

}

export function searchCodebase(pattern: string, path: string = '.', maxResults: number = 60): string {
  const resolvedPath = path && path.trim() ? path : '.';
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
        '--', pattern, resolvedPath,
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