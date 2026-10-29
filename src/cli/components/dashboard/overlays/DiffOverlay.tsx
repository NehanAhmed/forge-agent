import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../../../../ui/theme.js';
import { truncateCells } from '../../../../ui/text.js';

export interface DiffOverlayProps {
  title: string;
  lines: string[];
  top: number;
  width: number;
  height: number;
  theme: Theme;
  loading: boolean;
  error: string | null;
}

function lineColor(line: string, theme: Theme): string | undefined {
  if (line.startsWith('+++') || line.startsWith('---')) return theme.muted;
  if (line.startsWith('@@')) return theme.accent;
  if (line.startsWith('+')) return theme.success;
  if (line.startsWith('-')) return theme.error;
  if (line.startsWith('diff --git') || line.startsWith('index ')) return theme.muted;
  return undefined;
}

export function DiffOverlay({ title, lines, top, width, height, theme, loading, error }: DiffOverlayProps) {
  const viewport = Math.max(1, height - 2);
  const clampedTop = Math.max(0, Math.min(top, Math.max(0, lines.length - viewport)));
  const visible = lines.slice(clampedTop, clampedTop + viewport);
  const textWidth = Math.max(1, width - 2);

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1} aria-label={`Diff: ${title}`}>
      <Box justifyContent="space-between" width={textWidth}>
        <Text bold color={theme.accent}>
          {truncateCells(title, Math.max(1, textWidth - 18))}
        </Text>
        <Text dimColor>
          {lines.length > 0 ? `${clampedTop + 1}-${Math.min(lines.length, clampedTop + viewport)}/${lines.length}` : ''}
        </Text>
      </Box>

      {error ? (
        <Text color={theme.error} wrap="truncate">
          {truncateCells(error, textWidth)}
        </Text>
      ) : loading ? (
        <Text dimColor>Loading diff…</Text>
      ) : visible.length === 0 ? (
        <Text dimColor>No changes.</Text>
      ) : (
        visible.map((line, index) => (
          <Text key={`${clampedTop + index}`} color={lineColor(line, theme)} wrap="truncate">
            {truncateCells(line, textWidth)}
          </Text>
        ))
      )}
    </Box>
  );
}
