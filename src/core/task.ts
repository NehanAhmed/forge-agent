import type { ApprovalPolicy } from './context.js';

export type TaskStatus = 'queued' | 'running' | 'waiting_approval' | 'done' | 'failed' | 'cancelled';
export type Isolation = 'worktree' | 'shared';
export type ReviewState = 'none' | 'pending_review' | 'merged' | 'discarded' | 'conflict' | 'needs_attention';

export interface WorktreeInfo {
  path: string;
  branch: string;
  baseRef: string;
  baseBranch: string;
}

export interface TaskUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
}

export interface TaskError {
  code: string;
  message: string;
}

export interface Task {
  id: string;
  goal: string;
  status: TaskStatus;
  statusDetail?: string;
  sessionId: string;
  parentId?: string;         // Reserved for Spec 2
  depth: number;             // 0 for root tasks
  cwd: string;
  isolation: Isolation;
  policy: ApprovalPolicy;
  worktree?: WorktreeInfo;
  reviewState: ReviewState;
  usage: TaskUsage;
  summary?: string;
  error?: TaskError;
  resumable: boolean;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

// Status transition rules
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'cancelled'],
  running: ['waiting_approval', 'done', 'failed', 'cancelled'],
  waiting_approval: ['running', 'cancelled'],
  done: [],
  failed: [],  // Can transition to 'queued' via resume
  cancelled: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid task status transition from '${from}' to '${to}'. ` +
      `Allowed transitions from '${from}': [${ALLOWED_TRANSITIONS[from]?.join(', ') ?? 'none'}]`
    );
  }
}

export function createTask(
  id: string,
  goal: string,
  opts: {
    sessionId?: string;
    cwd?: string;
    isolation?: Isolation;
    policy?: ApprovalPolicy;
  } = {}
): Task {
  return {
    id,
    goal,
    status: 'queued',
    sessionId: opts.sessionId ?? id,
    parentId: undefined,
    depth: 0,
    cwd: opts.cwd ?? process.cwd(),
    isolation: opts.isolation ?? 'worktree',
    policy: opts.policy ?? 'ask',
    reviewState: 'none',
    usage: { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 },
    resumable: false,
    createdAt: Date.now(),
  };
}
