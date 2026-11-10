import React from 'react';
import { Box, Text } from 'ink';
import type { Glyphs, Theme } from '../../../ui/theme.js';
import { cellWidth, truncateCells } from '../../../ui/text.js';

export interface KeyBarNotice {
  kind: 'info' | 'error';
  text: string;
}

export interface KeyBarConfirm {
  title: string;
  target: string;
  consequence: string;
  pending: boolean;
}

export interface KeyBarProps {
  hints: string;
  notice: KeyBarNotice | null;
  confirm: KeyBarConfirm | null;
  width: number;
  theme: Theme;
  glyphs: Glyphs;
}

export function KeyBar({ hints, notice, confirm, width, theme, glyphs }: KeyBarProps) {
  let content: React.ReactNode;
  let label: string;
  const ellipsis = glyphs.selected === '>' ? '...' : '…';

  if (confirm) {
    const body = confirm.pending
      ? `${confirm.title} ${glyphs.bullet} working${ellipsis}`
      : `${confirm.title} ${glyphs.bullet} ${confirm.target} ${glyphs.bullet} ${confirm.consequence} - y confirm ${glyphs.bullet} n cancel`;
    const glyph = confirm.pending ? '' : `${glyphs.approval} `;
    const available = Math.max(0, width - 2 - cellWidth(glyph));
    content = (
      <Text>
        {glyph !== '' && (
          <Text bold color={theme.warning}>
            {glyph}
          </Text>
        )}
        <Text bold={!confirm.pending} color={confirm.pending ? theme.muted : theme.text}>
          {truncateCells(body, available)}
        </Text>
      </Text>
    );
    label = `${glyph}${body}`;
  } else if (notice) {
    const prefix = notice.kind === 'error' ? `${glyphs.approval} ` : 'i ';
    const available = Math.max(0, width - 2 - cellWidth(prefix));
    content = (
      <Text wrap="truncate">
        <Text bold color={notice.kind === 'error' ? theme.error : theme.info}>
          {prefix}
        </Text>
        <Text color={theme.accent}>{truncateCells(notice.text, available)}</Text>
      </Text>
    );
    label = notice.text;
  } else {
    content = (
      <Text color={theme.muted} wrap="truncate">
        {truncateCells(hints, width - 2)}
      </Text>
    );
    label = hints;
  }

  return (
    <Box width="100%" height={1} paddingX={1} backgroundColor={theme.surface} overflow="hidden" aria-label={label}>
      {content}
    </Box>
  );
}
