import type { Budget } from './context.js';

export interface BudgetLimits {
  maxTokens?: number;
  maxCost?: number;
  maxRequests?: number;
}

export class BudgetImpl implements Budget {
  private _used = { tokens: 0, cost: 0, requests: 0 };

  constructor(public readonly limits: BudgetLimits) {}

  get used() {
    return { ...this._used };
  }

  canSpend(): boolean {
    if (this.limits.maxRequests !== undefined && this._used.requests >= this.limits.maxRequests) {
      return false;
    }
    if (this.limits.maxTokens !== undefined && this._used.tokens >= this.limits.maxTokens) {
      return false;
    }
    if (this.limits.maxCost !== undefined && this._used.cost >= this.limits.maxCost) {
      return false;
    }
    return true;
  }

  record(delta: { tokens?: number; cost?: number; requests?: number }): void {
    if (delta.tokens !== undefined) this._used.tokens += delta.tokens;
    if (delta.cost !== undefined) this._used.cost += delta.cost;
    if (delta.requests !== undefined) this._used.requests += delta.requests;
  }

  remaining(): { tokens?: number; cost?: number; requests?: number } {
    const result: { tokens?: number; cost?: number; requests?: number } = {};
    if (this.limits.maxTokens !== undefined) {
      result.tokens = Math.max(0, this.limits.maxTokens - this._used.tokens);
    }
    if (this.limits.maxCost !== undefined) {
      result.cost = Math.max(0, this.limits.maxCost - this._used.cost);
    }
    if (this.limits.maxRequests !== undefined) {
      result.requests = Math.max(0, this.limits.maxRequests - this._used.requests);
    }
    return result;
  }
}

export function createBudget(limits: BudgetLimits = {}): Budget {
  return new BudgetImpl(limits);
}
