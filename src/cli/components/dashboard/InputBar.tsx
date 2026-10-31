import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { Glyphs, Theme } from '../../../ui/theme.js';

export interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  focus: boolean;
  theme: Theme;
  glyphs: Glyphs;
  placeholder?: string;
  compact?: boolean;
}

export function InputBar({ value, onChange, onSubmit, focus, theme, glyphs, placeholder, compact }: InputBarProps) {
  return (
    <Box width="100%" height={1} paddingX={compact ? 0 : 1} overflow="hidden" aria-label="Task input">
      {!compact && <Text bold color={focus ? theme.focus : theme.muted}>{`${glyphs.selected} `}</Text>}
      {compact && <Text bold color={focus ? theme.focus : theme.muted}>{`❯ `}</Text>}
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        focus={focus}
        showCursor={focus}
        placeholder={placeholder ?? 'Describe a task or type /help'}
      />
    </Box>
  );
}
