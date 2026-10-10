import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { TaskClient } from '../../../core/task-client.js';
import type { Task } from '../../../core/task.js';
import type { LogEntry } from '../../../core/context.js';
import type { Approval } from '../../../core/task-manager.js';
import { TaskTree } from './TaskTree.js';
import { TaskDetail } from './TaskDetail.js';
import { ApprovalsInbox } from './ApprovalsInbox.js';
import { StatusFooter } from './StatusFooter.js';
import { DashboardInput } from './DashboardInput.js';
import { parseCommand } from '../../../ui/parser.js';
import { windowEntries } from '../../../ui/log-window.js';
import { getConfig } from '../../../core/config.js';
import { resolveTaskByIdOrDisplay } from '../../../core/tree.js';

export interface DashboardProps {
  client: TaskClient;
}

export function Dashboard({ client }: DashboardProps) {
  const { exit } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [focus, setFocus] = useState<'list' | 'input' | 'approvals'>('input');
  const [logEntries, setLogEntries] = useState<Map<string, LogEntry[]>>(new Map());
  const [scrollOffsets, setScrollOffsets] = useState<Map<string, number>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ type: string; action: () => void } | null>(null);

  const config = useMemo(() => getConfig(), []);
  const scrollLimit = config.ui.logWindow;

  useEffect(() => {
    client.listTasks().then(setTasks);
    client.listApprovals().then(setApprovals);

    const unsubscribe = client.subscribe((event: any) => {
      if (event.type === 'task:created' || event.type === 'task:status' || event.type === 'task:review') {
        client.listTasks().then(setTasks);
      }
      if (event.type === 'approval:requested' || event.type === 'approval:resolved') {
        client.listApprovals().then(setApprovals);
      }
      if (event.type === 'task:log') {
        setLogEntries(prev => {
          const updated = new Map(prev);
          const entries = updated.get(event.taskId) ?? [];
          updated.set(event.taskId, [...entries, event.entry].slice(-scrollLimit));
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, [client]);

  useEffect(() => {
    if (selectedId && !logEntries.has(selectedId)) {
      client.getLog(selectedId, { limit: scrollLimit }).then(entries => {
        setLogEntries(prev => {
          const updated = new Map(prev);
          updated.set(selectedId, entries);
          return updated;
        });
      });
    }
  }, [selectedId, client]);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedId), [tasks, selectedId]);
  const currentLogs = useMemo(() => (selectedId ? logEntries.get(selectedId) ?? [] : []), [logEntries, selectedId]);
  const scrollOffset = scrollOffsets.get(selectedId ?? '') ?? 0;

  const { visible: visibleLogs, atBottom, hasNewBelow } = useMemo(() =>
    windowEntries(currentLogs, { windowSize: 30, scrollOffset, followTail: scrollOffset === 0 }),
    [currentLogs, scrollOffset]
  );

  // Fixed: useInput receives (input, key) where input is string and key is Key object
  useInput((inputChar, key) => {
    if (confirming) {
      if (key.return) { confirming.action(); setConfirming(null); return; }
      if (key.escape) { setConfirming(null); return; }
      if (inputChar.toLowerCase() === 'n') { setConfirming(null); return; }
      if (inputChar.toLowerCase() === 'y') { confirming.action(); setConfirming(null); return; }
      return;
    }

    if (key.tab) {
      setFocus(prev => prev === 'input' ? 'list' : prev === 'list' ? 'approvals' : 'input');
      return;
    }

    if (focus === 'list') {
      if (key.upArrow) {
        const idx = tasks.findIndex(t => t.id === selectedId);
        if (idx > 0) setSelectedId(tasks[idx - 1]!.id);
        return;
      }
      if (key.downArrow) {
        const idx = tasks.findIndex(t => t.id === selectedId);
        if (idx < tasks.length - 1) setSelectedId(tasks[idx + 1]!.id);
        return;
      }
      if (key.pageUp) {
        setScrollOffsets(prev => {
          const updated = new Map(prev);
          updated.set(selectedId!, scrollOffset + 10);
          return updated;
        });
        return;
      }
      if (key.pageDown) {
        setScrollOffsets(prev => {
          const updated = new Map(prev);
          updated.set(selectedId!, Math.max(0, scrollOffset - 10));
          return updated;
        });
        return;
      }
    }

    if (inputChar === 'a' && focus !== 'input') {
      setFocus(prev => prev === 'approvals' ? 'list' : 'approvals');
      return;
    }
  });

  const handleCommand = async (cmd: string) => {
    const parsed = parseCommand(cmd);
    setInput('');

    switch (parsed.kind) {
      case 'create':
        await client.createTask(parsed.goal);
        break;
      case 'new':
        await client.createTask(parsed.goal, parsed.options);
        break;
      case 'open':
        const task = resolveTaskByIdOrDisplay(tasks, parsed.target);
        if (task) setSelectedId(task.id);
        else setMessage(`Task ${parsed.target} not found`);
        break;
      case 'approve':
        if (parsed.target === 'all') {
          for (const app of approvals) {
            await client.resolveApproval(app.id, 'approve');
          }
        } else {
          const app = approvals.find(a => {
            const t = tasks.find(tk => tk.id === a.taskId);
            return t?.displayId === parsed.target;
          });
          if (app) await client.resolveApproval(app.id, 'approve');
          else setMessage(`No pending approval for task ${parsed.target}`);
        }
        break;
      case 'deny':
        const appDeny = approvals.find(a => {
          const t = tasks.find(tk => tk.id === a.taskId);
          return t?.displayId === parsed.target;
        });
        if (appDeny) await client.resolveApproval(appDeny.id, 'deny');
        break;
      case 'cancel':
        const tCancel = resolveTaskByIdOrDisplay(tasks, parsed.target);
        if (tCancel) await client.cancelTask(tCancel.id);
        break;
      case 'merge':
        const tMerge = resolveTaskByIdOrDisplay(tasks, parsed.target);
        if (tMerge) setConfirming({ type: 'merge', action: () => client.mergeTask(tMerge.id) });
        break;
      case 'discard':
        const tDiscard = resolveTaskByIdOrDisplay(tasks, parsed.target);
        if (tDiscard) setConfirming({ type: 'discard', action: () => client.discardTask(tDiscard.id) });
        break;
      case 'resume':
        const tResume = resolveTaskByIdOrDisplay(tasks, parsed.target);
        if (tResume) await client.resumeTask(tResume.id);
        break;
      case 'help':
        setMessage('Commands: /open n, /cancel n, /approve n|all, /deny n, /merge n, /discard n, /resume n, /quit');
        break;
      case 'quit':
        if (tasks.some(t => t.status === 'running')) {
          setConfirming({ type: 'quit', action: () => exit() });
        } else {
          exit();
        }
        break;
      case 'unknown':
        setMessage(parsed.error);
        break;
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} width="100%">
      {/* Main content: task list + detail */}
      <Box flexGrow={1}>
        {/* Left: Task Tree */}
        <Box flexDirection="column" marginRight={1}>
          <Text bold dimColor>Tasks</Text>
          <TaskTree
            tasks={tasks}
            selectedId={selectedId}
            collapsed={collapsed}
            width={40}
            onSelect={setSelectedId}
            onToggle={(id) => setCollapsed(prev => {
              const updated = new Set(prev);
              if (updated.has(id)) updated.delete(id);
              else updated.add(id);
              return updated;
            })}
            useAscii={false}
          />
        </Box>

        {/* Right: Task Detail */}
        <Box flexGrow={1}>
          {selectedTask ? (
            <TaskDetail
              task={selectedTask}
              entries={visibleLogs}
              atBottom={atBottom}
              hasNewBelow={hasNewBelow}
              onScrollUp={() => {}}
              onScrollDown={() => {}}
              width={80}
              height={30}
              useAscii={false}
              onApprove={() => {}}
              onDeny={() => {}}
            />
          ) : (
            <Box paddingY={2}>
              <Text dimColor>Select a task to see details</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Confirmation */}
      {confirming && (
        <Box marginTop={1}>
          <Text color="yellowBright">Confirm {confirming.type}? (y/n)</Text>
        </Box>
      )}

      {/* Footer */}
      <StatusFooter
        tasks={tasks}
        approvalsCount={approvals.length}
        queueLength={0}
        rateLimited={false}
        message={message ?? undefined}
      />

      {/* Input */}
      <DashboardInput
        value={input}
        onChange={setInput}
        onSubmit={handleCommand}
        focus={focus === 'input'}
      />
    </Box>
  );
}
