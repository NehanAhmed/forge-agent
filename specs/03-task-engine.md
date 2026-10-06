# Spec 1 of 2: Task Engine, Approvals Inbox, and Worktree Isolation

> Part of the multi-agent workflow. This spec builds the backend: headless agent runs, a task manager, a queue, an approvals inbox, and git worktree isolation. **Spec 2** (dashboard TUI and child tasks) builds on top of it.
>
> **Execution order:** complete this spec fully, run the tests, **commit everything**, and only then move on to Spec 2.
>
> Names such as `runAgent`, `StateAccessor`, `callModel`, `createTools`, `resolveSafePath`, `spawn_sub_agent`, and `pendingConfirm` refer to the current codebase. Verify each one exists and adapt to the real names and signatures.

## The Goal

Turn the agent from a single interactive session into a system that can run **many tasks asynchronously**. The user types a goal, it becomes a task, an agent works on it headlessly, and the task can be inspected, approved, cancelled, resumed, and reviewed.

This spec delivers the engine only. By the end, tasks can be created, queued, run in parallel, isolated from each other, budgeted, paused for approval, and persisted, all through a programmatic API and event stream. There is **no new dashboard** in this spec. The existing interactive chat keeps working as it does today.

The design is based on one idea: **a task is a session running headlessly with a status.** The existing state files are the task's memory, `runAgent` is the worker, and a new `TaskManager` coordinates everything.

## The Task

Work in the phases below, in order. Each phase should leave the project building and the tests passing.

**Phase 0: Preflight**
1. Read the codebase. Find: where `process.cwd()` is used, how tools are built and registered, how `runAgent` works, how `StateAccessor` persists sessions, how `callModel` handles its `signal` option, and how `pendingConfirm` works today.
2. Run the existing test suite and record the baseline. Note any tests that already fail so they are not blamed on this work.
3. Check `git_status`. Starting from a clean working tree is strongly preferred. If it is not clean, note what is already modified so you only commit your own changes.

**Phase 1: Context refactor (remove the global cwd)**
4. Introduce an `AgentContext` object and thread it through everything. Change `createTools(ctx)` and `resolveSafePath(path, ctx.cwd)` so no tool depends on `process.cwd()`.
5. Update the shell tool, file tools, git tools, and anything else that spawns processes or touches paths so they use `ctx.cwd`.
6. Resolve `process.cwd()` exactly once, at the application entry point, and pass it in.

**Phase 2: Headless `runAgent`**
7. Make `runAgent` runnable with no TUI, no stdout writes, and no stdin prompts. Everything it wants to show goes out through `ctx.log`. Anything that needs a decision goes through `ctx.requestApproval`.
8. Wire the abort signal all the way down: into `callModel` and into every child process a tool starts.
9. Track usage per call and return a structured result.

**Phase 3: Task model, store, and `TaskManager`**
10. Add the `Task` type, the status state machine, and persistence (`tasks.json` index, per-task session state, per-task event log).
11. Add `TaskManager` with create, get, list, cancel, resume, and an event emitter.

**Phase 4: Queue, concurrency, budgets, rate limits**
12. Add a FIFO queue with a concurrency cap, a `Budget` object, and rate-limit handling.

**Phase 5: Approvals inbox and policies**
13. Replace the single `pendingConfirm` with an approval queue, add per-task policies, and enforce them in code.

**Phase 6: Worktree isolation**
14. Give write-capable tasks their own git worktree and branch, and add review operations (diff, merge, discard).

**Phase 7: Tests, docs, and a demo script**
15. Write the tests listed under "The End Result to Expect".
16. Add a small demo script that runs several tasks against a fake model and prints the event stream, so the engine can be checked without any UI.
17. Update the README and any developer docs.

**Phase 8: Commit (required)**
18. Run the full test suite. Do not commit if it fails because of your changes.
19. Review your work with `git_status` and `git_diff`.
20. Stage **explicit paths** with `git_add` (source, tests, docs, `.gitignore`). Do not stage `.env`, `.agent/`, `tasks.json`, logs, worktrees, `node_modules`, or build output. Make sure `.gitignore` covers them.
21. Check the staged diff, then commit everything from this spec with `git_commit` using this message (adjust the body to match what you did):

    ```
    feat(tasks): add headless task engine, approvals inbox and worktree isolation

    - AgentContext replaces process.cwd() in all tools
    - headless runAgent with abort signal and usage tracking
    - TaskManager with queue, concurrency cap, budgets, tasks.json persistence
    - approvals queue with ask / auto_in_worktree / read_only policies
    - per-task git worktrees with diff, merge, and discard
    ```
