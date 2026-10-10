import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../core/task.js';
import type { LogEntry } from '../../../core/context.js';
import { getStatusGlyph } from '../../../ui/status-glyphs.js';

export interface TaskDetailProps {
  task: Task;
  entries: LogEntry[];
  atBottom: boolean;
  hasNewBelow: boolean;
  onScrollUp: () => void;
  onScrollDown: () => void;
  width: number;
  height: number;
  useAscii: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

function formatEntry(entry: LogEntry, width: number): string {
  const maxLen = width - 6;
  let text = entry.content;
  if (text.length > maxLen) {
    text = text.slice(0, maxLen - 3) + '…';
  }
  return text;
}

export function TaskDetail({ task, entries, atBottom, hasNewBelow, width, useAscii }: TaskDetailProps) {
  const glyph = getStatusGlyph(task.status, useAscii);

  const cost = task.usage.cost > 0 ? `$${task.usage.cost.toFixed(2)}` : '$0.00';
  const requests = `${task.usage.requests}/60`;

  const elapsed = task.startedAt && task.status !== 'done' && task.status !== 'failed' && task.status !== 'cancelled'
    ? Math.floor((Date.now() - task.startedAt) / 1000)
    : task.finishedAt && task.startedAt
      ? Math.floor((task.finishedAt - task.startedAt) / 1000)
      : null;

  return (
    <Box flexDirection="column">
      {/* Compact header */}
      <Box marginBottom={1}>
        <Text bold>
          {glyph} #{task.displayId} {task.goal}
        </Text>
        <Text dimColor>
          {'  '}[{task.status}]
          {task.statusDetail && ` ${task.statusDetail}`}
          {'  '}{cost} · {requests}
          {elapsed !== null && ` · ${elapsed}s`}
          {task.worktree && ` · ${task.worktree.branch}`}
        </Text>
        {task.reviewState === 'pending_review' && (
          <Text color="yellowBright"> Review ready · /diff · /merge · /discard</Text>
        )}
        {task.reviewState === 'merged' && (
          <Text color="greenBright"> Review: merged ✓</Text>
        )}
        {task.reviewState === 'discarded' && (
          <Text color="redBright"> Review: discarded</Text>
        )}
        {task.error && (
          <Text color="redBright"> Error: [{task.error.code}] {task.error.message}</Text>
        )}
      </Box>

      {/* Log entries */}
      {entries.map(entry => (
        <LogLine key={entry.seq} entry={entry} width={width} />
      ))}

      {/* Scroll indicators */}
      {hasNewBelow && (
        <Box marginTop={1}>
          <Text color="yellowBright">▼ new output below</Text>
        </Box>
      )}
      {!atBottom && !hasNewBelow && (
        <Box marginTop={1}>
          <Text dimColor>▲ scrolled up</Text>
        </Box>
      )}
    </Box>
  );
}

function LogLine({ entry, width }: { entry: LogEntry; width: number }) {
  const maxLen = width - 4;
  let text = entry.content;
  if (text.length > maxLen) {
    text = text.slice(0, maxLen - 3) + '…';
  }

  switch (entry.type) {
    case 'assistant':
      return (
        <Box marginTop={1}>
          <Text color="white">{text}</Text>
        </Box>
      );
    case 'reasoning':
      return (
        <Box marginTop={1} paddingLeft={2}>
          <Text dimColor italic>{text}</Text>
        </Box>
      );
    case 'tool_call':
      return (
        <Box marginTop={1}>
          <Text color="yellowBright">⚡ {text}</Text>
        </Box>
      );
    case 'tool_result':
      return (
        <Box paddingLeft={2}>
          <Text color="greenBright" dimColor>{text}</Text>
        </Box>
      );
    case 'info':
      return (
        <Box marginTop={1}>
          <Text color="magentaBright">ℹ {text}</Text>
        </Box>
      );
    case 'error':
      return (
        <Box marginTop={1}>
          <Text color="redBright">✗ {text}</Text>
        </Box>
      );
  }
}
