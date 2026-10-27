import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../../core/task.js';
import type { Approval } from '../../../../core/task-manager.js';
import type { Glyphs, Theme } from '../../../../ui/theme.js';
import { truncateCells, cellWidth } from '../../../../ui/text.js';
import { statusLabel } from '../../../../ui/format.js';

export interface ApprovalsOverlayProps {
  approvals: Approval[];
  tasks: Task[];
  index: number;
  width: number;
  height: number;
  theme: Theme;
  glyphs: Glyphs;
  confirmingAll: boolean;
  pending: boolean;
}

export function ApprovalsOverlay({
  approvals,
  tasks,
  index,
  width,
  height,
  theme,
  glyphs,
  confirmingAll,
  pending,
}: ApprovalsOverlayProps) {
  if (approvals.length === 0) {
    return (
      <Box flexDirection="column" width={width} height={height} paddingX={1} aria-label="Approvals inbox">
        <Text bold color={theme.accent}>Approvals</Text>
        <Text dimColor>No pending approvals.</Text>
      </Box>
    );
  }

  const reserved = 2 + (confirmingAll ? 1 : 0);
  let visibleRows = Math.max(1, height - reserved);
  if (approvals.length > visibleRows) {
    visibleRows = Math.max(1, visibleRows - 1);
  }
  const top = Math.max(0, Math.min(index - Math.floor(visibleRows / 2), approvals.length - visibleRows));
  const visible = approvals.slice(top, top + visibleRows);
  const taskById = new Map(tasks.map(task => [task.id, task]));
  const current = approvals[index];
  const currentTask = current ? taskById.get(current.taskId) : undefined;
  const contentWidth = Math.max(1, width - 2);
  const title = `${glyphs.approval} Approvals (${approvals.length})`;
  const headerHints = width >= 76
    ? `enter approve ${glyphs.bullet} n deny ${glyphs.bullet} A all ${glyphs.bullet} esc close`
    : width >= 58
      ? `enter/n ${glyphs.bullet} A all ${glyphs.bullet} esc`
      : `enter/n ${glyphs.bullet} esc`;
  const titleWidth = Math.max(1, contentWidth - cellWidth(headerHints) - 2);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      paddingX={1}
      aria-role="list"
      aria-label="Approvals inbox"
    >
      <Box justifyContent="space-between" width={contentWidth}>
        <Text bold color={theme.warning}>{truncateCells(title, titleWidth)}</Text>
        <Text dimColor>{headerHints}</Text>
      </Box>

      {confirmingAll && (
        <Text color={theme.warning}>
          {pending ? 'Approving…' : `Approve all ${approvals.length} pending action${approvals.length === 1 ? '' : 's'}? y / n`}
        </Text>
      )}

      {visible.map((approval, offset) => {
        const absoluteIndex = top + offset;
        const selected = absoluteIndex === index;
        const task = taskById.get(approval.taskId);
        const rawPrefix = `${selected ? glyphs.selected : ' '} ${glyphs.approval} #${task?.displayId ?? '?'} ${approval.tool} `;
        const rawSuffix = ` ${glyphs.bullet} ${approval.risk}`;
        const suffixWidth = Math.min(cellWidth(rawSuffix), Math.max(0, contentWidth - 1));
        const prefixWidth = Math.max(1, contentWidth - suffixWidth - 1);
        const prefix = truncateCells(rawPrefix, prefixWidth);
        const suffix = truncateCells(rawSuffix, Math.max(0, contentWidth - cellWidth(prefix)));
        const bodyWidth = Math.max(0, contentWidth - cellWidth(prefix) - cellWidth(suffix));
        const body = truncateCells(approval.summary, bodyWidth);

        return (
          <Box
            key={approval.id}
            width={contentWidth}
            aria-role="listitem"
            aria-state={{ selected }}
            aria-label={`Approval for task ${task?.displayId ?? 'unknown'}: ${approval.tool}, ${approval.summary}`}
          >
            <Text bold={selected} color={selected ? theme.focus : undefined}>{prefix}</Text>
            {body !== '' && <Text wrap="truncate">{body}</Text>}
            <Text dimColor>{suffix}</Text>
          </Box>
        );
      })}

      {approvals.length > visible.length && (
        <Text dimColor>
          {[
            top > 0 ? 'more above…' : '',
            top + visible.length < approvals.length ? 'more below…' : '',
          ].filter(Boolean).join(` ${glyphs.bullet} `)}
        </Text>
      )}

      <Text dimColor>
        {truncateCells(
          `${index + 1}/${approvals.length} ${glyphs.bullet} task ${currentTask?.displayId ?? '?'}${
            currentTask ? ` ${glyphs.bullet} ${statusLabel(currentTask.status)}` : ''
          }`,
          contentWidth,
        )}
      </Text>
    </Box>
  );
}
