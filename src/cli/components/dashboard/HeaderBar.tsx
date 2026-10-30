import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../core/task.js';
import type { TaskFilter } from '../../../ui/selection.js';
import type { Glyphs, Theme } from '../../../ui/theme.js';
import { getStatusGlyph } from '../../../ui/status-glyphs.js';
import { cellWidth, fitCells } from '../../../ui/text.js';

export interface HeaderBarProps {
  tasks: Task[];
  approvalsCount: number;
  filter: TaskFilter;
  theme: Theme;
  glyphs: Glyphs;
  ascii: boolean;
  columns: number;
}

/**
 * One-line status strip. It is intentionally plain text: the header must never
 * wrap into the task panes, so the line is measured and clipped before render.
 */
export function HeaderBar({ tasks, approvalsCount, filter, theme, glyphs, ascii, columns }: HeaderBarProps) {
  const summary = useMemo(() => {
    const counts = {
      running: tasks.filter(task => task.status === 'running').length,
      waiting: tasks.filter(task => task.status === 'waiting_approval').length,
      queued: tasks.filter(task => task.status === 'queued').length,
      done: tasks.filter(task => task.status === 'done').length,
      failed: tasks.filter(task => task.status === 'failed').length,
    };
    const compact = columns < 90;
    const parts: string[] = [];

    if (counts.running > 0) parts.push(`${getStatusGlyph('running', ascii)} ${counts.running} running`);
    if (counts.waiting > 0) parts.push(`${getStatusGlyph('waiting_approval', ascii)} ${counts.waiting} waiting`);
    if (counts.queued > 0) parts.push(`${getStatusGlyph('queued', ascii)} ${counts.queued} queued`);
    if (!compact && counts.done > 0) parts.push(`${getStatusGlyph('done', ascii)} ${counts.done} done`);
    if (counts.failed > 0) parts.push(`${getStatusGlyph('failed', ascii)} ${counts.failed} failed`);
    if (filter !== 'all') parts.push(`filter ${filter}`);

    return parts.length > 0 ? parts.join(` ${glyphs.bullet} `) : 'no tasks yet';
  }, [tasks, columns, filter, ascii, glyphs.bullet]);

  const right = [
    approvalsCount > 0
      ? `${glyphs.approval} ${approvalsCount} approval${approvalsCount === 1 ? '' : 's'} ${glyphs.bullet} a`
      : '',
    columns >= 60 ? '? help' : '',
  ]
    .filter(Boolean)
    .join(`  ${glyphs.bullet}  `);

  const left = `forge  ${summary}`;
  const available = Math.max(1, columns - 2);
  const leftWidth = Math.max(1, available - (right ? cellWidth(right) + 2 : 0));
  const line = fitCells(left, leftWidth) + (right ? `  ${right}` : '');

  return (
    <Box
      width={columns}
      height={1}
      paddingX={1}
      overflow="hidden"
      aria-label={`Forge dashboard. ${summary}.${approvalsCount > 0 ? ` ${approvalsCount} approvals pending.` : ''}`}
    >
      <Text color={theme.muted} wrap="truncate">
        {line}
      </Text>
    </Box>
  );
}
