import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput, usePaste, useWindowSize } from 'ink';
import type { Approval } from '../../../core/task-manager.js';
import type { Task } from '../../../core/task.js';
import type { TaskClient } from '../../../core/task-client.js';
import { getConfig } from '../../../core/config.js';
import { resolveTaskByIdOrDisplay } from '../../../core/tree.js';
import { computeLayout } from '../../../ui/layout.js';
import { buildLogLines, windowLogLines } from '../../../ui/log-view.js';
import { resolveAction, type DashboardAction, type Focus } from '../../../ui/keymap.js';
import {
  clampScroll,
  clampTop,
  edgeSelection,
  ensureVisible,
  filterRows,
  moveSelection,
  nearestVisible,
  pickInitialSelection,
  rowIndex,
  type TaskFilter,
} from '../../../ui/selection.js';
import { parseCommand } from '../../../ui/parser.js';
import { sanitizeText } from '../../../ui/text.js';
import { createGlyphs, createTheme } from '../../../ui/theme.js';
import { buildTree, getVisibleRows } from '../../../ui/tree-builder.js';
import { HeaderBar } from './HeaderBar.js';
import { InputBar } from './InputBar.js';
import { KeyBar } from './KeyBar.js';
import { TaskDetail } from './TaskDetail.js';
import { TaskList } from './TaskList.js';
import { TooSmall } from './TooSmall.js';
import { ApprovalsOverlay } from './overlays/ApprovalsOverlay.js';
import { DiffOverlay } from './overlays/DiffOverlay.js';
import { HelpOverlay } from './overlays/HelpOverlay.js';
import { useClock } from './hooks/useClock.js';
import { useTaskLogs } from './hooks/useTaskLogs.js';
import { useTaskStore } from './hooks/useTaskStore.js';

export interface DashboardProps {
  client: TaskClient;
}

interface Notice {
  kind: 'info' | 'error';
  text: string;
}

interface ConfirmRequest {
  title: string;
  target: string;
  consequence: string;
  action: () => Promise<void>;
}

type DashboardOverlay =
  | { kind: 'help' }
  | { kind: 'approvals'; index: number; confirmingAll: boolean }
  | { kind: 'confirm'; request: ConfirmRequest; pending: boolean }
  | {
      kind: 'diff';
      taskId: string;
      title: string;
      lines: string[];
      top: number;
      loading: boolean;
      error: string | null;
    };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isActiveTask(task: Task): boolean {
  return task.status === 'running' || task.status === 'waiting_approval' || task.status === 'queued';
}

function isTerminalTask(task: Task): boolean {
  return task.status === 'done' || task.status === 'failed' || task.status === 'cancelled';
}

