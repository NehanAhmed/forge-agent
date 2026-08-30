// App.tsx
import 'dotenv/config';
import React, { useState, useRef } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import { runAgent, type LogEvent } from './agent-cli.js';
import { SYSTEM_PROMPT, MODEL, AGENT_NAME } from './constant.js';
import {
  loadSession,
  createNewSessionId,
  getLatestSessionId,
  type Message
} from './session.js';
import { messagesToEntries, type DisplayEntry } from './converter.js';

function resolveSessionId(): { sessionId: string; isResumed: boolean } {
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

function Header({ sessionId }: { sessionId: string }) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Gradient name="pastel">
          <Text bold>▲ {AGENT_NAME}</Text>
        </Gradient>
        <Text dimColor>model: {MODEL} | session: {sessionId.slice(0, 8)}</Text>
      </Box>
    </Box>

  );
}

function EntryLine({ entry }: { entry: DisplayEntry }) {
  switch (entry.kind) {
    case 'user':
      return (
        <Box marginTop={1}>
          <Text color="cyanBright" bold>{'❯ '}</Text>
          <Text color="cyanBright">{entry.text}</Text>
        </Box>
      );
    case 'reasoning':
      return (
        <Box marginTop={1} paddingLeft={2} borderStyle="round" borderColor="gray" flexDirection="column">
          <Text dimColor italic>{entry.text}</Text>
        </Box>
      );
    case 'tool_call':
      return (
        <Box marginTop={1}>
          <Text color="yellowBright">{'⚡ '}</Text>
          <Text color="yellow">{entry.text}</Text>
        </Box>
      );
    case 'tool_result':
      return (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="greenBright" dimColor>
            {entry.text.length > 400 ? entry.text.slice(0, 400) + '…' : entry.text}
          </Text>
        </Box>
      );
    case 'assistant':
      return (
        <Box marginTop={1} paddingLeft={1} flexDirection="column">
          <Text color="white">{entry.text}</Text>
        </Box>
      );
    case 'info':
      return (
        <Box marginTop={1}>
          <Text color="magentaBright">{'ℹ '}</Text>
          <Text color="magenta">{entry.text}</Text>
        </Box>
      );
  }
}

function App() {
  const confirmResolverRef = useRef<((val: boolean) => void) | null>(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const sessionRef = useRef(resolveSessionId());
  const sessionId = sessionRef.current.sessionId;

  const messagesRef = useRef<Message[]>(initMessages());
  const [entries, setEntries] = useState<DisplayEntry[]>(() => {
    return messagesToEntries(messagesRef.current);
  });
  function initMessages(): Message[] {
    const loaded = loadSession(sessionId);
    if (loaded.length === 0) {
      loaded.push({ role: 'system', content: SYSTEM_PROMPT });
    }
    return loaded;
  }

  function pushEntry(kind: DisplayEntry['kind'], text: string) {
    setEntries(prev => [...prev, { id: entryId++, kind, text }]);
  }

  function appendToLastAssistant(delta: string) {
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

  function appendToLastReasoning(delta: string) {
    setEntries(prev => {
      const last = prev[prev.length - 1];
      if (last?.kind === 'reasoning') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: last.text + delta };
        return updated;
      }
      return [...prev, { id: entryId++, kind: 'reasoning', text: delta }];
    });
  }

  async function handleConfirm(description: string): Promise<boolean> {
    setPendingConfirm(description);
    return new Promise<boolean>(resolve => {
      confirmResolverRef.current = resolve;
    });
  }

  useInput((inputChar) => {
    if (!pendingConfirm) return;
    const lower = inputChar.toLowerCase();
    if (lower === 'y' || lower === 'n') {
      const resolver = confirmResolverRef.current;
      setPendingConfirm(null);
      confirmResolverRef.current = null;
      resolver?.(lower === 'y');
    }
  });

  async function handleSubmit(value: string) {
    if (!value.trim() || isProcessing) return;

    if (value.trim().toLowerCase() === 'exit') {
      process.exit(0);
    }

    pushEntry('user', value);
    setInput('');
    setIsProcessing(true);

    messagesRef.current.push({ role: 'user', content: value });

    const onLog = (event: LogEvent) => {
      switch (event.type) {
        case 'reasoning_delta':
          appendToLastReasoning(event.content);
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

  return (
    <Box flexDirection="column" padding={1}>
      <Header sessionId={sessionId} />

      <Box flexDirection="column">
        {entries.map(entry => (
          <EntryLine key={entry.id} entry={entry} />
        ))}
      </Box>

      {pendingConfirm && (
        <Box marginTop={1} paddingX={1} borderStyle="round" borderColor="red">
          <Text color="redBright" bold>{'⚠ '}</Text>
          <Text color="red">Allow: {pendingConfirm}?  </Text>
          <Text dimColor>(y/n)</Text>
        </Box>
      )}

      {!pendingConfirm && (
        <Box marginTop={1} paddingX={1} borderStyle="round" borderColor={isProcessing ? 'gray' : 'cyan'}>
          <Text color="cyanBright" bold>{'❯ '}</Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} focus={!isProcessing} />
        </Box>
      )}

      {isProcessing && (
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text dimColor> thinking...</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>type "exit" to quit</Text>
      </Box>
    </Box>
  );
}

render(<App />);