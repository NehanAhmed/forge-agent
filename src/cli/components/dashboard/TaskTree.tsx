import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../core/task.js';
import { getStatusGlyph, needsAttention } from '../../../ui/status-glyphs.js';
import { buildTree, getVisibleRows } from '../../../ui/tree-builder.js';

export interface TaskTreeProps {
  tasks: Task[];
  selectedId: string | null;
  collapsed: Set<string>;
  width: number;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  useAscii: boolean;
}

export function TaskTree({ tasks, selectedId, collapsed, width, onSelect, onToggle, useAscii }: TaskTreeProps) {
  const tree = buildTree(tasks);
  const rows = getVisibleRows(tree, collapsed);

  if (rows.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>No tasks yet. Type a goal to create one.</Text>
      </Box>
    );
  }

  const maxGoalLen = Math.max(20, width - 20);

  return (
    <Box flexDirection="column">
      {rows.map(row => {
        const glyph = getStatusGlyph(row.task.status, useAscii);
        const attention = needsAttention(row.task);
        const selected = row.task.id === selectedId;
        const elapsed = row.task.startedAt && row.task.status !== 'done' && row.task.status !== 'failed' && row.task.status !== 'cancelled'
          ? Math.floor((Date.now() - row.task.startedAt) / 1000)
          : row.task.finishedAt && row.task.startedAt
            ? Math.floor((row.task.finishedAt - row.task.startedAt) / 1000)
            : null;

        // Only show cost when non-zero
        const hasCost = row.totalCost > 0;
        const cost = hasCost ? `$${row.totalCost.toFixed(2)}` : '';

        const goal = row.task.goal.length > maxGoalLen
          ? row.task.goal.slice(0, maxGoalLen - 1) + '…'
          : row.task.goal;

        const prefix = row.isCollapsed && row.hasChildren
          ? `▶ ${row.task.displayId} `
          : row.hasChildren
            ? `▸ ${row.task.displayId} `
            : `  ${row.task.displayId} `;

        return (
          <Box key={row.task.id}>
            <Text
              color={selected ? 'cyanBright' : undefined}
              bold={selected}
              dimColor={!selected && !attention}
            >
              {' '.repeat(row.depth * 2)}
              {prefix}
              {glyph}
              {' '}
              {goal}
              {elapsed !== null && elapsed > 0 && <Text dimColor> {elapsed}s</Text>}
              {hasCost && <Text dimColor> {cost}</Text>}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
