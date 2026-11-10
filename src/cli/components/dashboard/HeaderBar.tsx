import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../core/task.js';
import type { TaskFilter } from '../../../ui/selection.js';
import type { Glyphs, Theme } from '../../../ui/theme.js';
import { getStatusGlyph } from '../../../ui/status-glyphs.js';
import { cellWidth, truncateCells } from '../../../ui/text.js';

export interface HeaderBarProps {
  tasks: Task[];
  approvalsCount: number;
  filter: TaskFilter;
  modelName: string;
  theme: Theme;
  glyphs: Glyphs;
  ascii: boolean;
  columns: number;
}

interface Segment {
  text: string;
  color?: string;
  bold?: boolean;
}

function segmentsWidth(segments: Segment[]): number {
  return segments.reduce((sum, segment) => sum + cellWidth(segment.text), 0);
}

/** Clip a styled run to `maxWidth` cells, adding an ellipsis on the last cut. */
function clipSegments(segments: Segment[], maxWidth: number): Segment[] {
  let remaining = Math.max(0, maxWidth);
  const output: Segment[] = [];

  for (const segment of segments) {
    if (remaining <= 0) break;
    const width = cellWidth(segment.text);
    if (width <= remaining) {
      output.push(segment);
      remaining -= width;
      continue;
    }
    const clipped = truncateCells(segment.text, remaining);
    if (clipped) output.push({ ...segment, text: clipped });
    remaining = 0;
  }

  return output;
}

/**
 * One-line status strip. It is intentionally plain text: the header must never
 * wrap into the task panes, so the line is measured and clipped before render.
 */
export function HeaderBar({ tasks, approvalsCount, filter, modelName, theme, glyphs, ascii, columns }: HeaderBarProps) {
  const summarySegments = useMemo(() => {
    const counts = {
      running: tasks.filter(task => task.status === 'running').length,
      waiting: tasks.filter(task => task.status === 'waiting_approval').length,
      queued: tasks.filter(task => task.status === 'queued').length,
      done: tasks.filter(task => task.status === 'done').length,
      failed: tasks.filter(task => task.status === 'failed').length,
    };
    const compact = columns < 90;
    const parts: Segment[] = [];

    // Counters keep the cream label and only tint the status glyph: the tinted
    // glyphs stay readable on the olive header while the text keeps contrast.
    const pushCount = (glyph: string, tint: string | undefined, label: string) => {
      if (parts.length > 0) parts.push({ text: ` ${glyphs.bullet} `, color: theme.muted });
      parts.push({ text: `${glyph} `, color: tint });
      parts.push({ text: label, color: theme.text });
    };

    if (counts.running > 0) pushCount(getStatusGlyph('running', ascii), theme.success, `${counts.running} running`);
    if (counts.waiting > 0) {
      pushCount(getStatusGlyph('waiting_approval', ascii), theme.warning, `${counts.waiting} waiting`);
    }
    if (counts.queued > 0) pushCount(getStatusGlyph('queued', ascii), theme.muted, `${counts.queued} queued`);
    if (!compact && counts.done > 0) pushCount(getStatusGlyph('done', ascii), theme.success, `${counts.done} done`);
    if (counts.failed > 0) pushCount(getStatusGlyph('failed', ascii), theme.error, `${counts.failed} failed`);
    if (filter !== 'all') {
      if (parts.length > 0) parts.push({ text: ` ${glyphs.bullet} `, color: theme.muted });
      parts.push({ text: `filter ${filter}`, color: theme.accent });
    }

    return parts.length > 0 ? parts : [{ text: 'no tasks yet', color: theme.muted }];
  }, [tasks, columns, filter, ascii, glyphs.bullet, theme]);

  const summary = summarySegments.map(segment => segment.text).join('');

  const rightSegments = useMemo(() => {
    const parts: Segment[] = [];
    const push = (...segments: Segment[]) => {
      if (parts.length > 0) parts.push({ text: `  ${glyphs.bullet}  `, color: theme.muted });
      parts.push(...segments);
    };

    if (columns >= 100) push({ text: `model: ${truncateCells(modelName, 28)}`, color: theme.muted });
    if (approvalsCount > 0) {
      push(
        { text: `${glyphs.approval} `, color: theme.warning },
        {
          text: `${approvalsCount} approval${approvalsCount === 1 ? '' : 's'} ${glyphs.bullet} a`,
          color: theme.text,
          bold: true,
        },
      );
    }
    if (columns >= 60) push({ text: '? help', color: theme.muted });

    return parts;
  }, [approvalsCount, columns, glyphs.approval, glyphs.bullet, modelName, theme]);

  const available = Math.max(1, columns - 2);
  const rightWidth = segmentsWidth(rightSegments);
  const leftWidth = Math.max(1, available - (rightWidth > 0 ? rightWidth + 2 : 0));
  const left = clipSegments(
    [{ text: 'forge', color: theme.accent, bold: true }, { text: '  ', color: theme.muted }, ...summarySegments],
    leftWidth,
  );
  const leftUsed = segmentsWidth(left);
  const spacer = leftWidth > leftUsed ? [{ text: ' '.repeat(leftWidth - leftUsed) }] : [];
  const right = clipSegments(rightSegments, Math.max(0, available - leftWidth - (rightWidth > 0 ? 2 : 0)));

  return (
    <Box
      width={columns}
      height={1}
      paddingX={1}
      backgroundColor={theme.surface}
      overflow="hidden"
      aria-label={`Forge dashboard. ${summary}.${approvalsCount > 0 ? ` ${approvalsCount} approvals pending.` : ''}`}
    >
      <Text wrap="truncate">
        {left.map((segment, index) => (
          <Text key={`left-${index}`} color={segment.color} bold={segment.bold}>
            {segment.text}
          </Text>
        ))}
        {spacer.map((segment, index) => (
          <Text key={`spacer-${index}`}>{segment.text}</Text>
        ))}
        {right.length > 0 && <Text color={theme.muted}>{'  '}</Text>}
        {right.map((segment, index) => (
          <Text key={`right-${index}`} color={segment.color} bold={segment.bold}>
            {segment.text}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
