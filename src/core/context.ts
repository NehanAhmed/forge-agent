import type { StateAccessor } from '@openrouter/agent';
import type { getClient } from './client.js';

export type ApprovalPolicy = 'ask' | 'auto_in_worktree' | 'read_only';

export interface Budget {
  readonly limits: { maxTokens?: number; maxCost?: number; maxRequests?: number };
  readonly used: { tokens: number; cost: number; requests: number };
  canSpend(): boolean;
  record(delta: { tokens?: number; cost?: number; requests?: number }): void;
  remaining(): { tokens?: number; cost?: number; requests?: number };
}

export type RiskClass = 'read' | 'write' | 'exec' | 'network';

export interface ApprovalRequest {
  tool: string;
  summary: string;
  risk: RiskClass;
  args: unknown;
  cwd: string;
}

export interface LogEntry {
  seq: number;
  timestamp: number;
  type: 'reasoning' | 'tool_call' | 'tool_result' | 'assistant' | 'info' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  taskId?: string;           // undefined for legacy interactive session
  cwd: string;               // absolute, already resolved
  signal: AbortSignal;
  state: StateAccessor;
  policy: ApprovalPolicy;
  budget: Budget;
  log: (entry: Omit<LogEntry, 'seq' | 'timestamp'>) => void;
  requestApproval: (req: ApprovalRequest) => Promise<boolean>;
  callModel: ReturnType<typeof getClient>['callModel'];
}
