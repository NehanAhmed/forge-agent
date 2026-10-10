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
  const maxLen = width - 10;
  let text = entry.content;
  if (text.length > maxLen) {
    text = text.slice(0, maxLen - 3) + '…';
  }
  return text;
}

export function TaskDetail({ task, entries, atBottom, hasNewBelow, onScrollUp, onScrollDown, width, useAscii, onApprove, onDeny }: TaskDetailProps) {
  const glyph = getStatusGlyph(task.status, useAscii);
  const elapsed = task.startedAt && task.status !== 'done' && task.status !== 'failed' && task.status !== 'cancelled'
    ? Math.floor((Date.now() - task.startedAt) / 1000)
    : task.finishedAt && task.startedAt
      ? Math.floor((task.finishedAt - task.startedAt) / 1000)
      : null;

  const cost = task.usage.cost > 0 ? `$${task.usage.cost.toFixed(2)}` : '$0.00';
  const requests = `${task.usage.requests}/60`;

  const pendingApprovals = entries.filter(e => e.type === 'info' && e.content.includes('[approval:'));

  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      {/* Header */}
      <Box marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>
          {glyph} {task.displayId} {task.goal}
        </Text>
        <Text dimColor>  status: {task.status} {task.statusDetail ? `(${task.statusDetail})` : ''}</Text>
        {task.worktree && (
          <Text dimColor>  branch: {task.worktree.branch}</Text>
        )}
        <Text dimColor>  usage: {cost} · {requests} requests</Text>
        {elapsed !== null && <Text dimColor>  elapsed: {elapsed}s</Text>}
        {task.reviewState === 'pending_review' && (
          <Text color="yellowBright">  Review: ready · /diff · /merge · /discard</Text>
        )}
        {task.reviewState === 'merged' && (
          <Text color="greenBright">  Review: merged ✓</Text>
        )}
        {task.reviewState === 'discarded' && (
          <Text color="redBright">  Review: discarded ✗</Text>
        )}
        {task.error && (
          <Text color="redBright">  Error: [{task.error.code}] {task.error.message}</Text>
        )}
      </Box>

      {/* Log */}
      <Box flexDirection="column" marginBottom={1}>
        {entries.map(entry => (
          <LogLine key={entry.seq} entry={entry} width={width} />
        ))}
      </Box>

      {/* Scroll indicators */}
      <Box>
        {hasNewBelow && (
          <Text color="yellowBright">▼ new output below (PageDown to scroll)</Text>
        )}
        {!atBottom && !hasNewBelow && (
          <Text dimColor>▲ scrolled up (PageUp/PageDown to navigate)</Text>
        )}
      </Box>

      {/* Pending approvals in detail */}
      {pendingApprovals.length > 0 && (
        <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellowBright">⚠ Approvals pending:</Text>
          {pendingApprovals.map((a, i) => (
            <Text key={i} color="yellow"> {a.content}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

function LogLine({ entry, width }: { entry: LogEntry; width: number }) {
  const maxLen = width - 10;
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
        <Box paddingLeft={2} flexDirection="column">
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