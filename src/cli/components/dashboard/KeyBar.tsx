import React from 'react';
import { Box, Text } from 'ink';
import type { Glyphs, Theme } from '../../../ui/theme.js';
import { truncateCells } from '../../../ui/text.js';

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
    const text = confirm.pending
      ? `${confirm.title} ${glyphs.bullet} working${ellipsis}`
      : `${glyphs.approval} ${confirm.title} ${glyphs.bullet} ${confirm.target} ${glyphs.bullet} ${confirm.consequence} - y confirm ${glyphs.bullet} n cancel`;
    content = <Text color={confirm.pending ? theme.muted : theme.warning}>{truncateCells(text, width - 2)}</Text>;
    label = text;
  } else if (notice) {
    const prefix = notice.kind === 'error' ? `${glyphs.approval} ` : 'i ';
    const text = `${prefix}${notice.text}`;
    content = (
      <Text color={notice.kind === 'error' ? theme.error : theme.muted} wrap="truncate">
        {truncateCells(text, width - 2)}
      </Text>
    );
    label = notice.text;
  } else {
    content = (
      <Text dimColor wrap="truncate">
        {truncateCells(hints, width - 2)}
      </Text>
    );
    label = hints;
  }

  return (
    <Box width="100%" height={1} paddingX={1} overflow="hidden" aria-label={label}>
      {content}
    </Box>
  );
}
