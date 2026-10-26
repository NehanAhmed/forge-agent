import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../../../../core/task.js';
import type { Approval } from '../../../../core/task-manager.js';
import type { TaskClient } from '../../../../core/task-client.js';

export interface TaskStore {
  tasks: Task[];
  approvals: Approval[];
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
}

function upsertTask(tasks: Task[], task: Task): Task[] {
  const index = tasks.findIndex(item => item.id === task.id);
  if (index === -1) {
    return sortTasks([...tasks, task]);
  }
  const next = [...tasks];
  next[index] = { ...next[index], ...task };
  return next;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Event-driven task/approval state. Updates a single task per event instead of
 * re-fetching the whole list, and keeps the newest-first ordering stable.
 */
export function useTaskStore(client: TaskClient): TaskStore {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    Promise.all([client.listTasks(), client.listApprovals()])
      .then(([nextTasks, nextApprovals]) => {
        if (cancelled || !mountedRef.current) return;
        setTasks(current => {
          // Preserve tasks that arrived through events while the snapshot loaded.
          let merged = sortTasks(nextTasks);
          for (const task of current) {
            merged = upsertTask(merged, task);
          }
          return merged;
        });
        setApprovals(nextApprovals);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        setError(errorMessage(err));
        setLoaded(true);
      });

    const unsubscribe = client.subscribe(event => {
      if (!mountedRef.current) return;

      switch (event.type) {
        case 'task:created':
        case 'task:status':
          setTasks(current => upsertTask(current, event.task));
          break;
        case 'task:usage':
          setTasks(current => current.map(task =>
            task.id === event.taskId ? { ...task, usage: event.usage } : task
          ));
          break;
        case 'task:review':
          setTasks(current => current.map(task =>
            task.id === event.taskId ? { ...task, reviewState: event.reviewState } : task
          ));
          break;
        case 'approval:requested':
          setApprovals(current =>
            current.some(approval => approval.id === event.approval.id)
              ? current
              : [...current, event.approval].sort((a, b) => a.createdAt - b.createdAt)
          );
          break;
        case 'approval:resolved':
          setApprovals(current => current.filter(approval => approval.id !== event.approvalId));
          break;
        case 'task:log':
          break;
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      unsubscribe();
    };
  }, [client]);

  const refresh = useCallback(async () => {
    try {
      const [nextTasks, nextApprovals] = await Promise.all([
        client.listTasks(),
        client.listApprovals(),
      ]);
      if (!mountedRef.current) return;
      setTasks(sortTasks(nextTasks));
      setApprovals(nextApprovals);
      setError(null);
    } catch (err: unknown) {
      if (mountedRef.current) setError(errorMessage(err));
    }
  }, [client]);

  return { tasks, approvals, loaded, error, refresh };
}
