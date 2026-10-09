import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import type { Task, TaskStatus, Isolation } from './task.js';
import { createTask, validateStatusTransition, isValidTransition } from './task.js';
import type { ApprovalPolicy, LogEntry, ApprovalRequest } from './context.js';
import {
  loadTaskIndex,
  saveTaskIndex,
  appendTaskLog,
  loadTaskLog,
  getTaskStateDir,
  type TaskIndex,
} from './persistence.js';

export interface CreateTaskOpts {
  policy?: ApprovalPolicy;
  isolation?: Isolation;
  readOnly?: boolean;
  cwd?: string;
}

export interface Approval {
  id: string;
  taskId: string;
  tool: string;
  summary: string;
  risk: string;
  args: unknown;
  cwd: string;
  createdAt: number;
  resolver: (decision: boolean) => void;
}

export type TaskEvent =
  | 'task:created'
  | 'task:status'
  | 'task:log'
  | 'task:usage'
  | 'approval:requested'
  | 'approval:resolved'
  | 'task:review';

export class TaskManager extends EventEmitter {
  private tasks = new Map<string, Task>();
  private logs = new Map<string, LogEntry[]>(); // In-memory ring buffer
  private logSeq = new Map<string, number>(); // Per-task sequence counter
  private approvals = new Map<string, Approval>();
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private readonly LOG_BUFFER_SIZE = 2000;
  private readonly SAVE_DEBOUNCE_MS = 500;

  constructor() {
    super();
    this.load();
  }

