import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import fs from 'fs';
import type { Task, TaskStatus, Isolation } from './task.js';
import { createTask, validateStatusTransition, isValidTransition } from './task.js';
import { assignDisplayId, descendantsOf, childrenOf, treeSize, enforceSpawnLimits, stricterPolicy } from './tree.js';
import type { ApprovalPolicy, LogEntry, ApprovalRequest, AgentContext, Budget } from './context.js';
import type { TaskUsage, TaskError } from './task.js';
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
  private treeLimits: { maxDepth: number; maxChildrenPerTask: number; maxTasksPerTree: number };
  private treeBudgets = new Map<string, Budget>();
  private waitingOnChildren = new Map<string, Set<string>>(); // parent -> child ids
  private waitingResolvers = new Map<string, () => void>(); // parent -> resume resolver
  private writeLocks = new Map<string, string>(); // cwd -> taskId
  private suspended = new Set<string>(); // parents waiting on children (subset of running)

  private tasksDir?: string;

  constructor(opts: { concurrency?: number; repoCwd?: string; callModel?: any; tasksDir?: string; treeLimits?: { maxDepth: number; maxChildrenPerTask: number; maxTasksPerTree: number } } = {}) {
    super();
    this.concurrency = opts.concurrency ?? 2;
    this.repoCwd = opts.repoCwd ?? process.cwd();
    this.customCallModel = opts.callModel;
    this.tasksDir = opts.tasksDir;
    this.treeLimits = opts.treeLimits ?? {
      maxDepth: 2,
      maxChildrenPerTask: 4,
      maxTasksPerTree: 10,
    };
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
    const index = loadTaskIndex(this.tasksDir);
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

    // Restore tree budgets from persisted usage
    for (const task of this.tasks.values()) {
      if (!task.parentId) {
        this.treeBudgets.set(task.treeId, createBudget({
          maxRequests: 60,
          maxTokens: 1_000_000,
          maxCost: undefined,
        }));
        const budget = this.treeBudgets.get(task.treeId)!;
        budget.record({
          tokens: (task.usage?.inputTokens ?? 0) + (task.usage?.outputTokens ?? 0),
          cost: task.usage?.cost ?? 0,
          requests: task.usage?.requests ?? 0,
        });
      }
    }
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
      version: 2,
      tasks: Array.from(this.tasks.values()),
    };

    saveTaskIndex(index, this.tasksDir);
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
    const allTasks = Array.from(this.tasks.values());
    const displayId = assignDisplayId(allTasks);

    const task = createTask(id, goal, {
      sessionId,
      cwd: opts.cwd,
      isolation: opts.isolation ?? 'worktree',
      policy: opts.policy ?? 'ask',
      depth: 0,
      treeId: id,
      displayId,
    });

    const budget = opts.budget ?? createBudget({
      maxRequests: 60,
      maxTokens: 1_000_000,
      maxCost: undefined,
    });
    this.treeBudgets.set(id, budget);

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

  async spawnChild(parentId: string, goal: string, readOnly?: boolean): Promise<{ id: string; displayId: string }> {
    const parent = this.tasks.get(parentId);
    if (!parent) {
      throw new Error(`Parent task not found: ${parentId}`);
    }

    const allTasks = Array.from(this.tasks.values());
    const limits = enforceSpawnLimits(allTasks, parent, this.treeLimits, parent.depth + 1);
    if (!limits.ok) {
      throw new Error(limits.error!);
    }

    const displayId = assignDisplayId(allTasks, parentId);
    const treeId = parent.treeId;

    let policy: ApprovalPolicy = parent.policy;
    if (readOnly) {
      policy = 'read_only';
    } else {
      policy = stricterPolicy(parent.policy, 'ask') as ApprovalPolicy;
    }

    const id = this.generateTaskId();
    const task = createTask(id, goal, {
      sessionId: id,
      cwd: parent.cwd,
      isolation: parent.isolation,
      policy,
      parentId,
      depth: parent.depth + 1,
      treeId,
      displayId,
    });

    if (readOnly) {
      task.isolation = 'shared';
    }

    this.tasks.set(id, task);
    this.logs.set(id, []);
    this.logSeq.set(id, 0);

    this.queue.push(id);

    this.scheduleSave();
    this.emit('task:created', { taskId: id, task });

    this.processQueue();

    return { id, displayId };
  }

  async waitForChildren(parentId: string, childIds: string[], timeoutMs?: number): Promise<Array<{ id: string; status: TaskStatus; summary?: string; error?: TaskError }>> {
    const parent = this.tasks.get(parentId);
    if (!parent) {
      throw new Error(`Parent task not found: ${parentId}`);
    }

    // Validate all ids are descendants
    for (const cid of childIds) {
      const child = this.tasks.get(cid);
      if (!child || child.parentId !== parentId) {
        throw new Error(`Task ${cid} is not a child of ${parentId}`);
      }
    }

    const allDone = () => childIds.every(cid => {
      const t = this.tasks.get(cid);
      return t && (t.status === 'done' || t.status === 'failed' || t.status === 'cancelled');
    });

    if (allDone()) {
      return childIds.map(cid => {
        const t = this.tasks.get(cid)!;
        return { id: cid, status: t.status, summary: t.summary, error: t.error };
      });
    }

    // Register parent as waiting
    this.waitingOnChildren.set(parentId, new Set(childIds));

    return new Promise((resolve) => {
      const check = () => {
        if (allDone()) {
          resolve(childIds.map(cid => {
            const t = this.tasks.get(cid)!;
            return { id: cid, status: t.status, summary: t.summary, error: t.error };
          }));
        } else if (timeoutMs) {
          resolve(childIds.map(cid => {
            const t = this.tasks.get(cid)!;
            return { id: cid, status: t.status, summary: t.summary, error: t.error };
          }));
        }
      };

      // Polling fallback with a small interval
      const interval = setInterval(() => {
        if (allDone()) {
          clearInterval(interval);
          this.waitingOnChildren.delete(parentId);
          check();
        }
      }, 100);
      interval.unref();


      // Timeout handler
      if (timeoutMs) {
        setTimeout(() => {
          if (this.waitingOnChildren.has(parentId)) {
            clearInterval(interval);
            this.waitingOnChildren.delete(parentId);
            check();
          }
        }, timeoutMs);
      }
    });
  }

  async getDescendant(parentId: string, id: string): Promise<{ id: string; status: TaskStatus; usage: TaskUsage; summary?: string; error?: TaskError } | undefined> {
    const parent = this.tasks.get(parentId);
    if (!parent) throw new Error(`Parent task not found: ${parentId}`);

    const child = this.tasks.get(id);
    if (!child || child.parentId !== parentId) {
      throw new Error(`Task ${id} is not a child of ${parentId}`);
    }

    return {
      id: child.id,
      status: child.status,
      usage: child.usage,
      summary: child.summary,
      error: child.error,
    };
  }

  getTreeBudget(treeId: string): Budget | undefined {
    return this.treeBudgets.get(treeId);
  }

  createTreeBudget(limits: { maxTokens?: number; maxCost?: number; maxRequests?: number }): Budget {
    const budget = createBudget(limits);
    return budget;
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
    const rootTask = this.tasks.get(id);
    if (!rootTask) {
      throw new Error(`Task not found: ${id}`);
    }

    const allTasks = Array.from(this.tasks.values());
    const targetTasks = [rootTask, ...descendantsOf(allTasks, id)];

    for (const task of targetTasks) {
      if (task.status === 'done' || task.status === 'failed' || task.status === 'cancelled') {
        continue;
      }

      // Auto-deny all pending approvals for this task
      const pendingApprovals = Array.from(this.approvals.entries())
        .filter(([_, approval]) => approval.taskId === task.id);

      for (const [approvalId, approval] of pendingApprovals) {
        approval.resolver(false);
        this.approvals.delete(approvalId);
        this.emit('approval:resolved', { approvalId, taskId: task.id, decision: 'deny' });
      }

      // Release write lock if held
      if (this.writeLocks.get(task.cwd) === task.id) {
        this.writeLocks.delete(task.cwd);
      }

      // Remove from suspended
      this.suspended.delete(task.id);

      if (task.status === 'queued') {
        const queueIndex = this.queue.indexOf(task.id);
        if (queueIndex !== -1) {
          this.queue.splice(queueIndex, 1);
        }
        task.status = 'cancelled';
        task.finishedAt = Date.now();
      } else {
        const abort = this.abortControllers.get(task.id);
        if (abort) {
          abort.abort(new Error('Task cancelled'));
        }
        task.status = 'cancelled';
        task.finishedAt = Date.now();
      }

      // If any parent was waiting on this task, wake up or update
      for (const [parentId, waitingSet] of this.waitingOnChildren.entries()) {
        if (waitingSet.has(task.id)) {
          const resolver = this.waitingResolvers.get(parentId);
          if (resolver) resolver();
        }
      }

      this.scheduleSave();
      this.emit('task:status', { taskId: task.id, newStatus: 'cancelled', task });
    }

    this.processQueue();
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

      // Check write lock availability
      const isWriteCapable = task.policy !== 'read_only';
      if (isWriteCapable && this.writeLocks.has(task.cwd)) {
        // Re-queue at end (will be retried later)
        this.queue.push(taskId);
        continue;
      }

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

    // Acquire write lock for write-capable tasks
    const isWriteCapable = task.policy !== 'read_only';
    if (isWriteCapable) {
      this.writeLocks.set(task.cwd, taskId);
    }

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

      // Get the shared tree budget
      const budget = this.treeBudgets.get(task.treeId) ?? createBudget({
        maxRequests: 60,
        maxTokens: 1_000_000,
        maxCost: undefined,
      });

      // Check budget before running
      if (!budget.canSpend()) {
        task.error = { code: 'budget_exceeded', message: 'Tree budget exhausted' };
        this.updateStatus(taskId, 'failed');
        return;
      }

      // Create agent context
      const ctx: AgentContext = {
        taskId,
        parentId: task.parentId,
        depth: task.depth,
        treeId: task.treeId,
        cwd: task.cwd,
        signal: abort.signal,
        state: createStateAccessor(task.sessionId, getTaskStateDir(taskId)),
        policy: task.policy,
        budget,
        log: (entry) => this.log(taskId, entry),
        requestApproval: (req) => this.requestApproval(taskId, req),
        callModel: this.customCallModel ?? getClient().callModel.bind(getClient()),
        spawnChild: (goal: string, readOnly?: boolean) => this.spawnChild(taskId, goal, readOnly),
        waitForChildren: (ids: string[], timeoutMs?: number) => this.waitForChildren(taskId, ids, timeoutMs),
        getDescendant: (id: string) => this.getDescendant(taskId, id),
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
      // Release write lock
      if (isWriteCapable && this.writeLocks.get(task.cwd) === taskId) {
        this.writeLocks.delete(task.cwd);
      }
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
    appendTaskLog(taskId, fullEntry, this.tasksDir);

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
      entries = loadTaskLog(taskId, { ...opts, tasksDir: this.tasksDir });
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
