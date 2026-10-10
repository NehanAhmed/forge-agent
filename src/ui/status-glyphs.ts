import type { Task, TaskStatus } from '../core/task.js';

export function getStatusGlyph(status: TaskStatus, useAscii = false): string {
  if (useAscii) {
    switch (status) {
      case 'queued': return '...';
      case 'running': return '>';
      case 'waiting_approval': return '!';
      case 'done': return 'v';
      case 'failed': return 'x';
      case 'cancelled': return '-';
    }
  }
  switch (status) {
    case 'queued': return '…';
    case 'running': return '▶';
    case 'waiting_approval': return '⚠';
    case 'done': return '✓';
    case 'failed': return '✗';
    case 'cancelled': return '⊘';
  }
}

export function needsAttention(task: Task): boolean {
  return (
    task.status === 'waiting_approval' ||
    task.status === 'failed' ||
    task.reviewState === 'pending_review' ||
    task.reviewState === 'conflict' ||
    task.reviewState === 'needs_attention'
  );
}