  private load(): void {
    const index = loadTaskIndex();
    if (!index) {
      return;
    }

    // Reconcile tasks from disk
    for (const task of index.tasks) {
      this.tasks.set(task.id, task);
      this.logs.set(task.id, []);
      this.logSeq.set(task.id, 0);

      // Reconcile interrupted tasks
      if (task.status === 'running' || task.status === 'waiting_approval') {
        task.status = 'failed';
        task.resumable = true;
        task.error = {
          code: 'interrupted',
          message: 'Process was interrupted',
        };
        task.finishedAt = Date.now();

        // Clear any pending approvals for this task
        for (const [approvalId, approval] of this.approvals) {
          if (approval.taskId === task.id) {
            approval.resolver(false);
            this.approvals.delete(approvalId);
          }
        }
      }

      // Check worktree still exists
      if (task.worktree && task.reviewState !== 'merged' && task.reviewState !== 'discarded') {
        const fs = require('fs');
        if (!fs.existsSync(task.worktree.path)) {
          task.reviewState = 'needs_attention';
          task.error = {
            code: 'worktree_missing',
            message: 'Worktree directory not found',
          };
        }
      }
    }

    // Save reconciled state
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.save();
      this.saveDebounceTimer = null;
    }, this.SAVE_DEBOUNCE_MS);
  }

  private save(): void {
    const index: TaskIndex = {
      version: 1,
      tasks: Array.from(this.tasks.values()),
    };

    saveTaskIndex(index);
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateApprovalId(): string {
    return `approval_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  create(goal: string, opts: CreateTaskOpts = {}): Task {
    // Handle read-only override
    if (opts.readOnly) {
      opts.policy = 'read_only';
      opts.isolation = 'shared';
    }

    const id = this.generateTaskId();
    const sessionId = id; // Each task has its own session
    const task = createTask(id, goal, {
      sessionId,
      cwd: opts.cwd,
      isolation: opts.isolation ?? 'worktree',
      policy: opts.policy ?? 'ask',
    });

    // Downgrade auto_in_worktree to ask if isolation is shared
    if (task.policy === 'auto_in_worktree' && task.isolation === 'shared') {
      task.policy = 'ask';
      task.statusDetail = 'Policy downgraded to "ask" (no worktree isolation)';
    }

    this.tasks.set(id, task);
    this.logs.set(id, []);
    this.logSeq.set(id, 0);

    this.scheduleSave();
    this.emit('task:created', { taskId: id, task });

    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(filter?: { status?: TaskStatus[] }): Task[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter(t => filter.status!.includes(t.status));
    }

    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  updateStatus(id: string, newStatus: TaskStatus, detail?: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    validateStatusTransition(task.status, newStatus);

    const oldStatus = task.status;
    task.status = newStatus;
    if (detail !== undefined) {
      task.statusDetail = detail;
    }

    if (newStatus === 'running' && !task.startedAt) {
      task.startedAt = Date.now();
    }

    if (['done', 'failed', 'cancelled'].includes(newStatus)) {
      task.finishedAt = Date.now();
    }

    this.scheduleSave();
    this.emit('task:status', { taskId: id, oldStatus, newStatus, task });
  }

  resume(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (task.status !== 'failed') {
      throw new Error(`Cannot resume task ${id}: status is ${task.status}, must be failed`);
    }

    if (!task.resumable) {
      throw new Error(`Task ${id} is not resumable`);
    }

    // Clear error and re-queue
    task.error = undefined;
    task.resumable = false;
    task.status = 'queued';

    this.scheduleSave();
    this.emit('task:status', { taskId: id, oldStatus: 'failed', newStatus: 'queued', task });

    return task;
  }

  async cancel(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (task.status === 'done' || task.status === 'failed' || task.status === 'cancelled') {
      // Already terminal
      return;
    }

    // Auto-deny all pending approvals for this task
    const pendingApprovals = Array.from(this.approvals.entries())
      .filter(([_, approval]) => approval.taskId === id);

    for (const [approvalId, approval] of pendingApprovals) {
      approval.resolver(false);
      this.approvals.delete(approvalId);
      this.emit('approval:resolved', { approvalId, taskId: id, decision: 'deny' });
    }

    if (task.status === 'queued') {
      // Just mark cancelled, never started
      task.status = 'cancelled';
      task.finishedAt = Date.now();
    } else {
      // Running or waiting approval - will be aborted externally
      task.status = 'cancelled';
      task.finishedAt = Date.now();
    }

    this.scheduleSave();
    this.emit('task:status', { taskId: id, newStatus: 'cancelled', task });
  }

  log(taskId: string, entry: Omit<LogEntry, 'seq' | 'timestamp'>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const seq = (this.logSeq.get(taskId) ?? 0) + 1;
    this.logSeq.set(taskId, seq);

    const fullEntry: LogEntry = {
      ...entry,
      seq,
      timestamp: Date.now(),
    };

    // Add to ring buffer
    const buffer = this.logs.get(taskId) ?? [];
    buffer.push(fullEntry);
    if (buffer.length > this.LOG_BUFFER_SIZE) {
      buffer.shift();
    }
    this.logs.set(taskId, buffer);

    // Append to disk
    appendTaskLog(taskId, fullEntry);

    this.emit('task:log', { taskId, entry: fullEntry });
  }

  getLog(taskId: string, opts?: { fromSeq?: number; limit?: number }): LogEntry[] {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Try in-memory buffer first
    const buffer = this.logs.get(taskId) ?? [];
    const fromSeq = opts?.fromSeq ?? 0;

    let entries = buffer.filter(e => e.seq >= fromSeq);

    // If buffer doesn't have enough history, load from disk
    if (opts?.fromSeq && buffer.length > 0 && buffer[0]!.seq > fromSeq) {
      entries = loadTaskLog(taskId, opts);
    }

    if (opts?.limit && entries.length > opts.limit) {
      entries = entries.slice(-opts.limit);
    }

    return entries;
  }

  listApprovals(): Approval[] {
    return Array.from(this.approvals.values())
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  requestApproval(taskId: string, req: ApprovalRequest): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return new Promise<boolean>((resolve) => {
      const approval: Approval = {
        id: this.generateApprovalId(),
        taskId,
        tool: req.tool,
        summary: req.summary,
        risk: req.risk,
        args: req.args,
        cwd: req.cwd,
        createdAt: Date.now(),
        resolver: resolve,
      };

      this.approvals.set(approval.id, approval);

      // Update task status
      if (task.status === 'running') {
        const oldStatus = task.status;
        task.status = 'waiting_approval';
        this.scheduleSave();
        this.emit('task:status', { taskId, oldStatus, newStatus: 'waiting_approval', task });
      }

      this.emit('approval:requested', { approvalId: approval.id, taskId, approval });
    });
  }

  resolveApproval(approvalId: string, decision: 'approve' | 'deny'): void {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    const task = this.tasks.get(approval.taskId);
    if (task && task.status === 'waiting_approval') {
      task.status = 'running';
      this.scheduleSave();
      this.emit('task:status', { taskId: approval.taskId, oldStatus: 'waiting_approval', newStatus: 'running', task });
    }

    approval.resolver(decision === 'approve');
    this.approvals.delete(approvalId);

    this.emit('approval:resolved', { approvalId, taskId: approval.taskId, decision });
  }

  async shutdown(opts?: { graceMs?: number }): Promise<void> {
    // Flush pending save
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.save();
    }

    // Mark running tasks as interrupted
    for (const task of this.tasks.values()) {
      if (task.status === 'running' || task.status === 'waiting_approval') {
        task.status = 'failed';
        task.resumable = true;
        task.error = {
          code: 'interrupted',
          message: 'Process shutting down',
        };
        task.finishedAt = Date.now();
      }
    }

    this.save();
    this.removeAllListeners();
  }
}
