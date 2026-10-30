import type { TaskStatus } from '../core/task.js';

/** Compact elapsed/duration label: 3s, 1m 04s, 2h 05m. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Elapsed time for a task, frozen at finish time for terminal statuses. */
export function taskElapsed(
  task: { startedAt?: number; finishedAt?: number; status: TaskStatus },
  now: number,
): number | null {
  if (!task.startedAt) return null;
  const terminal = task.status === 'done' || task.status === 'failed' || task.status === 'cancelled';
  const end = terminal && task.finishedAt ? task.finishedAt : now;
  return Math.max(0, end - task.startedAt);
}

export function formatCost(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return '';
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'running':
      return 'running';
    case 'waiting_approval':
      return 'waiting';
    case 'done':
      return 'done';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
  }
}

export function timeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/** Join non-empty summary counters with a middle dot. */
export function joinMeta(parts: Array<string | undefined | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
