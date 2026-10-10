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
  const queued = tasks.filter(t => t.status === 'queued').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const cancelled = tasks.filter(t => t.status === 'cancelled').length;

  return (
    <Box paddingX={1} marginTop={1} borderStyle="round" borderColor="gray">
      <Text dimColor>
        {running} running · {waiting} waiting · {queued} queued · {done} done · {failed} failed · {cancelled} cancelled
      </Text>
      {approvalsCount > 0 && (
        <Text color="yellowBright"> ⚠ {approvalsCount} approval{approvalsCount !== 1 ? 's' : ''} pending</Text>
      )}
      {rateLimited && <Text color="redBright"> ⛔ rate limited</Text>}
      {message && <Text dimColor> · {message}</Text>}
    </Box>
  );
}