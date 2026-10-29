import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../../../ui/theme.js';
import { truncateCells } from '../../../ui/text.js';

export interface TooSmallProps {
  columns: number;
  rows: number;
  theme: Theme;
  help?: boolean;
  ascii?: boolean;
}

export function TooSmall({ columns, rows, theme, help = false, ascii = false }: TooSmallProps) {
  const size = `${columns}${ascii ? 'x' : '×'}${rows}`;
  const width = Math.max(1, columns - 2);

  if (help) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text bold color={theme.accent}>
          keys
        </Text>
        <Text wrap="truncate">
          {truncateCells(`? / q close${ascii ? ' | ' : ' · '}resize to at least 50x10`, width)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold color={theme.accent}>
        forge
      </Text>
      <Text wrap="truncate">{truncateCells(`Terminal too small (${size}). Need at least 50x10.`, width)}</Text>
      <Text dimColor wrap="truncate">
        {truncateCells('Resize the terminal, or press q to quit.', width)}
      </Text>
    </Box>
  );
}
