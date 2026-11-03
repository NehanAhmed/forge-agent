import fs from 'fs';
import path from 'path';
import type { Task } from './task.js';
import type { LogEntry } from './context.js';
import { getProjectPaths } from './paths.js';

export interface TaskIndex {
  version: number;
  tasks: Task[];
}

const TASK_INDEX_VERSION = 2;

// Task data is scoped to the directory Forge was opened in. Explicit `tasksDir`
// arguments stay supported for tests and embedders.
function getDefaultTasksDir(): string {
  return getProjectPaths().tasksDir;
}

function ensureTasksDir(dir = getDefaultTasksDir()): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getTaskIndexPath(dir = getDefaultTasksDir()): string {
  return path.join(dir, 'tasks.json');
}

function getTaskLogPath(taskId: string, dir = getDefaultTasksDir()): string {
  return path.join(dir, `${taskId}.log.jsonl`);
}

function getTaskDir(taskId: string, dir = getDefaultTasksDir()): string {
  return path.join(dir, taskId);
}

// Atomic write: write to temp file, then rename
function atomicWrite(filePath: string, content: string): void {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file if rename failed
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw err;
  }
}

function backupTaskIndex(indexPath: string, reason: string): void {
  const backupPath = `${indexPath}.bak.${Date.now()}`;
  try {
    fs.copyFileSync(indexPath, backupPath);
    console.warn(`[persistence] Backed up task index to ${backupPath}: ${reason}`);
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.warn(`[persistence] Could not back up task index (${reason}): ${detail}`);
  }
}

export function loadTaskIndex(tasksDir?: string): TaskIndex | null {
  const dir = tasksDir ?? getDefaultTasksDir();
  const indexPath = getTaskIndexPath(dir);

  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(data) as TaskIndex;

    if (parsed.version !== TASK_INDEX_VERSION) {
      if (parsed.version === 1) {
        // Migration: V1 to V2 (add treeId and displayId)
        let rootCount = 0;
        for (const task of parsed.tasks) {
          if (!task.parentId) {
            rootCount++;
            task.displayId = rootCount.toString();
            task.treeId = task.id;
            task.depth = 0;
          }
        }
        for (const task of parsed.tasks) {
          if (task.parentId && !task.displayId) {
            const parent = parsed.tasks.find(t => t.id === task.parentId);
            const siblings = parsed.tasks.filter(t => t.parentId === task.parentId && t.displayId);
            task.treeId = parent?.treeId ?? task.id;
            task.depth = (parent?.depth ?? 0) + 1;
            task.displayId = `${parent?.displayId ?? '0'}.${siblings.length + 1}`;
          }
        }
        parsed.version = 2;
        return parsed;
      }
      backupTaskIndex(indexPath, `unsupported task index version ${String(parsed.version)}`);
      return null;
    }
    return parsed;
  } catch (err: any) {
    backupTaskIndex(indexPath, err?.message ?? String(err));
    return null;
  }
}

export function saveTaskIndex(index: TaskIndex, tasksDir?: string): void {
  const dir = tasksDir ?? getDefaultTasksDir();
  ensureTasksDir(dir);
  const indexPath = getTaskIndexPath(dir);
  const content = JSON.stringify(index, null, 2);
  atomicWrite(indexPath, content);
}

export function appendTaskLog(taskId: string, entry: LogEntry, tasksDir?: string): void {
  const dir = tasksDir ?? getDefaultTasksDir();
  ensureTasksDir(dir);
  const logPath = getTaskLogPath(taskId, dir);
  const line = JSON.stringify(entry) + '\n';
  try {
    fs.appendFileSync(logPath, line, 'utf-8');
  } catch {
    // Logging must never fail a task; the caller has no recovery path.
  }
}

export function loadTaskLog(
  taskId: string,
  opts: { fromSeq?: number; limit?: number; tasksDir?: string } = {},
): LogEntry[] {
  const dir = opts.tasksDir ?? getDefaultTasksDir();
  const logPath = getTaskLogPath(taskId, dir);
  if (!fs.existsSync(logPath)) return [];
  try {
    const data = fs.readFileSync(logPath, 'utf-8');
    const lines = data.trim().split('\n').filter(Boolean);
    let entries: LogEntry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        if (opts.fromSeq === undefined || entry.seq >= opts.fromSeq) {
          entries.push(entry);
        }
      } catch {
        continue;
      }
    }
    if (opts.limit && entries.length > opts.limit) {
      entries = entries.slice(-opts.limit);
    }
    return entries;
  } catch {
    return [];
  }
}

export function ensureTaskDir(taskId: string, tasksDir?: string): string {
  const dir = tasksDir ?? getDefaultTasksDir();
  const taskDir = getTaskDir(taskId, dir);
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }
  return taskDir;
}

export function getTaskStateDir(taskId: string, tasksDir?: string): string {
  return ensureTaskDir(taskId, tasksDir);
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export function deleteTaskStorage(taskId: string, tasksDir?: string): void {
  const dir = tasksDir ?? getDefaultTasksDir();
  const logPath = getTaskLogPath(taskId, dir);
  try {
    // No existsSync check: unlink is atomic and a concurrent removal surfaces
    // as ENOENT, which is the only failure we can safely ignore.
    fs.unlinkSync(logPath);
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
  }
  const taskDir = getTaskDir(taskId, dir);
  try {
    fs.rmSync(taskDir, { recursive: true, force: true });
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
  }
}
