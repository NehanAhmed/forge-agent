import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../core/task.js';

export interface StatusFooterProps {
  tasks: Task[];
  approvalsCount: number;
  queueLength: number;
  rateLimited: boolean;
  message?: string;
}

export function StatusFooter({ tasks, approvalsCount, queueLength, rateLimited, message }: StatusFooterProps) {
  const running = tasks.filter(t => t.status === 'running').length;
  const waiting = tasks.filter(t => t.status === 'waiting_approval').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const failed = tasks.filter(t => t.status === 'failed').length;

  return (
    <Box marginTop={1}>
      <Text dimColor>
        {running} running · {waiting} waiting · {done} done · {failed} failed
      </Text>
      {approvalsCount > 0 && (
        <Text color="yellowBright"> ⚠ {approvalsCount} approval{approvalsCount !== 1 ? 's' : ''}</Text>
      )}
      {rateLimited && <Text color="redBright"> ⛔ rate limited</Text>}
      {message && <Text dimColor> · {message}</Text>}
    </Box>
  );
}
