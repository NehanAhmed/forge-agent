# Forge Task Engine

The Forge Task Engine is a headless task execution system that enables parallel, isolated task execution with approval workflows and git worktree isolation.

## Key Features

1. **Task Model**: A typed task state machine with status transitions, approval policies, and worktree isolation
2. **Queue System**: FIFO queue with concurrency control and rate limit handling
3. **Approvals Inbox**: Policy-based approval system with ask/auto_in_worktree/read_only modes
4. **Worktree Isolation**: Per-task git worktrees with review operations (diff, merge, discard)
5. **Budget Tracking**: Token and request budget management
6. **Event Stream**: Real-time task lifecycle events
7. **Persistence**: Atomic task state persistence with restart reconciliation

## Usage

```bash
# Run the demo script
npm run demo:task-engine

# Run tests
npm test
```

## Architecture

The task engine consists of:

1. `TaskManager`: Core task coordination class
2. `AgentContext`: Per-task execution context
3. `runAgentHeadless`: Headless agent runner
4. `worktree.ts`: Git worktree lifecycle helpers
5. `approvals.ts`: Approval policy enforcement
6. `persistence.ts`: Atomic task state persistence

## Configuration

Key settings in `forge.config.json`:

```json
{
  "taskEngine": {
    "concurrency": 2,
    "defaultPolicy": "ask",
    "defaultIsolationForWriteTasks": "worktree",
    "approvals": "inbox",
    "maxStepsPerTask": 50,
    "budget": {
      "maxRequests": 60,
      "maxTokens": 1000000
    }
  }
}
```

## Demo Script

The demo script (`scripts/demo-task-engine.ts`) demonstrates:

1. Creating tasks with different policies and isolation modes
2. Live event stream output
3. Approval workflow
4. Worktree isolation and review operations

## Testing

The test suite covers:

1. Context isolation and path safety
2. Headless run and abort handling
3. Task model and state machine
4. Queue and concurrency
5. Approvals and policies
6. Worktree isolation and review
7. Persistence and restart behavior
8. Security and hygiene

## Safety Guarantees

- Only operates on branches starting with `agent/`
- Only operates on worktrees under `~/.forge/worktrees/`
- Uses argument lists for all git commands, never shell strings
- Verifies clean working tree and correct branch before merge
- Never uses `--no-verify` on checkpoint commits
