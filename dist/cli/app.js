#!/usr/bin/env node
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import 'dotenv/config';
import path from 'path';
import os from 'os';
import fs from 'fs';
import React, { useState, useRef } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import { randomUUID } from 'crypto';
import { runAgent } from './agent-cli.js';
import { MODEL, AGENT_NAME } from '../core/constants.js';
import { getLatestSessionId, listSessions } from '../core/index.js';
import { listSessionMeta } from '../core/state.js';
// --- config command: runs before anything else, exits early if matched ---
const cliArgs = process.argv.slice(2);
if (cliArgs[0] === 'config' && cliArgs[1] === 'set-key') {
    const key = cliArgs[2];
    if (!key) {
        console.error('Usage: forge config set-key <your-api-key>');
        process.exit(1);
    }
    const configDir = path.join(os.homedir(), '.forge');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({ apiKey: key }, null, 2));
    console.log('API key saved.');
    process.exit(0);
}
let entryId = 0;
function Header({ sessionId, title }) {
    return (_jsx(Box, { flexDirection: "column", padding: 1, children: _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Gradient, { name: "pastel", children: _jsxs(Text, { bold: true, children: ["\u25B2 ", AGENT_NAME] }) }), _jsxs(Text, { dimColor: true, children: ["model: ", MODEL, " | session: ", sessionId.slice(0, 8)] }), _jsxs(Text, { dimColor: true, children: ["title: ", title || 'Unnamed', " | dir: ", process.cwd()] })] }) }));
}
function EntryLine({ entry }) {
    switch (entry.kind) {
        case 'user':
            return (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "cyanBright", bold: true, children: '❯ ' }), _jsx(Text, { color: "cyanBright", children: entry.text })] }));
        case 'reasoning':
            return (_jsx(Box, { marginTop: 1, paddingLeft: 2, borderStyle: "round", borderColor: "gray", flexDirection: "column", children: _jsx(Text, { dimColor: true, italic: true, children: entry.text }) }));
        case 'tool_call':
            return (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "yellowBright", children: '⚡ ' }), _jsx(Text, { color: "yellow", children: entry.text })] }));
        case 'tool_result':
            return (_jsx(Box, { paddingLeft: 2, flexDirection: "column", children: _jsx(Text, { color: "greenBright", dimColor: true, children: entry.text.length > 400 ? entry.text.slice(0, 400) + '…' : entry.text }) }));
        case 'assistant':
            return (_jsx(Box, { marginTop: 1, paddingLeft: 1, flexDirection: "column", children: _jsx(Text, { color: "white", children: entry.text }) }));
        case 'info':
            return (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "magentaBright", children: 'ℹ ' }), _jsx(Text, { color: "magenta", children: entry.text })] }));
    }
}
function resolveSessionId() {
    const args = process.argv.slice(2);
    const resumeIdx = args.indexOf('--resume');
    if (resumeIdx !== -1) {
        const specifiedId = args[resumeIdx + 1];
        const targetId = specifiedId && !specifiedId.startsWith('--')
            ? specifiedId
            : getLatestSessionId();
        if (targetId)
            return targetId;
    }
    return randomUUID();
}
function App() {
    const confirmResolverRef = useRef(null);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState(null);
    const sessionIdRef = useRef(resolveSessionId());
    const sessionId = sessionIdRef.current;
    const [entries, setEntries] = useState([]);
    const [usage, setUsage] = useState({ inputTokens: 0, outputTokens: 0, cost: 0 });
    const [title, setTitle] = useState(null);
    function pushEntry(kind, text) {
        setEntries(prev => [...prev, { id: entryId++, kind, text }]);
    }
    function appendToLast(kind, delta) {
        setEntries(prev => {
            const last = prev[prev.length - 1];
            if (last?.kind === kind) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, text: last.text + delta };
                return updated;
            }
            return [...prev, { id: entryId++, kind, text: delta }];
        });
    }
    async function handleConfirm(description) {
        setPendingConfirm(description);
        return new Promise(resolve => {
            confirmResolverRef.current = resolve;
        });
    }
    useInput((inputChar) => {
        if (!pendingConfirm)
            return;
        const lower = inputChar.toLowerCase();
        if (lower === 'y' || lower === 'n') {
            const resolver = confirmResolverRef.current;
            setPendingConfirm(null);
            confirmResolverRef.current = null;
            resolver?.(lower === 'y');
        }
    });
    async function handleSubmit(value) {
        if (!value.trim() || isProcessing)
            return;
        if (value.trim().toLowerCase() === '/exit') {
            process.exit(0);
        }
        if (value.trim().toLowerCase() === '/clear') {
            setEntries([]);
            setUsage({ inputTokens: 0, outputTokens: 0, cost: 0 });
            setInput('');
            return;
        }
        if (value.trim().toLowerCase() === '/new') {
            sessionIdRef.current = randomUUID();
            setEntries([]);
            setUsage({ inputTokens: 0, outputTokens: 0, cost: 0 });
            setInput('');
            return;
        }
        if (value.trim().toLowerCase() === '/help') {
            pushEntry('info', 'Available commands:\n/clear - Clear the chat history\n/help - Show this help message\n/exit - Exit the application');
            setInput('');
            return;
        }
        if (value.trim().toLowerCase() === '/sessions') {
            const sessions = listSessionMeta().sort((a, b) => b.createdAt - a.createdAt);
            const lines = sessions.map(s => `${s.title}  (${s.id.slice(0, 8)})`);
            pushEntry('info', sessions.length ? `Sessions:\n${lines.join('\n')}` : 'No sessions yet.');
            setInput('');
            setTitle(sessions.find(s => s.id === sessionId)?.title ?? null);
            return;
        }
        pushEntry('user', value);
        setInput('');
        setIsProcessing(true);
        const usageLimit = (inputTokens, outputTokens, cost) => {
            setUsage(prev => ({ ...prev, inputTokens: prev.inputTokens + inputTokens, outputTokens: prev.outputTokens + outputTokens, cost: prev.cost + (cost || 0) }));
        };
        const onLog = (event) => {
            switch (event.type) {
                case 'reasoning_delta':
                    appendToLast('reasoning', event.content);
                    break;
                case 'tool_call':
                    pushEntry('tool_call', `${event.name}(${JSON.stringify(event.args)})`);
                    break;
                case 'tool_result':
                    pushEntry('tool_result', event.content);
                    break;
                case 'assistant_delta':
                    appendToLast('assistant', event.content);
                    break;
                case 'info':
                    pushEntry('info', event.content);
                    break;
                case 'sub_agent':
                    pushEntry('info', event.content);
                    break;
            }
        };
        await runAgent(sessionId, value, {
            onLog,
            onConfirm: handleConfirm,
            onUsage: usageLimit,
        });
        setIsProcessing(false);
    }
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Header, { sessionId: sessionId, title: title }), _jsx(Box, { flexDirection: "column", children: entries.map(entry => (_jsx(EntryLine, { entry: entry }, entry.id))) }), pendingConfirm && (_jsxs(Box, { marginTop: 1, paddingX: 1, borderStyle: "round", borderColor: "red", children: [_jsx(Text, { color: "redBright", bold: true, children: '⚠ ' }), _jsxs(Text, { color: "red", children: ["Allow: ", pendingConfirm, "?  "] }), _jsx(Text, { dimColor: true, children: "(y/n)" })] })), !pendingConfirm && (_jsxs(Box, { marginTop: 1, paddingX: 1, borderStyle: "round", borderColor: isProcessing ? 'gray' : 'cyan', children: [_jsx(Text, { color: "cyanBright", bold: true, children: '❯ ' }), _jsx(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit, focus: !isProcessing })] })), isProcessing && (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { dimColor: true, children: " thinking..." })] })), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { dimColor: true, children: "type \"/exit\" to quit" }), _jsxs(Text, { dimColor: true, children: [" | Input tokens used: ", usage.inputTokens, " | Output tokens used: ", usage.outputTokens, " | estimated cost: $", usage.cost.toFixed(4)] })] })] }));
}
render(_jsx(App, {}));
export { App };
//# sourceMappingURL=app.js.map