import type { Task, TaskStatus, TaskUsage, ReviewState } from './task.js';
import type { LogEntry, ApprovalPolicy } from './context.js';
import type { Approval } from './task-manager.js';
import type { TaskDiff, MergeResult } from './worktree.js';
import type { TaskManager } from './task-manager.js';

export interface TaskEventMap {
  'task:created': { taskId: string; task: Task };
  'task:status': { taskId: string; oldStatus?: TaskStatus; newStatus: TaskStatus; task: Task };
  'task:log': { taskId: string; entry: LogEntry };
  'task:usage': { taskId: string; usage: TaskUsage };
  'approval:requested': { approvalId: string; taskId: string; approval: Approval };
  'approval:resolved': { approvalId: string; taskId: string; decision: 'approve' | 'deny' };
  'task:review': { taskId: string; reviewState: ReviewState };
}

export type TaskEvent = {
  [K in keyof TaskEventMap]: { type: K } & TaskEventMap[K];
}[keyof TaskEventMap];

export interface TaskClient {
  createTask(
    goal: string,
    opts?: { readOnly?: boolean; isolation?: 'worktree' | 'shared'; policy?: ApprovalPolicy },
  ): Promise<Task>;
  listTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getLog(id: string, opts?: { fromSeq?: number; limit?: number }): Promise<LogEntry[]>;
  cancelTask(id: string): Promise<void>;
  resumeTask(id: string): Promise<Task>;
  listApprovals(): Promise<Approval[]>;
  resolveApproval(approvalId: string, decision: 'approve' | 'deny'): Promise<void>;
  getDiff(id: string): Promise<TaskDiff>;
  mergeTask(id: string): Promise<MergeResult>;
  discardTask(id: string, opts?: { force?: boolean }): Promise<void>;
  subscribe(handler: (event: TaskEvent) => void): () => void;
}

export class InProcessTaskClient implements TaskClient {
  private manager: TaskManager;
  private handlers: Set<(event: TaskEvent) => void> = new Set();

  constructor(manager: TaskManager) {
    this.manager = manager;

    // Bridge TaskManager events to TaskClient subscribers
    this.manager.on('task:created', data => this.emit('task:created', data));
    this.manager.on('task:status', data => this.emit('task:status', data));
    this.manager.on('task:log', data => this.emit('task:log', data));
    this.manager.on('task:usage', data => this.emit('task:usage', data));
    this.manager.on('approval:requested', data => this.emit('approval:requested', data));
    this.manager.on('approval:resolved', data => this.emit('approval:resolved', data));
    this.manager.on('task:review', data => this.emit('task:review', data));
  }

  private emit<K extends keyof TaskEventMap>(type: K, data: TaskEventMap[K]): void {
    const event = { type, ...data } as TaskEvent;
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  async createTask(
    goal: string,
    opts?: { readOnly?: boolean; isolation?: 'worktree' | 'shared'; policy?: ApprovalPolicy },
  ): Promise<Task> {
    return this.manager.create(goal, opts);
  }

  async listTasks(): Promise<Task[]> {
    return this.manager.list();
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.manager.get(id);
  }

  async getLog(id: string, opts?: { fromSeq?: number; limit?: number }): Promise<LogEntry[]> {
    return this.manager.getLog(id, opts);
  }

  async cancelTask(id: string): Promise<void> {
    return this.manager.cancel(id);
  }

  async resumeTask(id: string): Promise<Task> {
    return this.manager.resume(id);
  }

  async listApprovals(): Promise<Approval[]> {
    return this.manager.listApprovals();
  }

  async resolveApproval(approvalId: string, decision: 'approve' | 'deny'): Promise<void> {
    this.manager.resolveApproval(approvalId, decision);
  }

  async getDiff(id: string): Promise<TaskDiff> {
    return this.manager.getDiff(id);
  }

  async mergeTask(id: string): Promise<MergeResult> {
    return this.manager.merge(id);
  }

  async discardTask(id: string, opts?: { force?: boolean }): Promise<void> {
    return this.manager.discard(id, opts?.force);
  }

  subscribe(handler: (event: TaskEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
