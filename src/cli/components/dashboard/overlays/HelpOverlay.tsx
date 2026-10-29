import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../../../../ui/theme.js';
import { fitCells, truncateCells } from '../../../../ui/text.js';

export interface HelpOverlayProps {
  width: number;
  height: number;
  theme: Theme;
  ascii?: boolean;
}

const HELP_ROWS: Array<[string, string]> = [
  ['↑ ↓', 'move selection / scroll log'],
  ['← →', 'collapse / expand task'],
  ['tab', 'switch list and input'],
  ['enter', 'open task detail'],
  ['esc', 'back / close overlay'],
  ['a', 'approvals inbox'],
  ['c', 'cancel task tree'],
  ['r', 'resume failed task'],
  ['m', 'merge reviewed task'],
  ['x', 'discard worktree'],
  ['D', 'show diff'],
  ['s', 'filter: all / active / attention'],
  ['f', 'follow log tail'],
  ['v', 'compact / verbose log'],
  ['/', 'focus input for a command'],
  ['?', 'toggle this help'],
  ['q', 'quit dashboard'],
];

const ASCII_HELP_ROWS: Array<[string, string]> = HELP_ROWS.map(([key, description]) => {
  if (key === '↑ ↓') return ['up/down', description];
  if (key === '← →') return ['left/right', description];
  return [key, description];
});

export function HelpOverlay({ width, height, theme, ascii = false }: HelpOverlayProps) {
  const bindings = ascii ? ASCII_HELP_ROWS : HELP_ROWS;
  const available = Math.max(1, height - 2);
  const rows = bindings.slice(0, available);
  const keyWidth = ascii ? 11 : 7;
  const descriptionWidth = Math.max(1, width - 2 - keyWidth);

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1} aria-label="Dashboard help">
      <Text bold color={theme.accent}>
        Keyboard
      </Text>
      {rows.map(([key, description]) => (
        <Box key={key} width={Math.max(1, width - 2)}>
          <Text color={theme.focus}>{fitCells(key, keyWidth)}</Text>
          <Text wrap="truncate">{truncateCells(description, descriptionWidth)}</Text>
        </Box>
      ))}
      {bindings.length > rows.length && <Text dimColor>{ascii ? '...' : '…'}</Text>}
    </Box>
  );
}
