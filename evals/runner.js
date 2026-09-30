import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runAgent } from '../agent-cli.js';
import { SYSTEM_PROMPT } from '../constant.js';
function countToolCalls(messages, toolName) {
    return messages
        .filter(m => m.role === 'assistant' && m.toolCalls)
        .flatMap(m => m.toolCalls)
        .filter(tc => tc.function.name === toolName)
        .length;
}
function runCheck(check, messages, cwd, confirmCallCount) {
    switch (check.type) {
        case 'tool_was_called': {
            const count = countToolCalls(messages, check.tool);
            const min = check.minTimes ?? 1;
            return { pass: count >= min, detail: `${check.tool} called ${count} time(s), needed >= ${min}` };
        }
        case 'tool_not_called': {
            const count = countToolCalls(messages, check.tool);
            return { pass: count === 0, detail: `${check.tool} called ${count} time(s), expected 0` };
        }
        case 'file_exists': {
            const exists = fs.existsSync(path.join(cwd, check.path));
            return { pass: exists, detail: `${check.path} exists: ${exists}` };
        }
        case 'file_content_matches': {
            const fullPath = path.join(cwd, check.path);
            const exists = fs.existsSync(fullPath);
            const content = exists ? fs.readFileSync(fullPath, 'utf-8') : '';
            const pass = exists && new RegExp(check.pattern).test(content);
            return { pass, detail: `${check.path} content matches "${check.pattern}": ${pass}` };
        }
        case 'content_matches': {
            const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
            const text = lastAssistant?.content ?? '';
            const pass = new RegExp(check.pattern).test(text);
            return { pass, detail: `pattern "${check.pattern}" matched: ${pass}` };
        }
        case 'confirm_was_called': {
            const min = check.minTimes ?? 1;
            return { pass: confirmCallCount >= min, detail: `onConfirm called ${confirmCallCount} time(s), needed >= ${min}` };
        }
    }
}
function prepareScratchDir(evalCaseId) {
    const scratchDir = path.join(import.meta.dirname, 'scratch', evalCaseId);
    fs.rmSync(scratchDir, { recursive: true, force: true });
    fs.mkdirSync(scratchDir, { recursive: true });
    return scratchDir;
}
async function runEval(evalCase) {
    const scratchDir = prepareScratchDir(evalCase.id);
    const originalCwd = process.cwd();
    process.chdir(scratchDir);
    let confirmCallCount = 0;
    const sessionId = `eval-${evalCase.id}-${Date.now()}`;
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: evalCase.prompt },
    ];
    try {
        const finalMessages = await runAgent(sessionId, messages, {
            onLog: () => { },
            onConfirm: async () => {
                confirmCallCount++;
                return true;
            },
        });
        const results = evalCase.checks.map(check => ({
            check,
            ...runCheck(check, finalMessages, scratchDir, confirmCallCount),
        }));
        const passed = results.every(r => r.pass);
        return { id: evalCase.id, passed, errored: false, results };
    }
    finally {
        process.chdir(originalCwd);
    }
}
async function main() {
    const caseFiles = fs.readdirSync(path.join(import.meta.dirname, 'cases'));
    const summary = [];
    for (const file of caseFiles) {
        const evalCase = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'cases', file), 'utf-8'));
        console.log(`Running: ${evalCase.id}`);
        try {
            const result = await runEval(evalCase);
            summary.push(result);
            console.log(result.passed ? '  ✅ PASS' : '  ❌ FAIL');
            for (const r of result.results) {
                if (!r.pass)
                    console.log(`    - ${r.detail}`);
            }
        }
        catch (err) {
            const errMsg = err?.error?.message ?? err?.message ?? String(err);
            console.log(`  💥 ERRORED: ${errMsg}`);
            summary.push({ id: evalCase.id, passed: false, errored: true, error: errMsg, results: [] });
        }
    }
    const passCount = summary.filter(s => s.passed).length;
    const erroredCount = summary.filter(s => s.errored).length;
    console.log(`\n${passCount}/${summary.length} passed${erroredCount ? ` (${erroredCount} errored)` : ''}`);
    fs.mkdirSync(path.join(import.meta.dirname, 'results'), { recursive: true });
    fs.writeFileSync(path.join(import.meta.dirname, 'results', `run-${Date.now()}.json`), JSON.stringify(summary, null, 2));
}
main();