22. Run `git_status` and confirm the tree is clean. Include the commit hash in your final report.
23. Only after the commit succeeds, move on to Spec 2.

## The Functionality

### 1. Agent context and the cwd refactor

Reference shape (adapt names to the codebase):

```ts
type AgentContext = {
  taskId?: string;                  // undefined for the legacy interactive session
  cwd: string;                      // absolute, already resolved
  signal: AbortSignal;
  state: StateAccessor;             // this task's session memory
  policy: ApprovalPolicy;
  budget: Budget;
  log: (entry: LogEntry) => void;
  requestApproval: (req: ApprovalRequest) => Promise<boolean>;
  callModel: typeof callModel;      // injectable so tests never hit the network
};
```

Requirements:

- No module under the tools, agent, or git code may read `process.cwd()` or `process.chdir()`. Only the entry point may.
- `resolveSafePath(path, cwd)` must reject paths that escape `cwd`, including `..` segments, absolute paths outside it, and **symlinks that resolve outside it**.
- Shell commands run with `cwd: ctx.cwd`.
- Two contexts with different `cwd` values must be able to run at the same time without affecting each other.
- The existing interactive session is routed through an `AgentContext` too, with `cwd` set once at startup and `policy: 'ask'`. Its behavior must not change.

### 2. Headless `runAgent`

- Signature along the lines of `runAgent({ goal, ctx, limits }) => Promise<RunResult>`, where `RunResult` is `{ outcome: 'done' | 'failed' | 'cancelled', summary?, usage, error? }`.
- No direct console, stdout, or stdin use. A lint rule or a test should enforce that.
- Honors `ctx.signal`: when aborted, the in-flight model call is cancelled, running shell commands are killed **including their child processes** (process group on POSIX, `taskkill /T` or equivalent on Windows), and the run returns `cancelled` promptly.
- Has a maximum step or turn limit (configurable) so a looping agent ends with a clear `failed` outcome (`error.code = 'max_steps'`).
- Records usage (input tokens, output tokens, cost, request count) after every model call and charges it to `ctx.budget`.
- The final assistant answer becomes `summary`.
- Errors are classified: retryable (network blips, 429) vs fatal (auth failure, invalid request). Retryable errors retry with backoff, fatal errors fail the run immediately.

### 3. Task model and status machine

```ts
type TaskStatus = 'queued' | 'running' | 'waiting_approval' | 'done' | 'failed' | 'cancelled';
type ApprovalPolicy = 'ask' | 'auto_in_worktree' | 'read_only';
type Isolation = 'worktree' | 'shared';
type ReviewState = 'none' | 'pending_review' | 'merged' | 'discarded' | 'conflict' | 'needs_attention';

type Task = {
  id: string;                       // short, unique, filesystem-safe
  goal: string;
  status: TaskStatus;
  statusDetail?: string;            // e.g. "rate limited, retrying in 30s"
  sessionId: string;                // reuses the existing state files
  parentId?: string;                // reserved for Spec 2; always undefined here
  depth: number;                    // 0 for root tasks; reserved for Spec 2
  cwd: string;                      // main directory or the task's worktree
  isolation: Isolation;
  policy: ApprovalPolicy;
  worktree?: { path: string; branch: string; baseRef: string; baseBranch: string };
  reviewState: ReviewState;
  usage: { inputTokens: number; outputTokens: number; cost: number; requests: number };
  summary?: string;
  error?: { code: string; message: string };
  resumable: boolean;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
};
// Runtime only, never persisted: abort: AbortController
```

Allowed status transitions (anything else is a bug and must throw):

| From | To |
|---|---|
| `queued` | `running`, `cancelled` |
| `running` | `waiting_approval`, `done`, `failed`, `cancelled` |
| `waiting_approval` | `running`, `cancelled` |
| `failed` (resumable) | `queued` (via `resume`) |
| `done`, `cancelled` | terminal |

