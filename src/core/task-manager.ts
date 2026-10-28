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

const TREE_BUDGET_LIMITS = {
  maxRequests: 60,
  maxTokens: 1_000_000,
  maxCost: undefined,
};

export class TaskManager extends EventEmitter {
  private tasks = new Map<string, Task>();
  private logs = new Map<string, LogEntry[]>(); // In-memory ring buffer
  private logSeq = new Map<string, number>(); // Per-task sequence counter
  private logSeqReady = new Set<string>();
  private logHistoryLoaded = new Set<string>();
  private approvals = new Map<string, Approval>();
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private readonly LOG_BUFFER_SIZE = 2000;
  private readonly SAVE_DEBOUNCE_MS = 500;
  
  // Queue management
  private queue: string[] = []; // Task IDs waiting to run
  private running = new Set<string>(); // Task IDs currently running
  private activeRuns = new Map<string, Promise<void>>();
  private abortControllers = new Map<string, AbortController>();
  private shuttingDown = false;
  private started = false;
  private concurrency: number;
  private rateLimitedUntil: number | null = null;
  private rateLimitTimer?: NodeJS.Timeout;
  private repoCwd: string;
  private customCallModel?: any;
  private treeLimits: { maxDepth: number; maxChildrenPerTask: number; maxTasksPerTree: number };
  private treeBudgets = new Map<string, Budget>();
  private waitingOnChildren = new Map<string, Set<string>>(); // parent -> child ids
  private waitingResolvers = new Map<string, () => void>(); // parent -> resume resolver
  private writeLocks = new Map<string, string>(); // cwd -> taskId
  private lockCwds = new Map<string, string>(); // taskId -> cwd used for its write lock
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
        const budget = createBudget(TREE_BUDGET_LIMITS);
        const treeTasks = Array.from(this.tasks.values()).filter(t => t.treeId === task.treeId);
        const usage = treeTasks.reduce(
          (total, member) => ({
            tokens: total.tokens + (member.usage?.inputTokens ?? 0) + (member.usage?.outputTokens ?? 0),
            cost: total.cost + (member.usage?.cost ?? 0),
            requests: total.requests + (member.usage?.requests ?? 0),
          }),
          { tokens: 0, cost: 0, requests: 0 },
        );
        budget.record(usage);
        this.treeBudgets.set(task.treeId, budget);
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