export function Dashboard({ client }: DashboardProps) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();

  const config = useMemo(() => getConfig(), []);
  const screenReader = process.env.INK_SCREEN_READER === 'true';
  const ascii = config.ui.ascii || screenReader;
  const dot = ascii ? ' | ' : ' · ';
  const theme = useMemo(() => createTheme({ noColor: screenReader || undefined }), [screenReader]);
  const glyphs = useMemo(() => createGlyphs(ascii), [ascii]);
  const layout = useMemo(() => {
    const base = computeLayout(columns, rows);
    if (!screenReader || base.mode === 'tiny') return base;
    return {
      ...base,
      mode: 'narrow' as const,
      singlePane: true,
      listWidth: base.columns,
      listTextWidth: Math.max(1, base.columns - 2),
      detailWidth: base.columns,
      detailTextWidth: Math.max(1, base.columns - 2),
      listRows: base.mainHeight,
      detailRows: Math.max(1, base.mainHeight - 3),
    };
  }, [columns, rows, screenReader]);

  const { tasks, approvals, loaded, error: storeError } = useTaskStore(client);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [focus, setFocus] = useState<Focus>('input');
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [overlay, setOverlay] = useState<DashboardOverlay | null>(null);
  const [listTop, setListTop] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [follow, setFollow] = useState(true);
  const [verbose, setVerbose] = useState(!config.ui.compactLog);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [resolving, setResolving] = useState<Set<string>>(() => new Set());

  const treeRows = useMemo(() => getVisibleRows(buildTree(tasks), collapsed), [tasks, collapsed]);
  const filteredRows = useMemo(() => filterRows(treeRows, filter), [treeRows, filter]);
  const selectedTask = useMemo(() => tasks.find(task => task.id === selectedId) ?? null, [tasks, selectedId]);
  const selectedIndex = useMemo(() => rowIndex(filteredRows, selectedId), [filteredRows, selectedId]);
  const { entries, loading: logLoading, error: logError } = useTaskLogs(client, selectedId, config.ui.logWindow);
  const hasActiveTasks = tasks.some(isActiveTask);
  const now = useClock(hasActiveTasks && !screenReader);

  const logLines = useMemo(
    () =>
      buildLogLines(entries, {
        width: layout.detailTextWidth,
        timestamps: config.ui.timestamps,
        verbose,
        ascii,
      }),
    [entries, layout.detailTextWidth, config.ui.timestamps, verbose, ascii],
  );
  const logWindow = useMemo(
    () => windowLogLines(logLines, layout.detailRows, follow ? 0 : scrollOffset),
    [logLines, layout.detailRows, follow, scrollOffset],
  );

  function notify(kind: Notice['kind'], text: string) {
    setNotice({ kind, text });
  }

  // Keep a valid, visible selection whenever tasks, filters or folds change.
  useEffect(() => {
    if (!loaded) return;
    setSelectedId(current => {
      if (current && rowIndex(filteredRows, current) !== -1) return current;
      const fallback = pickInitialSelection(
        filteredRows,
        tasks.map(task => task.id),
      );
      return current ? (nearestVisible(filteredRows, tasks, current) ?? fallback) : fallback;
    });
  }, [loaded, tasks, filteredRows]);

  useEffect(() => {
    if (selectedIndex < 0) {
      setListTop(0);
      return;
    }
    setListTop(current =>
      ensureVisible(selectedIndex, clampTop(current, filteredRows.length, layout.listRows), layout.listRows),
    );
  }, [selectedIndex, filteredRows.length, layout.listRows]);

  useEffect(() => {
    setScrollOffset(0);
    setFollow(true);
  }, [selectedId]);

  useEffect(() => {
    if (follow) {
      setScrollOffset(offset => (offset === 0 ? offset : 0));
      return;
    }
    setScrollOffset(offset => Math.min(offset, logWindow.maxOffset));
  }, [follow, logWindow.maxOffset]);

  useEffect(() => {
    if (!notice || notice.kind !== 'info') return;
    const timer = setTimeout(() => {
      setNotice(current => (current === notice ? null : current));
    }, 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (storeError) setNotice({ kind: 'error', text: storeError });
  }, [storeError]);

  useEffect(() => {
    if (overlay?.kind !== 'approvals') return;
    const max = Math.max(0, approvals.length - 1);
    if (overlay.index > max) {
      setOverlay(current => (current?.kind === 'approvals' ? { ...current, index: max } : current));
    }
  }, [approvals.length, overlay]);

  const diffTaskId = overlay?.kind === 'diff' && overlay.loading ? overlay.taskId : null;
  useEffect(() => {
    if (!diffTaskId) return;
    let cancelled = false;

    client
      .getDiff(diffTaskId)
      .then(diff => {
        if (cancelled) return;
        const lines = diff.diff ? diff.diff.split(/\r?\n/) : [];
        const additions = diff.files.reduce((sum, file) => sum + file.additions, 0);
        const deletions = diff.files.reduce((sum, file) => sum + file.deletions, 0);
        const summary = `${diff.files.length} file${diff.files.length === 1 ? '' : 's'} +${additions} -${deletions}`;
        setOverlay(current => {
          if (current?.kind !== 'diff' || current.taskId !== diffTaskId) return current;
          return { ...current, lines, title: `${current.title}${dot}${summary}`, loading: false };
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setOverlay(current => {
          if (current?.kind !== 'diff' || current.taskId !== diffTaskId) return current;
          return { ...current, loading: false, error: errorText(error) };
        });
      });

    return () => {
      cancelled = true;
    };
  }, [client, diffTaskId, dot]);

  function openConfirm(title: string, target: string, consequence: string, action: () => Promise<void>) {
    setOverlay({ kind: 'confirm', request: { title, target, consequence, action }, pending: false });
  }

  async function runConfirm() {
    if (overlay?.kind !== 'confirm' || overlay.pending) return;
    const request = overlay.request;
    setOverlay(current => (current?.kind === 'confirm' ? { ...current, pending: true } : current));
    try {
      await request.action();
      setOverlay(null);
    } catch (error: unknown) {
      setOverlay(null);
      notify('error', errorText(error));
    }
  }

  function requestQuit() {
    const active = tasks.filter(isActiveTask);
    if (active.length === 0) {
      exit();
      return;
    }
    openConfirm(
      'Quit',
      `${active.length} active task${active.length === 1 ? '' : 's'}`,
      'running tasks will be interrupted and can be resumed later',
      async () => exit(),
    );
  }

  function requestCancel(task: Task) {
    if (isTerminalTask(task)) {
      notify('error', `#${task.displayId} has already finished.`);
      return;
    }
    const row = treeRows.find(item => item.task.id === task.id);
    const descendants = row?.descendantCount ?? 0;
    openConfirm(
      'Cancel',
      `#${task.displayId} ${task.goal}`,
      descendants > 0
        ? `stops this task and ${descendants} descendant${descendants === 1 ? '' : 's'}`
        : 'stops this task',
      async () => {
        await client.cancelTask(task.id);
        notify('info', `Cancelled #${task.displayId}`);
      },
    );
  }

  function requestResume(task: Task) {
    if (task.status !== 'failed' || !task.resumable) {
      notify('error', `#${task.displayId} is not resumable.`);
      return;
    }
    void (async () => {
      try {
        await client.resumeTask(task.id);
        notify('info', `Resumed #${task.displayId}`);
      } catch (error: unknown) {
        notify('error', errorText(error));
      }
    })();
  }

  function requestMerge(task: Task) {
    if (!task.worktree) {
      notify('error', `#${task.displayId} has no worktree to merge.`);
      return;
    }
    if (isActiveTask(task)) {
      notify('error', `#${task.displayId} must finish before it can be merged.`);
      return;
    }
    openConfirm(
      'Merge',
      `#${task.displayId} ${task.goal}`,
      `merges ${task.worktree.branch} into ${task.worktree.baseBranch}`,
      async () => {
        const result = await client.mergeTask(task.id);
        if (!result.success) {
          throw new Error(
            result.conflictedFiles?.length
              ? `Merge conflict in ${result.conflictedFiles.join(', ')}`
              : (result.message ?? 'Merge failed'),
          );
        }
        notify('info', `Merged #${task.displayId}`);
      },
    );
  }

  function requestDiscard(task: Task) {
    if (!task.worktree) {
      notify('error', `#${task.displayId} has no worktree to discard.`);
      return;
    }
    if (isActiveTask(task)) {
      notify('error', `#${task.displayId} must finish or be cancelled before discarding.`);
      return;
    }
    openConfirm(
      'Discard Worktree',
      `#${task.displayId} ${task.goal}`,
      `deletes ${task.worktree.branch} and its worktree (cannot be undone)`,
      async () => {
        await client.discardTask(task.id);
        notify('info', `Discarded worktree for #${task.displayId}`);
      },
    );
  }

  function requestDelete(task: Task) {
    if (isActiveTask(task)) {
      notify('error', `#${task.displayId} is active. Cancel it before deleting.`);
      return;
    }
    const row = treeRows.find(item => item.task.id === task.id);
    const descendants = row?.descendantCount ?? 0;
    openConfirm(
      'Delete Task',
      `#${task.displayId} ${task.goal}`,
      descendants > 0
        ? `permanently deletes this task, its logs, worktree, and ${descendants} child task(s)`
        : 'permanently deletes this task, logs, and worktree',
      async () => {
        await client.deleteTask(task.id, { force: true });
        notify('info', `Deleted #${task.displayId}`);
      },
    );
  }

  function openDiff(task: Task) {
    if (!task.worktree) {
      notify('error', `#${task.displayId} has no worktree diff.`);
      return;
    }
    setOverlay({
      kind: 'diff',
      taskId: task.id,
      title: `#${task.displayId} ${task.goal}`,
      lines: [],
      top: 0,
      loading: true,
      error: null,
    });
  }

  async function decideApproval(approval: Approval, decision: 'approve' | 'deny') {
    if (resolving.has(approval.id)) return;
    setResolving(current => new Set(current).add(approval.id));
    try {
      await client.resolveApproval(approval.id, decision);
      const displayId = tasks.find(task => task.id === approval.taskId)?.displayId ?? approval.taskId;
      notify('info', `${decision === 'approve' ? 'Approved' : 'Denied'} ${approval.tool} for #${displayId}`);
    } catch (error: unknown) {
      notify('error', errorText(error));
    } finally {
      setResolving(current => {
        const next = new Set(current);
        next.delete(approval.id);
        return next;
      });
    }
  }

  async function approveAll() {
    if (busy) return;
    const ids = approvals.map(approval => approval.id);
    if (ids.length === 0) {
      notify('info', 'No pending approvals.');
      return;
    }
    setBusy(true);
    try {
      for (const id of ids) {
        await client.resolveApproval(id, 'approve');
      }
      notify('info', `Approved ${ids.length} pending action${ids.length === 1 ? '' : 's'}`);
      setOverlay(null);
    } catch (error: unknown) {
      notify('error', errorText(error));
    } finally {
      setBusy(false);
    }
  }

  function requestApproveAll() {
    if (busy) return;
    if (approvals.length === 0) {
      notify('info', 'No pending approvals.');
      return;
    }
    setOverlay(prev =>
      prev?.kind === 'approvals'
        ? { ...prev, confirmingAll: true }
        : { kind: 'approvals', index: 0, confirmingAll: true },
    );
  }

  function requireTask(target: string): Task {
    const task = resolveTaskByIdOrDisplay(tasks, target);
    if (!task) throw new Error(`Task ${target} was not found.`);
    return task;
  }

  function selectTask(taskId: string) {
    setSelectedId(taskId);
  }

  function revealTask(task: Task) {
    setCollapsed(current => {
      const next = new Set(current);
      const byId = new Map(tasks.map(item => [item.id, item]));
      let parentId = task.parentId;
      while (parentId) {
        next.delete(parentId);
        parentId = byId.get(parentId)?.parentId;
      }
      return next;
    });
    setFilter('all');
    setSelectedId(task.id);
  }

  function move(delta: number) {
    const next = moveSelection(filteredRows, selectedId, delta);
    if (next) selectTask(next);
  }

  function collapseSelected(expand: boolean) {
    if (!selectedTask) return;
    const row = filteredRows.find(item => item.task.id === selectedTask.id);
    if (!row?.hasChildren) return;
    setCollapsed(current => {
      const next = new Set(current);
      if (expand) next.delete(selectedTask.id);
      else next.add(selectedTask.id);
      return next;
    });
  }

  function scrollLog(delta: number, page = false) {
    if (!selectedTask) return;
    setFollow(false);
    const lineDelta = -delta * (page ? layout.detailRows : 1);
    setScrollOffset(offset => clampScroll((follow ? 0 : offset) + lineDelta, logLines.length, layout.detailRows));
  }

  function scrollLogEdge(edge: 'first' | 'last') {
    if (!selectedTask) return;
    if (edge === 'first') {
      setFollow(false);
      setScrollOffset(Math.max(0, logLines.length - layout.detailRows));
    } else {
      setFollow(true);
      setScrollOffset(0);
    }
  }

  function cycleFilter() {
    setFilter(current => (current === 'all' ? 'active' : current === 'active' ? 'attention' : 'all'));
  }

  function browseHistory(delta: number) {
    if (history.length === 0) return;
    if (historyIndex === -1) {
      if (delta > 0) return;
      const index = history.length - 1;
      setHistoryIndex(index);
      setInput(history[index] ?? '');
      return;
    }
    const next = historyIndex + delta;
    if (next < 0) {
      setHistoryIndex(history.length - 1);
      setInput(history[history.length - 1] ?? '');
    } else if (next >= history.length) {
      setHistoryIndex(-1);
      setInput('');
    } else {
      setHistoryIndex(next);
      setInput(history[next] ?? '');
    }
  }

  async function submit(value: string) {
    const command = value.trim();
    if (!command || busy) return;
    setInput('');
    setBusy(true);
    setHistory(current => {
      if (current[current.length - 1] === command) return current;
      return [...current, command].slice(-50);
    });
    setHistoryIndex(-1);

    const parsed = parseCommand(command);

    try {
      switch (parsed.kind) {
        case 'create': {
          const task = await client.createTask(parsed.goal);
          revealTask(task);
          notify('info', `Queued #${task.displayId}`);
          break;
        }
        case 'new': {
          const task = await client.createTask(parsed.goal, {
            readOnly: parsed.options.readOnly,
            isolation: parsed.options.shared ? 'shared' : undefined,
            policy: parsed.options.policy,
          });
          revealTask(task);
          notify('info', `Queued #${task.displayId}`);
          break;
        }
        case 'open': {
          const task = requireTask(parsed.target);
          revealTask(task);
          setFocus('detail');
          break;
        }
        case 'approve': {
          const task = requireTask(parsed.target);
          const approval = approvals.find(item => item.taskId === task.id);
          if (!approval) throw new Error(`No pending approvals for #${task.displayId}.`);
          await decideApproval(approval, 'approve');
          break;
        }
        case 'deny': {
          const task = requireTask(parsed.target);
          const approval = approvals.find(item => item.taskId === task.id);
          if (!approval) throw new Error(`No pending approvals for #${task.displayId}.`);
          await decideApproval(approval, 'deny');
          break;
        }
        case 'approve_all':
          requestApproveAll();
          break;
        case 'cancel':
          requestCancel(requireTask(parsed.target));
          break;
        case 'resume':
          requestResume(requireTask(parsed.target));
          break;
        case 'diff':
          openDiff(requireTask(parsed.target));
          break;
        case 'merge':
          requestMerge(requireTask(parsed.target));
          break;
        case 'discard':
          requestDiscard(requireTask(parsed.target));
          break;
        case 'delete':
          requestDelete(requireTask(parsed.target));
          break;
        case 'collapse':
        case 'expand': {
          const task = requireTask(parsed.target);
          setCollapsed(current => {
            const next = new Set(current);
            if (parsed.kind === 'expand') next.delete(task.id);
            else next.add(task.id);
            return next;
          });
          break;
        }
        case 'help':
          setOverlay({ kind: 'help' });
          break;
        case 'quit':
          requestQuit();
          break;
        case 'unknown':
          throw new Error(parsed.error);
      }
    } catch (error: unknown) {
      setInput(command);
      notify('error', errorText(error));
    } finally {
      setBusy(false);
    }
  }

  function handleAction(action: DashboardAction) {
    switch (action.type) {
      case 'none':
        break;
      case 'quit':
        requestQuit();
        break;
      case 'help':
        setOverlay({ kind: 'help' });
        break;
      case 'closeOverlay':
        setOverlay(current =>
          current?.kind === 'approvals' && current.confirmingAll ? { ...current, confirmingAll: false } : null,
        );
        break;
      case 'cycleFocus':
        setFocus(current => (current === 'input' ? 'list' : current === 'list' ? 'input' : 'list'));
        break;
      case 'blur':
        if (focus === 'input' || focus === 'detail') {
          setFocus('list');
        } else {
          setFilter('all');
          setNotice(null);
        }
        break;
      case 'moveSelection':
        move(action.delta);
        break;
      case 'edgeSelection': {
        const next = edgeSelection(filteredRows, action.edge);
        if (next) selectTask(next);
        break;
      }
      case 'openDetail':
        if (selectedTask) setFocus('detail');
        else notify('error', 'Select a task first.');
        break;
      case 'fold':
        collapseSelected(action.expand);
        break;
      case 'openApprovals':
        if (approvals.length === 0) notify('info', 'No pending approvals.');
        else setOverlay({ kind: 'approvals', index: 0, confirmingAll: false });
        break;
      case 'cancelTask':
        if (selectedTask) requestCancel(selectedTask);
        else notify('error', 'Select a task first.');
        break;
      case 'resumeTask':
        if (selectedTask) requestResume(selectedTask);
        else notify('error', 'Select a task first.');
        break;
      case 'mergeTask':
        if (selectedTask) requestMerge(selectedTask);
        else notify('error', 'Select a task first.');
        break;
      case 'discardTask':
        if (selectedTask) requestDiscard(selectedTask);
        else notify('error', 'Select a task first.');
        break;
      case 'deleteTask':
        if (selectedTask) requestDelete(selectedTask);
        else notify('error', 'Select a task first.');
        break;
      case 'diffTask':
        if (selectedTask) openDiff(selectedTask);
        else notify('error', 'Select a task first.');
        break;
      case 'cycleFilter':
        cycleFilter();
        break;
      case 'focusInput':
        setFocus('input');
        if (action.seed) setInput(current => current + action.seed);
        break;
      case 'scroll':
        scrollLog(action.delta, action.page);
        break;
      case 'scrollEdge':
        scrollLogEdge(action.edge);
        break;
      case 'toggleFollow':
        setFollow(current => {
          if (!current) setScrollOffset(0);
          return !current;
        });
        break;
      case 'toggleVerbose':
        setVerbose(current => !current);
        setFollow(true);
        setScrollOffset(0);
        break;
      case 'history':
        browseHistory(action.delta);
        break;
      case 'clearInput':
        setInput('');
        break;
      case 'overlayMove':
        setOverlay(current => {
          if (current?.kind !== 'approvals') return current;
          const index = Math.min(Math.max(0, approvals.length - 1), Math.max(0, current.index + action.delta));
          return { ...current, index };
        });
        break;
      case 'overlayApprove':
        if (!busy && overlay?.kind === 'approvals') {
          const approval = approvals[overlay.index];
          if (approval) void decideApproval(approval, 'approve');
        }
        break;
      case 'overlayDeny':
        if (!busy && overlay?.kind === 'approvals') {
          const approval = approvals[overlay.index];
          if (approval) void decideApproval(approval, 'deny');
        }
        break;
      case 'overlayApproveAll':
        requestApproveAll();
        break;
      case 'overlayApproveAllConfirm':
        void approveAll();
        break;
      case 'overlayCancelApproveAll':
        if (busy) break;
        setOverlay(current => (current?.kind === 'approvals' ? { ...current, confirmingAll: false } : current));
        break;
      case 'overlayConfirmYes':
        void runConfirm();
        break;
      case 'overlayConfirmNo':
        setOverlay(current => (current?.kind === 'confirm' && current.pending ? current : null));
        break;
      case 'overlayScroll':
        setOverlay(current => {
          if (current?.kind !== 'diff') return current;
          const viewport = Math.max(1, layout.mainHeight - 2);
          const maxTop = Math.max(0, current.lines.length - viewport);
          const step = action.page ? viewport : 1;
          const top = Math.min(maxTop, Math.max(0, current.top + action.delta * step));
          return { ...current, top };
        });
        break;
      case 'overlayEdge':
        setOverlay(current => {
          if (current?.kind === 'approvals') {
            const index = action.edge === 'first' ? 0 : Math.max(0, approvals.length - 1);
            return { ...current, index };
          }
          if (current?.kind !== 'diff') return current;
          const viewport = Math.max(1, layout.mainHeight - 2);
          const maxTop = Math.max(0, current.lines.length - viewport);
          return { ...current, top: action.edge === 'first' ? 0 : maxTop };
        });
        break;
    }
  }

  useInput((inputChar, key) => {
    if (layout.mode === 'tiny' && !overlay) {
      if ((key.ctrl && inputChar.toLowerCase() === 'c') || inputChar === 'q') {
        requestQuit();
        return;
      }
      if (inputChar === '?') {
        setOverlay({ kind: 'help' });
        return;
      }
    }

    const action = resolveAction(inputChar, key, {
      focus,
      overlay: overlay?.kind ?? null,
      confirmingAll: overlay?.kind === 'approvals' && overlay.confirmingAll,
    });
    handleAction(action);
  });

  usePaste(text => {
    if (overlay || layout.mode === 'tiny') return;
    const cleaned = sanitizeText(text)
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\t/g, '  ')
      .slice(0, 4000);
    setFocus('input');
    setInput(current => (current + cleaned).slice(0, 4000));
  });

  const confirm =
    overlay?.kind === 'confirm'
      ? {
          title: overlay.request.title,
          target: overlay.request.target,
          consequence: overlay.request.consequence,
          pending: overlay.pending,
        }
      : null;

  if (layout.mode === 'tiny') {
    const tinyHelp = overlay?.kind === 'help';
    return (
      <Box flexDirection="column" width={columns} height={rows}>
        <TooSmall columns={columns} rows={rows} theme={theme} help={tinyHelp} ascii={ascii} />
        <KeyBar
          hints={tinyHelp ? 'esc close' : `q quit${dot}? help`}
          notice={notice ? { kind: notice.kind, text: notice.text } : null}
          confirm={confirm}
          width={columns}
          theme={theme}
          glyphs={glyphs}
        />
      </Box>
    );
  }

  const showList = !layout.singlePane || focus !== 'detail';
  const showDetail = !layout.singlePane || focus === 'detail';
  const nav = ascii ? 'up/down' : '↑↓';
  const lr = ascii ? 'left/right' : '←→';
  const overlayHints =
    overlay?.kind === 'approvals'
      ? `${nav} select${dot}enter approve${dot}n deny${dot}A approve all${dot}esc close`
      : overlay?.kind === 'diff'
        ? `${nav} scroll${dot}pgup/pgdn page${dot}g/G top/bottom${dot}esc close`
        : overlay?.kind === 'help'
          ? 'esc close'
          : '';
  const hints = overlay
    ? overlayHints
    : focus === 'input'
      ? `enter run${dot}/ commands${dot}tab list${dot}esc list`
      : focus === 'list'
        ? `${nav} select${dot}${lr} fold${dot}enter open${dot}d del${dot}x discard${dot}m merge${dot}c cancel${dot}a approvals${dot}? help`
        : `${nav} scroll${dot}f follow${dot}v verbose${dot}esc back`;

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      <HeaderBar
        tasks={tasks}
        approvalsCount={approvals.length}
        filter={filter}
        theme={theme}
        glyphs={glyphs}
        ascii={ascii}
        columns={columns}
      />

      <Box flexDirection="row" width={columns} height={layout.mainHeight} overflow="hidden">
        {overlay?.kind === 'help' ? (
          <HelpOverlay width={columns} height={layout.mainHeight} theme={theme} ascii={ascii} />
        ) : overlay?.kind === 'approvals' ? (
          <ApprovalsOverlay
            approvals={approvals}
            tasks={tasks}
            index={overlay.index}
            width={columns}
            height={layout.mainHeight}
            theme={theme}
            glyphs={glyphs}
            confirmingAll={overlay.confirmingAll}
            pending={busy}
          />
        ) : overlay?.kind === 'diff' ? (
          <DiffOverlay
            title={overlay.title}
            lines={overlay.lines}
            top={overlay.top}
            width={columns}
            height={layout.mainHeight}
            theme={theme}
            loading={overlay.loading}
            error={overlay.error}
          />
        ) : (
          <>
            {showList && (
              <Box width={layout.listWidth} flexDirection="column" paddingX={1} overflow="hidden">
                <TaskList
                  rows={filteredRows}
                  selectedId={selectedId}
                  top={listTop}
                  height={layout.listRows}
                  width={layout.listTextWidth}
                  filter={filter}
                  loading={!loaded}
                  theme={theme}
                  glyphs={glyphs}
                  ascii={ascii}
                  showCost={config.ui.showCost}
                  now={now}
                />
              </Box>
            )}

            {showDetail && (
              <Box
                width={showList ? layout.detailWidth : columns}
                flexDirection="column"
                paddingX={1}
                borderStyle={layout.singlePane ? undefined : 'single'}
                borderTop={false}
                borderBottom={false}
                borderRight={false}
                borderLeft={!layout.singlePane}
                borderColor={theme.separator}
                overflow="hidden"
              >
                {selectedTask ? (
                  <TaskDetail
                    task={selectedTask}
                    lines={logWindow.lines}
                    hasNewBelow={logWindow.hasNewBelow}
                    follow={follow}
                    loading={logLoading}
                    error={logError}
                    width={layout.detailTextWidth}
                    height={layout.mainHeight}
                    theme={theme}
                    glyphs={glyphs}
                    ascii={ascii}
                    now={now}
                  />
                ) : (
                  <Text dimColor>Select a task to see its log.</Text>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      {layout.inputHeight > 0 && (
        <InputBar
          value={input}
          onChange={value => setInput(value.slice(0, 4000))}
          onSubmit={value => void submit(value)}
          focus={focus === 'input' && !overlay && !busy}
          theme={theme}
          glyphs={glyphs}
        />
      )}

      <KeyBar
        hints={hints}
        notice={notice ? { kind: notice.kind, text: notice.text } : null}
        confirm={confirm}
        width={columns}
        theme={theme}
        glyphs={glyphs}
      />
    </Box>
  );
}
