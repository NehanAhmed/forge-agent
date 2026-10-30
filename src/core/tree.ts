import type { Task } from './task.js';

export function assignDisplayId(existingTasks: Task[], parentId?: string): string {
  const tree = existingTasks;
  if (!parentId) {
    const roots = tree.filter(t => !t.parentId);
    return (roots.length + 1).toString();
  }
  const parent = tree.find(t => t.id === parentId);
  const children = tree.filter(t => t.parentId === parentId);
  return `${parent?.displayId ?? '0'}.${children.length + 1}`;
}

export function descendantsOf(tasks: Task[], rootId: string): Task[] {
  const result: Task[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const pId = queue.shift()!;
    const children = tasks.filter(t => t.parentId === pId);
    for (const child of children) {
      result.push(child);
      queue.push(child.id);
    }
  }
  return result;
}

export function childrenOf(tasks: Task[], parentId: string): Task[] {
  return tasks.filter(t => t.parentId === parentId);
}

export function treeSize(tasks: Task[], rootId: string): number {
  return 1 + descendantsOf(tasks, rootId).length;
}

export function enforceSpawnLimits(
  tasks: Task[],
  parent: Task | undefined,
  limits: { maxDepth: number; maxChildrenPerTask: number; maxTasksPerTree: number },
  depthOfChild: number,
): { ok: boolean; error?: string } {
  if (depthOfChild > limits.maxDepth) {
    return { ok: false, error: `Cannot spawn: max depth ${limits.maxDepth} reached` };
  }

  if (parent) {
    if (childrenOf(tasks, parent.id).length >= limits.maxChildrenPerTask) {
      return {
        ok: false,
        error: `Cannot spawn: this task already has ${limits.maxChildrenPerTask} children (limit ${limits.maxChildrenPerTask})`,
      };
    }
    if (treeSize(tasks, parent.treeId) >= limits.maxTasksPerTree) {
      return { ok: false, error: `Cannot spawn: tree limit of ${limits.maxTasksPerTree} tasks reached` };
    }
  }

  return { ok: true };
}

export function stricterPolicy(a: string, b: string): string {
  const ranks: Record<string, number> = { read_only: 3, ask: 2, auto_in_worktree: 1 };
  const ra = ranks[a] ?? 0;
  const rb = ranks[b] ?? 0;
  return ra > rb ? a : b;
}

export function parseTaskRef(input: string): string | null {
  const clean = input.replace(/^#/, '');
  if (/^\d+(\.\d+)*$/.test(clean)) return clean;
  return null;
}

export function resolveTaskByIdOrDisplay(tasks: Task[], ref: string): Task | undefined {
  const clean = ref.replace(/^#/, '');
  const byDisplayId = tasks.find(t => t.displayId === clean);
  if (byDisplayId) return byDisplayId;

  const byId = tasks.find(t => t.id === clean);
  if (byId) return byId;

  if (!clean) return undefined;
  const prefixMatches = tasks.filter(t => t.id.startsWith(clean));
  return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
}