### 4. `TaskManager` API and events

```ts
class TaskManager {
  create(goal: string, opts?: { policy?: ApprovalPolicy; isolation?: Isolation; readOnly?: boolean; budget?: Budget }): Task;
  get(id: string): Task | undefined;
  list(filter?: { status?: TaskStatus[] }): Task[];
  cancel(id: string): Promise<void>;
  resume(id: string): Task;
  listApprovals(): Approval[];
  resolveApproval(approvalId: string, decision: 'approve' | 'deny'): void;
  getLog(id: string, opts?: { fromSeq?: number; limit?: number }): LogEntry[];
  getDiff(id: string): Promise<TaskDiff>;
  merge(id: string, opts?: { message?: string }): Promise<MergeResult>;
  discard(id: string): Promise<void>;
  on(event: TaskEvent, handler: (payload: unknown) => void): () => void; // returns unsubscribe
  shutdown(opts?: { graceMs?: number }): Promise<void>;
}
```

Events (typed payloads): `task:created`, `task:status`, `task:log`, `task:usage`, `approval:requested`, `approval:resolved`, `task:review`.

- The manager is the **single source of truth**. Other code reads state through it and subscribes to events. It never reaches into UI code.
- Each task has an in-memory log (ring buffer, default 2,000 entries) **and** an append-only JSONL file on disk. `getLog` can page from disk for older entries. Log entries have a monotonically increasing `seq`.
- Event handlers that throw must not break the manager or other handlers.
- `create` with `readOnly: true` forces `policy: 'read_only'` and `isolation: 'shared'`.

### 5. Persistence and restart behavior

- Index file: `tasks.json` in a project-local state directory (for example `.agent/`). Per-task logs live next to it. Session memory continues to use the existing state files.
- **Atomic writes** (write to a temp file, then rename). A crash must never leave a half-written index. Writes are debounced or batched so a busy task does not hammer the disk.
- Include a `version` field in the index for future migrations.
- On startup, load the index and reconcile:
  - `queued` tasks go back into the queue.
  - Tasks that were `running` or `waiting_approval` when the process died become `failed` with `error.code = 'interrupted'` and `resumable: true`. Their pending approvals are discarded.
  - Tasks with a worktree whose directory has vanished get `reviewState: 'needs_attention'`.
  - Corrupt or unreadable index: back up the bad file, start empty, and log a warning. Never crash.
- `resume(id)` re-queues an interrupted task on its **same session** and **same worktree**, with a short note in context that it was interrupted.
- In this version, closing the process stops all running tasks. `shutdown()` should abort them gracefully, flush state, and mark them interrupted.

### 6. Queue, concurrency, and rate limits

- FIFO queue. Concurrency cap defaults to **2**, configurable (minimum 1). The cap must never be exceeded, including during races.
- Cancelling a `queued` task removes it immediately without ever starting it.
- Rate limits (HTTP 429): retry with exponential backoff and jitter, honor any `Retry-After` header, and set `statusDetail` (for example "rate limited, retrying in 30s"). While a rate-limit pause is active, the queue should not start more tasks. This matters because free-tier quotas are small and parallel agents exhaust them quickly.
- If a daily or total request limit is configured and reached, tasks fail with `error.code = 'quota_exhausted'` instead of retrying forever.

### 7. Budget

```ts
interface Budget {
  readonly limits: { maxTokens?: number; maxCost?: number; maxRequests?: number };
  readonly used: { tokens: number; cost: number; requests: number };
  canSpend(): boolean;
  record(delta: { tokens?: number; cost?: number; requests?: number }): void;
  remaining(): { tokens?: number; cost?: number; requests?: number };
}
```

- Every task has a budget. Defaults come from config (suggested: 60 requests, 1,000,000 tokens, and a cost cap if the provider reports cost).
- The check happens **before** each model call. If a hard limit is reached, the run ends with `failed` and `error.code = 'budget_exceeded'`.
- The `Budget` object is a plain shared object that can be passed to other tasks. This spec only uses one budget per task. Spec 2 will share one budget across a whole task tree, so do not hide it behind task-specific logic.

### 8. Approvals inbox and policies

