import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import fs from 'fs';
import type { Task, TaskStatus, Isolation } from './task.js';
import { createTask, validateStatusTransition, isValidTransition } from './task.js';
import type { ApprovalPolicy, LogEntry, ApprovalRequest, AgentContext, Budget } from './context.js';
import {
  loadTaskIndex,
  saveTaskIndex,
  appendTaskLog,
  loadTaskLog,
  getTaskStateDir,
  type TaskIndex,
} from './persistence.js';
import { runAgentHeadless } from './headless.js';
import { createStateAccessor } from './state.js';
import { createBudget } from './budget.js';
import { getClient } from './client.js';
import {
  createWorktree,
  removeWorktree,
  checkpointCommit,
  hasChangesFromBase,
  getDiff,
  mergeWorktree,
  listOrphanedWorktrees,
  type TaskDiff,
  type MergeResult,
} from './worktree.js';

export interface CreateTaskOpts {
  policy?: ApprovalPolicy;
  isolation?: Isolation;
  readOnly?: boolean;
  cwd?: string;
  budget?: Budget;
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

  // Queue management
  private queue: string[] = []; // Task IDs waiting to run
  private running = new Set<string>(); // Task IDs currently running
  private abortControllers = new Map<string, AbortController>();
  private concurrency: number;
  private rateLimitedUntil: number | null = null;
  private repoCwd: string;
  private customCallModel?: any;

