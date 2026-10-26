import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../../../core/context.js';
import type { TaskClient } from '../../../../core/task-client.js';

export interface TaskLogs {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
}

function mergeEntries(fetched: LogEntry[], live: LogEntry[], limit: number): LogEntry[] {
  const bySeq = new Map<number, LogEntry>();
  for (const entry of fetched) bySeq.set(entry.seq, entry);
  for (const entry of live) bySeq.set(entry.seq, entry);
  return [...bySeq.values()]
    .sort((a, b) => a.seq - b.seq)
    .slice(-Math.max(1, limit));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Per-task log cache. Only the selected task updates React state, so tasks
 * streaming in the background never re-render the dashboard.
 */
export function useTaskLogs(client: TaskClient, taskId: string | null, limit: number): TaskLogs {
  const cacheRef = useRef<Map<string, LogEntry[]>>(new Map());
  const selectedRef = useRef<string | null>(taskId);
  const limitRef = useRef(limit);
  const mountedRef = useRef(true);
  const clientRef = useRef(client);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  selectedRef.current = taskId;
  limitRef.current = limit;
  clientRef.current = client;

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe = clientRef.current.subscribe(event => {
      if (event.type !== 'task:log' || !mountedRef.current) return;

      const cap = Math.max(1, limitRef.current);
      const cached = cacheRef.current.get(event.taskId) ?? [];
      if (cached.some(entry => entry.seq === event.entry.seq)) return;

      const next = [...cached, event.entry].slice(-cap);
      cacheRef.current.set(event.taskId, next);

      if (event.taskId === selectedRef.current) {
        setEntries(next);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!taskId) {
      setEntries([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cached = cacheRef.current.get(taskId) ?? [];
    setEntries(cached);
    setLoading(cached.length === 0);
    setError(null);

    clientRef.current.getLog(taskId, { limit })
      .then(fetched => {
        if (cancelled || !mountedRef.current) return;
        const live = cacheRef.current.get(taskId) ?? [];
        const merged = mergeEntries(fetched, live, limit);
        cacheRef.current.set(taskId, merged);
        if (selectedRef.current === taskId) {
          setEntries(merged);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        if (selectedRef.current === taskId) {
          setError(errorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [taskId, limit]);

  return { entries, loading, error };
}
