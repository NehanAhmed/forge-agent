import type { LogEntry } from '../core/context.js';

export interface WindowResult {
  visible: LogEntry[];
  atBottom: boolean;
  hasNewBelow: boolean;
  total: number;
}

export function windowEntries(
  entries: LogEntry[],
  opts: {
    windowSize?: number;
    scrollOffset?: number; // 0 means at bottom
    followTail?: boolean;
  } = {}
): WindowResult {
  const windowSize = opts.windowSize ?? 2000;
  const total = entries.length;
  const scrollOffset = opts.scrollOffset ?? 0;
  const followTail = opts.followTail ?? true;

  if (total <= windowSize) {
    return {
      visible: entries,
      atBottom: true,
      hasNewBelow: false,
      total,
    };
  }

  if (followTail || scrollOffset === 0) {
    return {
      visible: entries.slice(total - windowSize),
      atBottom: true,
      hasNewBelow: false,
      total,
    };
  }

  const end = Math.max(windowSize, total - scrollOffset);
  const start = Math.max(0, end - windowSize);
  const visible = entries.slice(start, end);

  return {
    visible,
    atBottom: false,
    hasNewBelow: end < total,
    total,
  };
}
