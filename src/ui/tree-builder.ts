import type { Task } from '../core/task.js';
import { descendantsOf } from '../core/tree.js';

export interface TreeNode {
  task: Task;
  children: TreeNode[];
  descendantCount: number;
  totalCost: number;
}

export function buildTree(tasks: Task[]): TreeNode[] {
  const taskMap = new Map<string, TreeNode>();
  for (const t of tasks) {
    taskMap.set(t.id, {
      task: t,
      children: [],
      descendantCount: 0,
      totalCost: t.usage?.cost ?? 0,
    });
  }

  const roots: TreeNode[] = [];
  for (const t of tasks) {
    const node = taskMap.get(t.id)!;
    if (t.parentId && taskMap.has(t.parentId)) {
      taskMap.get(t.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function computeAggregates(node: TreeNode): void {
    for (const child of node.children) {
      computeAggregates(child);
      node.descendantCount += 1 + child.descendantCount;
      node.totalCost += child.totalCost;
    }
  }

  for (const root of roots) {
    computeAggregates(root);
  }

  return roots.sort((a, b) => a.task.createdAt - b.task.createdAt);
}

export interface VisibleRow {
  task: Task;
  depth: number;
  isCollapsed: boolean;
  hasChildren: boolean;
  descendantCount: number;
  totalCost: number;
}

export function getVisibleRows(roots: TreeNode[], collapsedSet: Set<string>): VisibleRow[] {
  const rows: VisibleRow[] = [];

  function traverse(node: TreeNode, depth: number) {
    const isCollapsed = collapsedSet.has(node.task.id);
    rows.push({
      task: node.task,
      depth,
      isCollapsed,
      hasChildren: node.children.length > 0,
      descendantCount: node.descendantCount,
      totalCost: node.totalCost,
    });

    if (!isCollapsed) {
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
  }

  for (const root of roots) {
    traverse(root, 0);
  }

  return rows;
}