**Approvals replace `pendingConfirm`.** When a tool needs a decision:

1. The tool calls `ctx.requestApproval({ tool, summary, risk, args, cwd })`.
2. The manager creates an `Approval` (`id`, `taskId`, tool, summary, risk, `createdAt`), sets the task to `waiting_approval`, and emits `approval:requested`.
3. The returned promise resolves `true` or `false` when `resolveApproval` is called. The task returns to `running`.
4. Cancelling a task auto-denies all its pending approvals.
5. Multiple approvals from multiple tasks can be pending at the same time.

**Fail closed.** The manager has an approvals mode: `inbox` (default when a UI is attached) or `deny_all` (headless, CI). With no approver available, every request resolves `false` immediately. Missing or unknown policy values are treated as `ask`, never as permissive. There is an optional `approvalTimeoutMs`, off by default. When it fires, the request is denied.

**Tool risk classes** (enforced in the tool layer, in code, not in the prompt):

| Class | Examples | Behavior |
|---|---|---|
| `read` | read file, list, grep, glob, `git_status`, `git_diff` | Never needs approval, always confined to `ctx.cwd` |
| `write` | write file, edit file, `git_add`, `git_commit` | Depends on policy |
| `exec` | shell | Depends on policy and command allowlist (see below) |
| `network` | web fetch or similar, if present | Always asks, regardless of policy |

**Policies:**

| Policy | Behavior |
|---|---|
| `ask` (default) | `write` and `exec` need approval |
| `auto_in_worktree` | `write` is auto-approved **only if** the task has an isolated worktree and the path is inside it. `exec` is auto-approved only for commands on the allowlist. Everything else asks. |
| `read_only` | Write and exec tools are **not exposed** to the model **and** are rejected in code if somehow called |

Important limit: worktree isolation controls where the file tools write. It does **not** sandbox the shell, since a command can `cd ..` or use absolute paths. For that reason `auto_in_worktree` only auto-approves shell commands that match a configurable allowlist (for example test runners, linters, build commands, and read-only git commands). Everything else still asks. Document this clearly.

If a task's `isolation` is `shared` (no worktree), `auto_in_worktree` is not available. It downgrades to `ask`.

### 9. Worktree isolation and review

**Default decision** (the user has not yet chosen, so implement the safe default and keep it configurable): write-capable tasks run in an **isolated git worktree on their own branch**. Read-only tasks share the main directory. Nothing changes the user's real working directory until the user explicitly merges.

On task start with `isolation: 'worktree'`:
- Verify the project is a git repository. If not, fall back to `isolation: 'shared'`, force policy `ask`, and set a visible `statusDetail` warning.
- Create `git worktree add <stateDir>/worktrees/<taskId> -b agent/task-<taskId>-<short-slug>` from the current `HEAD`. Record `baseRef` (commit SHA), `baseBranch`, and the worktree path in the task.
- Set `task.cwd` to the worktree path.
- Uncommitted changes in the main checkout are **not** visible in the worktree. Log a note about this when the main tree is dirty.

On task finish (`done`):
- If the worktree has uncommitted changes, make a checkpoint commit (`task <id>: <short goal>`). If the commit fails (for example a hook failure), set `reviewState: 'needs_attention'` and keep the details in `error`. Never bypass hooks.
- If the branch has changes relative to `baseRef`, set `reviewState: 'pending_review'`. If there are none, set `none` and clean up the worktree.

Review operations (these are **user actions only**, never exposed as agent tools):

| Operation | Behavior |
|---|---|
| `getDiff(id)` | Returns the diff and a file/line summary between `baseRef` and the task branch |
| `merge(id)` | Merges the task branch into the base branch in the main checkout using `--no-ff`. Requires a clean main working tree and that the main checkout is on `baseBranch`. On success: `reviewState: 'merged'`, remove worktree, delete branch. On conflict: run `git merge --abort`, set `reviewState: 'conflict'`, return the conflicted file list. |
| `discard(id)` | Removes the worktree and deletes the branch. Uses `branch -d` first. A forced delete is only used when the user explicitly confirms through the caller. Sets `reviewState: 'discarded'`. |

