import React from 'react';
import { Box, Text } from 'ink';
import type { Approval } from '../../../core/task-manager.js';

export interface ApprovalsInboxProps {
  approvals: Approval[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  visible: boolean;
  width: number;
}

export function ApprovalsInbox({ approvals, onApprove, onDeny, visible, width }: ApprovalsInboxProps) {
  if (!visible) {
    return (
      <Box paddingX={1}>
        <Text dimColor>⚠ {approvals.length} approval{approvals.length !== 1 ? 's' : ''} pending</Text>
      </Box>
    );
  }

  if (approvals.length === 0) {
    return (
      <Box paddingX={1} borderStyle="round" borderColor="gray">
        <Text dimColor>No pending approvals.</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1} borderStyle="round" borderColor="yellow" flexDirection="column">
      <Text color="yellowBright" bold>⚠ Approvals Inbox ({approvals.length})</Text>
      {approvals.map(a => (
        <Box key={a.id} marginTop={1}>
          <Text color="yellow">
            [{a.id}] {a.tool} — {a.summary}
          </Text>
        </Box>
      ))}
    </Box>
  );
}