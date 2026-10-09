import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Task } from './task.js';
import type { LogEntry } from './context.js';

export interface TaskIndex {
  version: number;
  tasks: Task[];
}

const TASK_INDEX_VERSION = 1;
const TASKS_DIR = path.join(os.homedir(), '.forge', 'tasks');

function ensureTasksDir(): void {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
}

function getTaskIndexPath(): string {
  return path.join(TASKS_DIR, 'tasks.json');
}

function getTaskLogPath(taskId: string): string {
  return path.join(TASKS_DIR, `${taskId}.log.jsonl`);
}

function getTaskDir(taskId: string): string {
  return path.join(TASKS_DIR, taskId);
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

export function loadTaskIndex(): TaskIndex | null {
  ensureTasksDir();
  const indexPath = getTaskIndexPath();

  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(data) as TaskIndex;

    if (parsed.version !== TASK_INDEX_VERSION) {
      console.warn(`[persistence] Task index version mismatch (expected ${TASK_INDEX_VERSION}, got ${parsed.version})`);
      // Back up old version
      const backupPath = `${indexPath}.v${parsed.version}.backup`;
      fs.copyFileSync(indexPath, backupPath);
      return null;
    }

    return parsed;
  } catch (err: any) {
    console.error(`[persistence] Failed to load task index: ${err.message}`);

    // Back up corrupt file
    const backupPath = `${indexPath}.corrupt.${Date.now()}`;
    try {
      fs.copyFileSync(indexPath, backupPath);
      console.warn(`[persistence] Corrupt index backed up to ${backupPath}`);
    } catch {
      // Ignore backup errors
    }

    return null;
  }
}

export function saveTaskIndex(index: TaskIndex): void {
  ensureTasksDir();
  const indexPath = getTaskIndexPath();
  const content = JSON.stringify(index, null, 2);
  atomicWrite(indexPath, content);
}

export function appendTaskLog(taskId: string, entry: LogEntry): void {
  ensureTasksDir();
  const logPath = getTaskLogPath(taskId);
  const line = JSON.stringify(entry) + '\n';

  try {
    fs.appendFileSync(logPath, line, 'utf-8');
  } catch (err: any) {
    console.error(`[persistence] Failed to append to task log ${taskId}: ${err.message}`);
  }
}

export function loadTaskLog(
  taskId: string,
  opts: { fromSeq?: number; limit?: number } = {}
): LogEntry[] {
  const logPath = getTaskLogPath(taskId);

  if (!fs.existsSync(logPath)) {
    return [];
  }

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
        // Skip malformed lines
        continue;
      }
    }

    // Apply limit
    if (opts.limit && entries.length > opts.limit) {
      entries = entries.slice(-opts.limit);
    }

    return entries;
  } catch (err: any) {
    console.error(`[persistence] Failed to load task log ${taskId}: ${err.message}`);
    return [];
  }
}

export function ensureTaskDir(taskId: string): string {
  const dir = getTaskDir(taskId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getTaskStateDir(taskId: string): string {
  return ensureTaskDir(taskId);
}
