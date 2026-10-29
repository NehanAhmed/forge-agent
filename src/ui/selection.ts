import type { Task } from '../core/task.js';

export interface SelectableRow {
  task: Pick<Task, 'id' | 'status' | 'reviewState'>;
}

export type TaskFilter = 'all' | 'active' | 'attention';

export function filterRows<T extends SelectableRow>(rows: T[], filter: TaskFilter): T[] {
  if (filter === 'all') return rows;
  if (filter === 'active') {
    return rows.filter(
      row => row.task.status === 'queued' || row.task.status === 'running' || row.task.status === 'waiting_approval',
    );
  }
  return rows.filter(
    row =>
      row.task.status === 'waiting_approval' ||
      row.task.status === 'failed' ||
      row.task.reviewState === 'pending_review' ||
      row.task.reviewState === 'conflict' ||
      row.task.reviewState === 'needs_attention',
  );
}

export function rowIndex(rows: SelectableRow[], id: string | null): number {
  if (!id) return -1;
  return rows.findIndex(row => row.task.id === id);
}

/** Move selection by `delta`, clamped to the available rows. */
export function moveSelection<T extends SelectableRow>(
  rows: T[],
  currentId: string | null,
  delta: number,
): string | null {
  if (rows.length === 0) return null;
  const current = rowIndex(rows, currentId);
  if (current === -1) {
    return delta < 0 ? rows[rows.length - 1]!.task.id : rows[0]!.task.id;
  }
  const next = Math.min(rows.length - 1, Math.max(0, current + delta));
  return rows[next]!.task.id;
}

export function edgeSelection<T extends SelectableRow>(rows: T[], edge: 'first' | 'last'): string | null {
  if (rows.length === 0) return null;
  return edge === 'first' ? rows[0]!.task.id : rows[rows.length - 1]!.task.id;
}

/**
 * Pick the newest task that is currently visible. `newestFirstIds` must be
 * ordered newest-first (as returned by the task store).
 */
export function pickInitialSelection<T extends SelectableRow>(rows: T[], newestFirstIds: string[]): string | null {
  if (rows.length === 0) return null;
  const visible = new Set(rows.map(row => row.task.id));
  for (const id of newestFirstIds) {
    if (visible.has(id)) return id;
  }
  return rows[0]!.task.id;
}

/** Scroll `top` so `index` stays inside a viewport of `height` rows. */
export function ensureVisible(index: number, top: number, height: number): number {
  const viewport = Math.max(1, height);
  if (index < 0) return 0;
  if (index < top) return index;
  if (index >= top + viewport) return index - viewport + 1;
  return Math.max(0, top);
}

export function clampTop(top: number, total: number, height: number): number {
  const maxTop = Math.max(0, total - Math.max(1, height));
  return Math.min(maxTop, Math.max(0, top));
}

/** Clamp a "lines from the bottom" scroll offset. */
export function clampScroll(offset: number, total: number, height: number): number {
  const maxOffset = Math.max(0, total - Math.max(1, height));
  return Math.min(maxOffset, Math.max(0, offset));
}

/**
 * When a selected row disappears because an ancestor collapsed, fall back to
 * the nearest visible ancestor. Returns `selectedId` when it is still visible.
 */
export function nearestVisible(rows: SelectableRow[], tasks: Task[], selectedId: string | null): string | null {
  if (!selectedId) return rows[0]?.task.id ?? null;
  if (rowIndex(rows, selectedId) !== -1) return selectedId;

  const byId = new Map(tasks.map(task => [task.id, task]));
  let current = byId.get(selectedId);
  while (current?.parentId) {
    const parentId = current.parentId;
    if (rowIndex(rows, parentId) !== -1) return parentId;
    current = byId.get(parentId);
  }

  return rows[0]?.task.id ?? null;
}
