import fs from 'fs';
import { execFileSync, execSync } from 'child_process';
import { createTools } from './definitions.js';
import { MODEL, SUBAGENT_MAX_ITERATIONS, SUBAGENT_TOOLS, SYSTEM_PROMPT } from '../core/constants.js';
import { getClient } from '../core/client.js';
import { formatRgOutput, resolveSafePath } from './helpers.js';
import { stepCountIs } from '@openrouter/agent';
export function runBash(command) {
    // NOTE: run_bash is NOT path-sandboxed — a shell command can `cd`, use
    // absolute paths, or chain commands in ways resolveSafePath can't
    // intercept. It stays a RISKY_TOOL requiring confirmation; true sandboxing
    // would need a real subprocess jail (e.g. a restricted PATH/cwd + denylist
    // of dangerous patterns), which is a separate, bigger piece of work.
    try {
        return execSync(command, { encoding: 'utf-8', timeout: 10_000, cwd: process.cwd() });
    }
    catch (err) {
        return `ERROR: ${err.stdout ?? ''}${err.stderr ?? err.message}`;
    }
}
export function readFile(path) {
    try {
        const safePath = resolveSafePath(path);
        return fs.readFileSync(safePath, 'utf-8');
    }
    catch (err) {
        return `ERROR: ${err.message}`;
    }
}
export function writeFile(path, content) {
    try {
        const safePath = resolveSafePath(path);
        fs.writeFileSync(safePath, content, 'utf-8');
        return `File written successfully to ${path}`;
    }
    catch (err) {
        return `ERROR: ${err.message}`;
    }
}
export function editFile(path, oldContent, newContent) {
    try {
        const safePath = resolveSafePath(path);
        const content = fs.readFileSync(safePath, 'utf-8');
        const occurences = content.split(oldContent).length - 1;
        if (occurences === 0) {
            return `ERROR: The string "${oldContent}" was not found in the file.`;
        }
        const updatedContent = content.replace(oldContent, newContent);
        fs.writeFileSync(safePath, updatedContent, 'utf-8');
        return `Successfully replaced ${occurences} occurence(s) of "${oldContent}" with "${newContent}" in ${path}`;
    }
    catch (err) {
        return `ERROR: ${err.message}`;
    }
}
export async function spawnSubAgent(task) {
    const readOnlyTools = createTools(async () => false)
        .filter(t => SUBAGENT_TOOLS.includes(t.function.name));
    let result;
    try {
        result = getClient().callModel({
            model: MODEL,
            instructions: SYSTEM_PROMPT,
            input: task,
            tools: readOnlyTools,
            stopWhen: [stepCountIs(SUBAGENT_MAX_ITERATIONS)],
        });
    }
    catch (err) {
        return `ERROR: sub-agent model call failed — ${err?.error?.message ?? err?.message ?? String(err)}`;
    }
    try {
        return await result.getText();
    }
    catch (err) {
        return `ERROR: sub-agent stream failed — ${err?.error?.message ?? err?.message ?? String(err)}`;
    }
}
export function searchCodebase(pattern, path = '.', maxResults = 60) {
    const inputPath = path && path.trim() ? path : '.';
    const cappedMax = Math.min(maxResults, 150);
    let resolvedPath;
    try {
        resolvedPath = resolveSafePath(inputPath);
    }
    catch (err) {
        return `ERROR: ${err.message}`;
    }
    try {
        const output = execFileSync('rg', [
            '--json', '-n', '-C', '2', '--max-count', String(cappedMax),
            '--glob', '!node_modules',
            '--glob', '!dist',
            '--glob', '!.git',
            '--glob', '!*.lock',
            '--glob', '!package-lock.json',
            '--', pattern, resolvedPath,
        ], { encoding: 'utf-8', timeout: 10_000, maxBuffer: 10 * 1024 * 1024 });
        return formatRgOutput(output, cappedMax);
    }
    catch (err) {
        if (err.status === 1)
            return 'No matches found.';
        return `ERROR: ${err.stderr ?? err.message}`;
    }
}
export const toolExecutors = {
    run_bash: (args) => runBash(args.command),
    read_file: (args) => readFile(args.path),
    write_file: (args) => writeFile(args.path, args.content),
    replace_string_in_file: (args) => editFile(args.path, args.stringToReplace, args.newString),
    spawn_sub_agent: (args) => spawnSubAgent(args.task),
    search_code: (args) => searchCodebase(args.pattern, args.path, args.maxResults),
};
//# sourceMappingURL=implementations.js.map