Safety rules for the internal git helper:
- Use argument lists, never shell strings.
- Only operate on worktrees under the state directory and only on branches with the `agent/` prefix. Refuse anything else, even if the caller passes it.
- Add the state directory (`.agent/` or equivalent) to `.gitignore`.
- On startup, detect orphaned worktrees and branches (present on disk but not in the index) and report them. Do not delete them automatically.

### 10. Configuration

One config source (use the project's existing config mechanism if there is one). Keys with suggested defaults:

| Key | Default |
|---|---|
| `concurrency` | `2` |
| `defaultPolicy` | `ask` |
| `defaultIsolationForWriteTasks` | `worktree` |
| `approvals` | `inbox` (TUI) / `deny_all` (headless) |
| `approvalTimeoutMs` | off |
| `maxStepsPerTask` | `50` |
| `budget.maxRequests` / `maxTokens` / `maxCost` | `60` / `1000000` / unset |
| `logBufferSize` | `2000` |
| `shellAllowlist` | test runners, linters, build commands, read-only git |

### 11. Test seams and demo script

- `callModel` is injectable through the context. Tests and the demo use a **scripted fake model** that returns canned responses and tool calls, so no test spends tokens or needs a key.
- The demo script creates several tasks (some read-only, some writing in a temp git repo), prints the event stream live, approves or denies requests from a simple prompt or flags, and prints a final summary table.

### 12. Security and hygiene

- Never write API keys or secrets into `tasks.json`, task logs, session state, error messages, or commit messages. Redact known secret env values from logged tool output.
- Truncate very large tool outputs in the log (keep full output only where it already lived, or cap it) so logs cannot grow without bound.
- Task ids and branch slugs are sanitized so goal text can never inject path segments or git options.

## The Things to Avoid

- **No `process.cwd()` or `process.chdir()`** anywhere outside the entry point.
- **No shell string execution.** All git and process calls use argument lists.
- **No global mutable state** for tasks, approvals, budgets, or the current directory.
- **Do not keep `pendingConfirm`** as a second approval path. One mechanism only.
- **Do not put restrictions only in the prompt.** Policies, read-only mode, path confinement, and budgets are enforced in code.
- **Do not let agents merge, discard, or remove worktrees.** These are user actions, not tools.
- **Do not use `git commit --no-verify`, `git push`, `git reset --hard`, `git clean`, or force deletes** except the explicit user-confirmed forced branch delete described above.
- **Do not touch branches that do not start with `agent/`**, and do not delete orphaned worktrees automatically.
- **Do not modify the user's real working directory** from a worktree task for any reason other than an explicit `merge`.
- **Do not build any dashboard or UI** in this spec. That is Spec 2.
- **Do not implement child tasks or recursion.** The `parentId` and `depth` fields are reserved only.
- **Do not add heavy dependencies.** Prefer the standard library and what the project already uses.
- **Do not break the existing interactive session.** It must behave exactly as before.
- **Do not swallow errors.** Failures should reach the task's `error` field and the log with real messages.
- **Do not commit** `.env`, `.agent/`, `tasks.json`, logs, worktrees, or secrets.

## The Things to Keep in Mind

- **This is the biggest refactor in the whole plan.** The cwd change touches every tool. Do it first, behind passing tests, before building anything on top of it.
- **Prove isolation with a test, not by assumption.** Two tasks writing the same relative filename in different cwds must not interfere.
- **Abort must be real.** Killing the model call is not enough. Child processes started by shell tools must die too, or cancelled tasks will keep running and editing files.
- **Races are the main risk.** The concurrency cap, approval resolution, cancel-while-starting, and cancel-while-waiting-for-approval all need explicit tests.
- **Free-tier limits are real.** With around 50 requests per day, parallel tasks can exhaust a quota within minutes. The queue, backoff, and request budget are not optional polish.
- **Dirty main tree.** Worktrees branch from `HEAD`, not from uncommitted work. This will surprise people, so surface it in logs and docs.
- **Interrupted is not failed-for-real.** Tasks interrupted by a restart are resumable and should be presented that way.
- **Windows.** Paths, process-tree killing, and symlink handling differ. Write platform-aware code and tests, or document known limits.
- **Child processes and listeners must be cleaned up** when a task ends, so long sessions do not leak handles or memory.
- **Design for Spec 2 without building it.** The event stream and `TaskManager` public API are what the dashboard will consume. Keep them clean, typed, and free of UI assumptions. The `Budget` object and the `parentId` and `depth` fields exist so Spec 2 can share budgets and build a task tree.
- **Keep names consistent** with the existing code. If the project already has a naming or error-handling convention, follow it.

## The End Result to Expect

### Deliverables

1. `AgentContext` threaded through all tools, with no `process.cwd()` left outside the entry point.
2. A headless `runAgent` with abort, usage tracking, step limits, and error classification.
3. The `Task` model, state machine, and `TaskManager` with events and a typed public API.
4. Atomic persistence (`tasks.json`, per-task logs) with restart reconciliation and resume.
5. A queue with a concurrency cap, backoff for rate limits, and a shareable `Budget`.
6. An approvals inbox with `ask`, `auto_in_worktree`, and `read_only` policies, enforced in code.
7. Per-task git worktree isolation with diff, merge, and discard.
8. A demo script, tests, updated docs, and `.gitignore` entries.
9. **A single commit containing all of the above.**

### Tests must cover

- **Context isolation:** two tasks with different cwds write the same relative path without interfering; `resolveSafePath` rejects `..`, outside absolute paths, and symlink escapes; a test or lint check fails if `process.cwd()` is used outside the entry point.
- **Headless run:** completes with a fake model; produces a summary and usage; writes nothing to stdout.
- **Abort:** cancelling mid-model-call and mid-shell-command stops both, including child processes, and the task ends `cancelled`.
- **State machine:** every allowed transition works and every disallowed one throws.
- **Queue and concurrency:** the cap is never exceeded under load; FIFO order; cancelling a queued task never starts it.
- **Rate limits:** a 429 triggers backoff with `statusDetail` set, the queue pauses, `Retry-After` is honored.
- **Budget:** hitting a request, token, or cost limit ends the task with `budget_exceeded`; a shared `Budget` object is charged by two runs.
- **Approvals:** request moves the task to `waiting_approval`; approve resumes it; deny returns a refusal the agent can see; cancel auto-denies pending requests; several approvals from several tasks coexist; `deny_all` mode fails closed.
- **Policies:** `read_only` hides write tools **and** rejects direct calls; `auto_in_worktree` approves in-worktree writes and allowlisted shell commands but still asks for others; `auto_in_worktree` downgrades to `ask` when there is no worktree; unknown policy values fail closed.
- **Persistence:** round-trip of tasks and logs; atomic write survives a simulated crash; corrupt index is backed up and recovered from; interrupted tasks become `failed` plus `resumable`; `resume` continues the same session and worktree.
- **Worktrees (temp git repos):** create, run, checkpoint commit, `pending_review`; `getDiff`; clean `merge`; conflicting `merge` aborts cleanly and reports files; `discard` removes worktree and branch; refuses to touch non-`agent/` branches; non-git directory falls back to `shared` with `ask`.
- **Secrets:** a planted fake API key never appears in `tasks.json`, logs, or errors.
- **Regression:** the existing interactive session and all previously passing tests still pass.

### Acceptance checklist

- [ ] The demo script runs several tasks in parallel, shows live events, and ends with correct statuses
- [ ] A cancelled task stops completely, including its subprocesses
- [ ] Two write tasks in the same repo never overwrite each other
- [ ] Nothing reaches the user's real working tree until `merge` is called
- [ ] Approvals from multiple tasks queue correctly and fail closed when no approver exists
- [ ] Restarting the process restores the task list, and interrupted tasks can be resumed
- [ ] No `process.cwd()` remains outside the entry point
- [ ] No secrets in any persisted file
- [ ] The existing interactive session works unchanged
- [ ] All tests pass and docs are updated
- [ ] **Everything is committed and `git_status` shows a clean tree**

### Final report from the implementing agent

When finished, reply with:

1. The commit hash and message
2. A list of files created or modified
3. How to run the tests and the demo script, and their results
4. Assumptions made or deviations from this spec, with the reason (especially the worktree default and the shell allowlist)
5. Known limitations (for example Windows caveats, dirty-main-tree behavior)
6. Confirmation that you are now starting **Spec 2**, or the reason you stopped