  /**
   * Start queued work restored from disk. Call this once after listeners are
   * attached so a fresh dashboard does not strand tasks that were queued when
   * the previous process exited.
   */
  start(): void {
    if (this.started || this.shuttingDown) return;
    this.started = true;
    for (const task of this.tasks.values()) {
      if (task.status === 'queued' && !this.queue.includes(task.id)) {
        this.queue.push(task.id);
      }
    }
    this.processQueue();
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

    const budget = opts.budget ?? createBudget(TREE_BUDGET_LIMITS);
    this.treeBudgets.set(id, budget);

    // Downgrade auto_in_worktree to ask if isolation is shared
    if (task.policy === 'auto_in_worktree' && task.isolation === 'shared') {
      task.policy = 'ask';
      task.statusDetail = 'Policy downgraded to "ask" (no worktree isolation)';
    }

    this.tasks.set(id, task);
    this.logs.set(id, []);
    this.logSeq.set(id, 0);
    this.logSeqReady.add(id);
    this.logHistoryLoaded.add(id);

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
      isolation: 'shared',
      policy,
      parentId,
      depth: parent.depth + 1,
      treeId,
      displayId,
    });

    this.tasks.set(id, task);
    this.logs.set(id, []);
    this.logSeq.set(id, 0);
    this.logSeqReady.add(id);
    this.logHistoryLoaded.add(id);

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

    // Register parent as waiting and release its slot/working-tree lock so the
    // children it spawned can actually be scheduled.
    this.waitingOnChildren.set(parentId, new Set(childIds));
    this.suspendParent(parentId);

    return new Promise((resolve) => {
      let settled = false;
      let interval: NodeJS.Timeout | undefined;
      let timeoutTimer: NodeJS.Timeout | undefined;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (interval) clearInterval(interval);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        this.waitingOnChildren.delete(parentId);

        const results = childIds.map(cid => {
          const t = this.tasks.get(cid)!;
          return { id: cid, status: t.status, summary: t.summary, error: t.error };
        });

        // Requeue the parent ahead of other roots so it takes the next slot and
        // reacquires its lock before the agent continues after this tool call.
        void this.resumeParent(parentId).then(
          () => resolve(results),
          () => resolve(results),
        );
      };

      // Polling fallback with a small interval.
      interval = setInterval(() => {
        const abort = this.abortControllers.get(parentId);
        if (allDone() || this.shuttingDown || abort?.signal.aborted) {
          finish();
        }
      }, 100);
      interval.unref();

      // Timeout handler.
      if (timeoutMs) {
        timeoutTimer = setTimeout(finish, timeoutMs);
        timeoutTimer.unref?.();
      }
    });
  }

  private suspendParent(parentId: string): void {
    this.suspended.add(parentId);
    this.running.delete(parentId);

    const lockCwd = this.lockCwds.get(parentId);
    if (lockCwd !== undefined && this.writeLocks.get(lockCwd) === parentId) {
      this.writeLocks.delete(lockCwd);
    }

    this.processQueue();
  }

  private resumeParent(parentId: string): Promise<void> {
    const task = this.tasks.get(parentId);
    if (!task || this.shuttingDown || task.status !== 'running') {
      this.suspended.delete(parentId);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitingResolvers.set(parentId, resolve);
      this.queue = this.queue.filter(id => id !== parentId);
      this.queue.unshift(parentId);
      this.processQueue();
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
      this.releaseWriteLock(task.id);

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

      // A parent queued to resume from waitForChildren must be released even
      // though cancellation removed it from the suspended set.
      const resumeResolver = this.waitingResolvers.get(task.id);
      if (resumeResolver) {
        this.waitingResolvers.delete(task.id);
        resumeResolver();
      }

      // If any parent was waiting on this task, its 100ms poll will observe the
      // terminal status and resume the parent.
      this.scheduleSave();
      this.emit('task:status', { taskId: task.id, newStatus: 'cancelled', task });
    }

    this.processQueue();
  }

  private processQueue(): void {
    if (this.shuttingDown) return;

    // Check rate limit
    if (this.rateLimitedUntil && Date.now() < this.rateLimitedUntil) {
      // Still rate limited, don't start new tasks
      return;
    }

    // Start tasks up to concurrency limit. Tasks blocked on a write lock are
    // deferred to the back of the queue; only scan the tasks that were already
    // queued so a blocked task can never spin this loop forever.
    const queuedAtStart = this.queue.length;
    const deferred: string[] = [];
    for (let i = 0; i < queuedAtStart && this.running.size < this.concurrency; i++) {
      const taskId = this.queue.shift();
      if (!taskId) break;

      const task = this.tasks.get(taskId);
      if (!task) continue;

      const isResume = this.suspended.has(taskId);

      // Skip if already running or not queued (suspended parents stay
      // `running`, but are being requeued to reclaim their slot).
      if (!isResume && task.status !== 'queued') continue;

      if (isResume && task.status === 'cancelled') {
        const resolver = this.waitingResolvers.get(taskId);
        this.waitingResolvers.delete(taskId);
        this.suspended.delete(taskId);
        resolver?.();
        continue;
      }

      // Check write lock availability. A resumed parent may have moved into a
      // worktree, but its lock was taken against the pre-worktree cwd.
      const isWriteCapable = task.policy !== 'read_only';
      const lockCwd = this.lockCwds.get(taskId) ?? task.cwd;
      if (isWriteCapable && this.writeLocks.has(lockCwd)) {
        // Defer, but do not block unrelated tasks later in the queue.
        deferred.push(taskId);
        continue;
      }

      if (isResume) {
        this.running.add(taskId);
        if (isWriteCapable) {
          this.writeLocks.set(lockCwd, taskId);
        }
        this.suspended.delete(taskId);
        const resolver = this.waitingResolvers.get(taskId);
        this.waitingResolvers.delete(taskId);
        resolver?.();
        continue;
      }

      this.running.add(taskId);
      const run = this.runTask(taskId);
      this.activeRuns.set(taskId, run);
      void run
        .catch(error => {
          const current = this.tasks.get(taskId);
          if (current && (current.status === 'running' || current.status === 'waiting_approval')) {
            current.error = {
              code: 'execution_error',
              message: error instanceof Error ? error.message : String(error),
            };
            this.updateStatus(taskId, 'failed');
          }
        })
        .finally(() => {
          this.activeRuns.delete(taskId);
          this.releaseResources(taskId);
          this.processQueue(); // Process next in queue
        });
    }
    if (deferred.length > 0) this.queue.push(...deferred);
  }

  private async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Acquire write lock for write-capable tasks. Keep the repository path: a
    // worktree task changes `task.cwd`, but the lock is keyed by the shared repo.
    const isWriteCapable = task.policy !== 'read_only';
    const lockCwd = task.cwd;
    if (isWriteCapable) {
      this.acquireWriteLock(taskId, lockCwd);
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
      const budget = this.treeBudgets.get(task.treeId) ?? createBudget(TREE_BUDGET_LIMITS);

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
        maxDepth: this.treeLimits.maxDepth,
        treeId: task.treeId,
        cwd: task.cwd,
        signal: abort.signal,
        state: createStateAccessor(task.sessionId, getTaskStateDir(taskId, this.tasksDir)),
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
        if (this.shuttingDown) {
          task.error = { code: 'interrupted', message: 'Process shutting down' };
          task.resumable = true;
          this.updateStatus(taskId, 'failed');
        } else if (task.status !== 'cancelled') {
          this.updateStatus(taskId, 'cancelled');
        }
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
          if (this.rateLimitTimer) clearTimeout(this.rateLimitTimer);
          this.rateLimitTimer = setTimeout(() => {
            this.rateLimitTimer = undefined;
            this.rateLimitedUntil = null;
            this.processQueue();
          }, 60_000);
          this.rateLimitTimer.unref?.();
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

  private acquireWriteLock(taskId: string, lockCwd: string): void {
    this.lockCwds.set(taskId, lockCwd);
    this.writeLocks.set(lockCwd, taskId);
  }

  private releaseWriteLock(taskId: string): void {
    const lockCwd = this.lockCwds.get(taskId);
    if (lockCwd !== undefined && this.writeLocks.get(lockCwd) === taskId) {
      this.writeLocks.delete(lockCwd);
    }
    this.lockCwds.delete(taskId);
  }

  private releaseResources(taskId: string): void {
    this.releaseWriteLock(taskId);
    this.running.delete(taskId);
    this.suspended.delete(taskId);
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

  private ensureLogSeq(taskId: string): void {
    if (this.logSeqReady.has(taskId)) return;
    this.logSeqReady.add(taskId);
    const entries = loadTaskLog(taskId, { tasksDir: this.tasksDir, limit: 1 });
    const last = entries[entries.length - 1];
    if (last && Number.isFinite(last.seq)) {
      this.logSeq.set(taskId, Math.max(this.logSeq.get(taskId) ?? 0, last.seq));
    }
  }

  private loadLogHistory(taskId: string): LogEntry[] {
    const disk = loadTaskLog(taskId, { tasksDir: this.tasksDir });
    const live = this.logs.get(taskId) ?? [];
    const bySeq = new Map<number, LogEntry>();
    for (const entry of disk) bySeq.set(entry.seq, entry);
    for (const entry of live) bySeq.set(entry.seq, entry);
    const merged = [...bySeq.values()]
      .sort((a, b) => a.seq - b.seq)
      .slice(-this.LOG_BUFFER_SIZE);
    this.logs.set(taskId, merged);
    const last = merged[merged.length - 1];
    if (last) {
      this.logSeq.set(taskId, Math.max(this.logSeq.get(taskId) ?? 0, last.seq));
    }
    this.logSeqReady.add(taskId);
    this.logHistoryLoaded.add(taskId);
    return merged;
  }

  log(taskId: string, entry: Omit<LogEntry, 'seq' | 'timestamp'>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    this.ensureLogSeq(taskId);
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

    // Load history once per task/process. Older versions only read the in-memory
    // buffer, so a task reopened after a restart appeared to have no log at all.
    let buffer = this.logs.get(taskId) ?? [];
    if (!this.logHistoryLoaded.has(taskId)) {
      buffer = this.loadLogHistory(taskId);
    }

    const fromSeq = opts?.fromSeq ?? 0;
    let entries = buffer.filter(entry => entry.seq >= fromSeq);

    // The cached buffer is capped; fetch older rows on demand.
    if (opts?.fromSeq !== undefined && buffer.length > 0 && buffer[0]!.seq > opts.fromSeq) {
      const disk = loadTaskLog(taskId, { ...opts, tasksDir: this.tasksDir });
      const live = buffer.filter(entry => entry.seq >= fromSeq);
      const bySeq = new Map<number, LogEntry>();
      for (const entry of disk) bySeq.set(entry.seq, entry);
      for (const entry of live) bySeq.set(entry.seq, entry);
      entries = [...bySeq.values()].sort((a, b) => a.seq - b.seq);
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
    this.shuttingDown = true;
    this.queue = [];
    if (this.rateLimitTimer) {
      clearTimeout(this.rateLimitTimer);
      this.rateLimitTimer = undefined;
    }
    this.rateLimitedUntil = null;

    // Release anything waiting on a human decision so the agent can unwind.
    for (const approval of this.approvals.values()) {
      approval.resolver(false);
    }
    this.approvals.clear();

    // Abort active model calls.
    for (const controller of this.abortControllers.values()) {
      controller.abort(new Error('Process shutting down'));
    }

    // Release parents queued to resume from a wait; they will observe the
    // aborted signal and unwind instead of waiting for a slot that never comes.
    for (const resolver of this.waitingResolvers.values()) {
      resolver();
    }
    this.waitingResolvers.clear();

    const runs = [...this.activeRuns.values()];
    if (runs.length > 0) {
      const graceMs = Math.max(0, opts?.graceMs ?? 2000);
      await new Promise<void>(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(finish, graceMs);
        Promise.allSettled(runs).then(finish, finish);
      });
    }

    // Flush pending save
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    // Any task still running after the grace period is interrupted, not lost.
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
