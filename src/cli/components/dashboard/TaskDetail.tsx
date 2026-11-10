import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../core/task.js';
import type { LogDisplayLine } from '../../../ui/log-view.js';
import type { Glyphs, Theme } from '../../../ui/theme.js';
import { logColor, statusColor } from '../../../ui/theme.js';
import { getStatusGlyph } from '../../../ui/status-glyphs.js';
import { cellWidth, truncateCells } from '../../../ui/text.js';
import { formatCost, formatDuration, policyLabel, statusLabel, taskElapsed } from '../../../ui/format.js';
import { InputBar } from './InputBar.js';

export interface TaskDetailProps {
  task: Task;
  lines: LogDisplayLine[];
  hasNewBelow: boolean;
  follow: boolean;
  loading: boolean;
  error: string | null;
  width: number;
  height: number;
  theme: Theme;
  glyphs: Glyphs;
  ascii: boolean;
  now: number;
  followUpMode?: boolean;
  followUpValue?: string;
  onFollowUpChange?: (value: string) => void;
  onFollowUpSubmit?: (value: string) => void;
}

function reviewLabel(task: Task): string {
  switch (task.reviewState) {
    case 'pending_review':
      return 'review ready';
    case 'merged':
      return 'merged';
    case 'discarded':
      return 'discarded';
    case 'conflict':
      return 'conflict';
    case 'needs_attention':
      return 'needs attention';
    case 'none':
      return '';
  }
}

export function TaskDetail({
  task,
  lines,
  hasNewBelow,
  follow,
  loading,
  error,
  width,
  height,
  theme,
  glyphs,
  ascii,
  now,
  followUpMode,
  followUpValue,
  onFollowUpChange,
  onFollowUpSubmit,
}: TaskDetailProps) {
  const statusGlyph = getStatusGlyph(task.status, ascii);
  const statusText = statusLabel(task.status);
  const elapsed = taskElapsed(task, now);
  const review = reviewLabel(task);

  const metaParts = [
    elapsed !== null ? formatDuration(elapsed) : '',
    task.usage.requests > 0 ? `${task.usage.requests} req` : '',
    formatCost(task.usage.cost),
    task.worktree?.branch ?? '',
    review,
    policyLabel(task.policy),
    !follow ? 'paused' : '',
    hasNewBelow && !follow ? 'new below' : '',
  ].filter(Boolean);
  const meta = metaParts.join(` ${glyphs.bullet} `);

  const statusDetail = task.statusDetail && task.status !== 'done' ? task.statusDetail : '';
  const secondLine = task.error
    ? `[${task.error.code}] ${task.error.message}`
    : [statusDetail, meta].filter(Boolean).join(` ${glyphs.bullet} `);

  const titleWidth = Math.max(10, width - cellWidth(statusText) - 4);
  const idLabel = `#${task.displayId}`;
  const goalWidth = Math.max(1, titleWidth - cellWidth(idLabel) - 1);
  const logHeight = Math.max(1, height - (followUpMode ? 4 : 3));
  const visibleLines = lines.slice(-logHeight);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      overflow="hidden"
      aria-label={`Task ${task.displayId}: ${task.goal}. Status ${statusText}.`}
    >
      <Box width={width} justifyContent="space-between">
        <Text bold color={theme.text}>
          <Text color={theme.muted}>{idLabel}</Text> {truncateCells(task.goal, goalWidth)}
        </Text>
        <Text bold color={statusColor(task.status, theme)}>
          {statusGlyph} {statusText}
        </Text>
      </Box>

      <Box width={width}>
        <Text color={task.error ? theme.error : theme.muted} wrap="truncate">
          {truncateCells(secondLine, width)}
        </Text>
      </Box>

      <Text color={theme.separator}>{glyphs.separator.repeat(Math.max(1, width))}</Text>

      {error ? (
        <Text color={theme.error} wrap="truncate">
          Could not load log: {truncateCells(error, Math.max(1, width - 20))}
        </Text>
      ) : loading && lines.length === 0 ? (
        <Text color={theme.muted}>{ascii ? 'Loading log...' : 'Loading log…'}</Text>
      ) : visibleLines.length === 0 ? (
        <Text color={theme.muted}>No output yet.</Text>
      ) : (
        visibleLines.map((line, index) => {
          const available = Math.max(1, width - cellWidth(line.prefix));
          return (
            <Box key={`${line.seq}-${index}`} width={width}>
              <Text color={theme.muted}>{line.prefix}</Text>
              <Text color={logColor(line.entry.type, theme)} wrap="truncate">
                {truncateCells(line.text, available)}
              </Text>
            </Box>
          );
        })
      )}

      {followUpMode && onFollowUpChange && onFollowUpSubmit && (
        <Box marginTop={1} width={width}>
          <InputBar
            value={followUpValue ?? ''}
            onChange={onFollowUpChange}
            onSubmit={onFollowUpSubmit}
            focus={true}
            theme={theme}
            glyphs={glyphs}
            placeholder="Type a follow-up message (Esc to back)..."
            compact={true}
          />
        </Box>
      )}
    </Box>
  );
}
