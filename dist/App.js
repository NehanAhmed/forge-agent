import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// App.tsx
import 'dotenv/config';
import React, { useState, useRef } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import { runAgent } from './agent-cli.js';
import { SYSTEM_PROMPT, MODEL, AGENT_NAME } from './constant.js';
import { loadSession, createNewSessionId, getLatestSessionId } from './session.js';
import { messagesToEntries } from './converter.js';
function resolveSessionId() {
    const args = process.argv.slice(2);
    const resumeIdx = args.indexOf('--resume');
    if (resumeIdx !== -1) {
        const specifiedId = args[resumeIdx + 1];
        const targetId = specifiedId && !specifiedId.startsWith('--')
            ? specifiedId
            : getLatestSessionId();
        if (targetId) {
            return { sessionId: targetId, isResumed: true };
        }
    }
    return { sessionId: createNewSessionId(), isResumed: false };
}
let entryId = 0;
function Header({ sessionId }) {
    return (_jsx(Box, { flexDirection: "column", padding: 1, children: _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Gradient, { name: "pastel", children: _jsxs(Text, { bold: true, children: ["\u25B2 $", AGENT_NAME] }) }), _jsxs(Text, { dimColor: true, children: ["model: ", MODEL, " | session: ", sessionId.slice(0, 8)] })] }) }));
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
function App() {
    const confirmResolverRef = useRef(null);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState(null);
    const sessionRef = useRef(resolveSessionId());
    const sessionId = sessionRef.current.sessionId;
    const messagesRef = useRef(initMessages());
    const [entries, setEntries] = useState(() => {
        return messagesToEntries(messagesRef.current);
    });
    function initMessages() {
        const loaded = loadSession(sessionId);
        if (loaded.length === 0) {
            loaded.push({ role: 'system', content: SYSTEM_PROMPT });
        }
        return loaded;
    }
    function pushEntry(kind, text) {
        setEntries(prev => [...prev, { id: entryId++, kind, text }]);
    }
    function appendToLastAssistant(delta) {
        setEntries(prev => {
            const last = prev[prev.length - 1];
            if (last?.kind === 'assistant') {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, text: last.text + delta };
                return updated;
            }
            return [...prev, { id: entryId++, kind: 'assistant', text: delta }];
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
        if (value.trim().toLowerCase() === 'exit') {
            process.exit(0);
        }
        pushEntry('user', value);
        setInput('');
        setIsProcessing(true);
        messagesRef.current.push({ role: 'user', content: value });
        const onLog = (event) => {
            switch (event.type) {
                case 'reasoning':
                    pushEntry('reasoning', event.content);
                    break;
                case 'tool_call':
                    pushEntry('tool_call', `${event.name}(${JSON.stringify(event.args)})`);
                    break;
                case 'tool_result':
                    pushEntry('tool_result', event.content);
                    break;
                case 'assistant_delta':
                    appendToLastAssistant(event.content);
                    break;
                case 'info':
                    pushEntry('info', event.content);
                    break;
            }
        };
        messagesRef.current = await runAgent(sessionId, messagesRef.current, {
            onLog,
            onConfirm: handleConfirm,
        });
        setIsProcessing(false);
    }
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Header, { sessionId: sessionId }), _jsx(Box, { flexDirection: "column", children: entries.map(entry => (_jsx(EntryLine, { entry: entry }, entry.id))) }), pendingConfirm && (_jsxs(Box, { marginTop: 1, paddingX: 1, borderStyle: "round", borderColor: "red", children: [_jsx(Text, { color: "redBright", bold: true, children: '⚠ ' }), _jsxs(Text, { color: "red", children: ["Allow: ", pendingConfirm, "?  "] }), _jsx(Text, { dimColor: true, children: "(y/n)" })] })), !pendingConfirm && (_jsxs(Box, { marginTop: 1, paddingX: 1, borderStyle: "round", borderColor: isProcessing ? 'gray' : 'cyan', children: [_jsx(Text, { color: "cyanBright", bold: true, children: '❯ ' }), _jsx(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit, focus: !isProcessing })] })), isProcessing && (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { dimColor: true, children: " thinking..." })] })), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "type \"exit\" to quit" }) })] }));
}
render(_jsx(App, {}));
//# sourceMappingURL=App.js.map