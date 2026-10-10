import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface DashboardInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  focus: boolean;
  placeholder?: string;
}

export function DashboardInput({ value, onChange, onSubmit, focus, placeholder }: DashboardInputProps) {
  return (
    <Box paddingX={1} marginTop={1} borderStyle="round" borderColor={focus ? 'cyan' : 'gray'}>
      <Text color="cyanBright" bold>{'❯ '}</Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        focus={focus}
        placeholder={placeholder ?? 'Type a goal or /help'}
      />
    </Box>
  );
}