  constructor(opts: { concurrency?: number; repoCwd?: string; callModel?: any } = {}) {
    super();
    this.concurrency = opts.concurrency ?? 2;
    this.repoCwd = opts.repoCwd ?? process.cwd();
    this.customCallModel = opts.callModel;
    this.load();

    // Detect orphaned worktrees on startup
    const knownTaskIds = new Set(Array.from(this.tasks.keys()));
    const orphans = listOrphanedWorktrees(this.repoCwd, knownTaskIds);
    if (orphans.length > 0) {
      console.warn(`[task-manager] Found ${orphans.length} orphaned worktree(s) — not auto-deleted:`);
      for (const orphan of orphans) {
        console.warn(`  ${orphan}`);
      }
    }
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

    // Add to queue
    this.queue.push(id);

    this.scheduleSave();
    this.emit('task:created', { taskId: id, task });

    // Start processing queue
    this.processQueue();

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
      // Remove from queue, never started
      const queueIndex = this.queue.indexOf(id);
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1);
      }
      task.status = 'cancelled';
      task.finishedAt = Date.now();
    } else {
      // Running or waiting approval - abort it
      const abort = this.abortControllers.get(id);
      if (abort) {
        abort.abort(new Error('Task cancelled'));
      }
      task.status = 'cancelled';
      task.finishedAt = Date.now();
    }

    this.scheduleSave();
    this.emit('task:status', { taskId: id, newStatus: 'cancelled', task });
  }

  private processQueue(): void {
    // Check rate limit
    if (this.rateLimitedUntil && Date.now() < this.rateLimitedUntil) {
      // Still rate limited, don't start new tasks
      return;
    }

    // Start tasks up to concurrency limit
    while (this.running.size < this.concurrency && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) break;

      const task = this.tasks.get(taskId);
      if (!task) continue;

      // Skip if already running or not queued
      if (task.status !== 'queued') continue;

      this.running.add(taskId);
      this.runTask(taskId).finally(() => {
        this.running.delete(taskId);
        this.processQueue(); // Process next in queue
      });
    }
  }

  private async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Create abort controller
    const abort = new AbortController();
    this.abortControllers.set(taskId, abort);

    try {
      // Update status to running
      this.updateStatus(taskId, 'running');

      // Set up worktree isolation if requested
      if (task.isolation === 'worktree') {
        try {
          const worktreeInfo = createWorktree(taskId, task.goal, this.repoCwd);
          task.worktree = worktreeInfo;
          task.cwd = worktreeInfo.path;
          this.scheduleSave();
          this.log(taskId, {
            type: 'info',
            content: `Created worktree at ${worktreeInfo.path} on branch ${worktreeInfo.branch}`,
          });
        } catch (err: any) {
          // Fall back to shared isolation
          task.isolation = 'shared';
          if (task.policy === 'auto_in_worktree') {
            task.policy = 'ask';
          }
          task.statusDetail = `Worktree creation failed, using shared isolation: ${err.message}`;
          this.log(taskId, {
            type: 'info',
            content: `Worktree creation failed, falling back to shared: ${err.message}`,
          });
          this.scheduleSave();
        }
      }

      // Create budget (use provided or default)
      const budget = createBudget({
        maxRequests: 60,
        maxTokens: 1_000_000,
        maxCost: undefined,
      });

      // Create agent context
      const ctx: AgentContext = {
        taskId,
        cwd: task.cwd,
        signal: abort.signal,
        state: createStateAccessor(task.sessionId, getTaskStateDir(taskId)),
        policy: task.policy,
        budget,
        log: (entry) => this.log(taskId, entry),
        requestApproval: (req) => this.requestApproval(taskId, req),
        callModel: this.customCallModel ?? getClient().callModel.bind(getClient()),
      };

      // Run the agent headlessly
      const result = await runAgentHeadless(task.goal, ctx, {
        maxSteps: 50,
      });

      // Update task with result
      task.usage = result.usage;
      task.summary = result.summary;

      if (result.outcome === 'done') {
        // Handle worktree post-task
        if (task.worktree) {
          await this.finalizeWorktree(task);
        }
        this.updateStatus(taskId, 'done');
      } else if (result.outcome === 'cancelled') {
        this.updateStatus(taskId, 'cancelled');
      } else {
        task.error = result.error;
        task.resumable = result.error?.code === 'max_steps' || result.error?.code === 'interrupted';

        // Handle worktree on failure too
        if (task.worktree && result.outcome === 'failed') {
          await this.finalizeWorktree(task);
        }

        this.updateStatus(taskId, 'failed');

        // Check for rate limiting
        if (result.error?.code === 'rate_limited') {
          this.rateLimitedUntil = Date.now() + 60_000; // 1 minute default
          this.log(taskId, {
            type: 'info',
            content: `Rate limited, pausing queue for 1 minute`,
          });
        }
      }

      this.emit('task:usage', { taskId, usage: result.usage });
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      task.error = {
        code: 'execution_error',
        message: errMsg,
      };
      this.updateStatus(taskId, 'failed');
      this.log(taskId, { type: 'error', content: `Task execution error: ${errMsg}` });
    } finally {
      this.abortControllers.delete(taskId);
      this.scheduleSave();
    }
  }

  private async finalizeWorktree(task: Task): Promise<void> {
    if (!task.worktree) return;

    try {
      // Make a checkpoint commit for any uncommitted changes
      const shortGoal = task.goal.slice(0, 40);
      const shortId = task.id.replace('task_', '').slice(0, 8);
      checkpointCommit(task.worktree, `task ${shortId}: ${shortGoal}`);
    } catch (err: any) {
      // Hook failure or other commit error
      task.reviewState = 'needs_attention';
      task.error = {
        code: 'checkpoint_failed',
        message: err.message,
      };
      this.log(task.id, {
        type: 'error',
        content: `Checkpoint commit failed: ${err.message}`,
      });
      this.emit('task:review', { taskId: task.id, reviewState: 'needs_attention' });
      return;
    }

    // Check if there are any changes vs base
    const hasChanges = hasChangesFromBase(task.worktree);
    if (hasChanges) {
      task.reviewState = 'pending_review';
      this.emit('task:review', { taskId: task.id, reviewState: 'pending_review' });
      this.log(task.id, {
        type: 'info',
        content: `Task complete. Changes are ready for review on branch ${task.worktree.branch}`,
      });
    } else {
      // No changes — clean up worktree immediately
      task.reviewState = 'none';
      try {
        removeWorktree(task.worktree, this.repoCwd);
        this.log(task.id, { type: 'info', content: `No changes made. Worktree removed.` });
      } catch (err: any) {
        this.log(task.id, { type: 'info', content: `Worktree cleanup warning: ${err.message}` });
      }
    }

    this.scheduleSave();
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

  async getDiff(id: string): Promise<TaskDiff> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    if (!task.worktree) throw new Error(`Task ${id} has no worktree`);
    return getDiff(task.worktree);
  }

  async merge(id: string, opts?: { message?: string }): Promise<MergeResult> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    if (!task.worktree) throw new Error(`Task ${id} has no worktree`);

    const result = await mergeWorktree(task.worktree, this.repoCwd, opts);

    if (result.success) {
      task.reviewState = 'merged';
      task.worktree = undefined;
    } else if (result.conflictedFiles?.length) {
      task.reviewState = 'conflict';
    }

    this.scheduleSave();
    this.emit('task:review', { taskId: id, reviewState: task.reviewState });
    return result;
  }

  async discard(id: string, force = false): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    if (!task.worktree) throw new Error(`Task ${id} has no worktree`);

    removeWorktree(task.worktree, this.repoCwd, force);

    task.reviewState = 'discarded';
    task.worktree = undefined;
    this.scheduleSave();
    this.emit('task:review', { taskId: id, reviewState: 'discarded' });
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
