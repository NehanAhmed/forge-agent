import type { AgentContext } from '../../src/core/context.js';
import { createBudget, type BudgetLimits } from '../../src/core/budget.js';
import { fakeModel, type FakeModelOptions } from './model.js';
import { makeTempDir } from './temp.js';

export interface TestContextOptions extends Partial<AgentContext> {
  budgetLimits?: BudgetLimits;
  model?: FakeModelOptions;
}

/** Minimal AgentContext with a fake model and an in-memory state accessor. */
export function createTestContext(options: TestContextOptions = {}): AgentContext {
  const { budgetLimits, model, ...overrides } = options;
  const cwd = overrides.cwd ?? makeTempDir('forge-ctx-');

  return {
    taskId: 'test-task',
    cwd,
    signal: new AbortController().signal,
    state: {
      load: async () => null,
      save: async () => {},
    },
    policy: 'ask',
    budget: createBudget(budgetLimits ?? { maxRequests: 10, maxTokens: 10_000 }),
    log: () => {},
    requestApproval: async () => true,
    callModel: fakeModel(model) as unknown as AgentContext['callModel'],
    ...overrides,
  };
}
