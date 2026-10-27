import React from 'react';
import { Box, Text } from 'ink';
import type { VisibleRow } from '../../../ui/tree-builder.js';
import type { TaskFilter } from '../../../ui/selection.js';
import type { Glyphs, Theme } from '../../../ui/theme.js';
import { getStatusGlyph, needsAttention } from '../../../ui/status-glyphs.js';
import { cellWidth, fitCells, truncateCells } from '../../../ui/text.js';
import { formatCost, formatDuration, statusLabel, taskElapsed } from '../../../ui/format.js';

export interface TaskListProps {
  rows: VisibleRow[];
  selectedId: string | null;
  top: number;
  height: number;
  width: number;
  filter: TaskFilter;
  loading: boolean;
  theme: Theme;
  glyphs: Glyphs;
  ascii: boolean;
  showCost: boolean;
  now: number;
}

export function TaskList({
  rows,
  selectedId,
  top,
  height,
  width,
  filter,
  loading,
  theme,
  glyphs,
  ascii,
  showCost,
  now,
}: TaskListProps) {
  if (loading && rows.length === 0) {
    return (
      <Box width={width}>
        <Text dimColor>{ascii ? 'Loading tasks...' : 'Loading tasks…'}</Text>
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box width={width}>
        <Text dimColor>
          {filter === 'all' ? 'No tasks yet. Type a goal below.' : `No ${filter} tasks.`}
        </Text>
      </Box>
    );
  }

  const visible = rows.slice(top, top + Math.max(1, height));

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden" aria-role="list">
      {visible.map(row => {
        const task = row.task;
        const selected = task.id === selectedId;
        const statusGlyph = getStatusGlyph(task.status, ascii);
        const attention = needsAttention(task) && task.status !== 'waiting_approval' && task.status !== 'failed';
        const caret = selected ? glyphs.selected : ' ';
        const maxIndentDepth = Math.max(0, Math.min(row.depth, Math.floor((width - 18) / 2)));
        const indent = '  '.repeat(maxIndentDepth);
        const tree = row.hasChildren
          ? (row.isCollapsed ? glyphs.collapsed : glyphs.expanded)
          : glyphs.leaf;
        const prefix = `${caret} ${indent}${tree}${task.displayId} ${statusGlyph} `;
        const attentionText = attention ? `${glyphs.approval} ` : '';

        const elapsedMs = taskElapsed(task, now);
        const showElapsed = elapsedMs !== null &&
          (task.status === 'running' || task.status === 'waiting_approval' || task.status === 'queued');
        const metaParts = [
          showElapsed ? formatDuration(elapsedMs) : '',
          showCost ? formatCost(row.totalCost) : '',
        ].filter(Boolean);
        const meta = metaParts.join(` ${glyphs.bullet} `);

        const metaWidth = meta ? cellWidth(meta) + 1 : 0;
        const goalWidth = Math.max(1, width - cellWidth(prefix) - cellWidth(attentionText) - metaWidth);
        const goal = truncateCells(task.goal, goalWidth);
        const paddedGoal = fitCells(goal, goalWidth);

        return (
          <Box
            key={task.id}
            width={width}
            aria-role="listitem"
            aria-state={{ selected }}
            aria-label={`${statusLabel(task.status)} task ${task.displayId}: ${task.goal}${selected ? ', selected' : ''}`}
          >
            <Text color={selected ? theme.focus : undefined} bold={selected}>{prefix}</Text>
            {attentionText !== '' && <Text color={theme.warning}>{attentionText}</Text>}
            <Text bold={selected} color={selected ? theme.focus : theme.text}>{paddedGoal}</Text>
            {meta !== '' && <Text dimColor>{` ${meta}`}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
