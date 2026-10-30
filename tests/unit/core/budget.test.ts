import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BudgetImpl, createBudget } from '../../../src/core/budget.js';

describe('budget', () => {
  it('allows spending when no limits are configured', () => {
    const budget = createBudget();
    assert.equal(budget.canSpend(), true);
    assert.deepEqual(budget.remaining(), {});
  });

  it('stops at the request limit', () => {
    const budget = createBudget({ maxRequests: 2 });
    budget.record({ requests: 1 });
    assert.equal(budget.canSpend(), true);
    budget.record({ requests: 1 });
    assert.equal(budget.canSpend(), false);
    assert.deepEqual(budget.remaining(), { requests: 0 });
  });

  it('stops at token and cost limits independently', () => {
    const tokens = createBudget({ maxTokens: 100 });
    tokens.record({ tokens: 100 });
    assert.equal(tokens.canSpend(), false);

    const cost = createBudget({ maxCost: 0.5 });
    cost.record({ cost: 0.5 });
    assert.equal(cost.canSpend(), false);

    const mixed = createBudget({ maxTokens: 10, maxCost: 1, maxRequests: 3 });
    mixed.record({ tokens: 5, cost: 0.25, requests: 1 });
    assert.deepEqual(mixed.remaining(), { tokens: 5, cost: 0.75, requests: 2 });
  });

  it('never reports negative remaining values', () => {
    const budget = createBudget({ maxTokens: 10, maxCost: 1, maxRequests: 1 });
    budget.record({ tokens: 50, cost: 5, requests: 9 });
    assert.deepEqual(budget.remaining(), { tokens: 0, cost: 0, requests: 0 });
  });

  it('returns a defensive copy of usage', () => {
    const budget = new BudgetImpl({ maxRequests: 1 });
    budget.record({ requests: 1 });
    const used = budget.used;
    used.requests = 99;
    assert.equal(budget.used.requests, 1);
  });
});
