# Spec 2 of 2: Dashboard TUI and Child Tasks

> Part of the multi-agent workflow. This spec builds on **Spec 1** (task engine, approvals inbox, worktree isolation). It adds the dashboard where the user types a goal and watches tasks run, plus child tasks, so a task can spin up its own sub-tasks with strict guardrails.
>
> **Execution order:** Spec 1 must be complete and committed before you start this one. When this spec is done, run the tests and **commit everything**.
>
> Names such as `TaskManager`, `AgentContext`, `Budget`, `runAgent`, and `spawn_sub_agent` refer to Spec 1 and the current codebase. Verify each one exists and adapt to the real names and signatures.

## The Goal

Make tasks **visible and controllable**, and let them **grow into trees**.

After this spec, the user opens the TUI, types a goal in plain text, and it becomes a task that runs in the background. A dashboard shows every task with its status, a live log for the selected task, an approvals inbox, and review controls for finished work. A running task can also spawn child tasks, which appear nested under their parent, share one budget, and can never exceed hard limits on depth, count, or spend.

The feel should be a local, coding-focused version of an always-on agent dashboard: type a goal, watch it run, approve what needs approval, review the result.

## The Task

Work in the phases below, in order. Each phase should leave the project building and the tests passing.

**Phase 0: Preflight (required)**
1. Run `git_status`. The working tree must be clean, and Spec 1 must already be committed. Confirm that `TaskManager`, the approvals inbox, `Budget`, and worktree isolation exist and that their tests pass.
2. If anything from Spec 1 is uncommitted, missing, or failing, **stop and report it** instead of building on top of it.
3. Study the TUI: its framework, how `App` holds the `entries` state, how input is handled, how the existing sidebar is rendered, and how components are tested.

**Phase 1: Move TUI state onto the `TaskManager`**
4. Replace the `entries` state in `App` with per-task logs owned by the `TaskManager`. The UI subscribes to events instead of owning the conversation.
5. Define a small `TaskClient` interface that the TUI uses to talk to the engine (see below), and give the in-process `TaskManager` an implementation of it.

**Phase 2: Dashboard**
6. Build the layout: task list, selected task's live log, approvals inbox, and one input line.
7. Add the command parser and all commands.
8. Add review controls for finished worktree tasks (diff, merge, discard).

**Phase 3: Child tasks**
9. Add the `spawn_task`, `wait_for_tasks`, and `get_task` tools.
10. Add the guardrails: depth, children count, tree size, shared budget, policy inheritance, and cascading cancel.
11. Add the per-worktree write lock and the slot-release rule that prevent deadlocks and clobbered files.
12. Show task trees in the dashboard.

**Phase 4: Tests, docs**
13. Write the tests listed under "The End Result to Expect".
14. Update the README and any developer docs, including a short "how to use the dashboard" section.

**Phase 5: Commit (required)**
15. Run the full test suite. Do not commit if it fails because of your changes.
16. Review your work with `git_status` and `git_diff`.
17. Stage **explicit paths** with `git_add` (source, tests, docs, `.gitignore` if changed). Do not stage `.env`, `.agent/`, `tasks.json`, logs, worktrees, `node_modules`, or build output.
18. Check the staged diff, then commit everything from this spec with `git_commit` using this message (adjust the body to match what you did):

    ```
    feat(tasks): add dashboard TUI and child task orchestration

    - dashboard with task tree, live log, approvals inbox, and one input
    - slash commands: open, cancel, approve, deny, diff, merge, discard, resume
    - TUI state moved from App into TaskManager logs via TaskClient interface
    - spawn_task / wait_for_tasks / get_task with depth, count, and tree budget limits
    - per-worktree write lock and slot release to prevent deadlocks
    ```
19. Run `git_status` and confirm the tree is clean. Include the commit hash in your final report.

## The Functionality

### 1. The `TaskClient` interface

The TUI must depend only on this interface, never on `TaskManager` internals. That keeps the door open for a background daemon later, where the TUI becomes a remote client.

```ts
interface TaskClient {
  createTask(goal: string, opts?: { readOnly?: boolean; isolation?: 'worktree' | 'shared'; policy?: ApprovalPolicy }): Promise<Task>;
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
```

An in-process implementation wraps `TaskManager`. Nothing outside that adapter imports `TaskManager` directly.

### 2. Task numbering

- Add a human-friendly `displayId` to each task: root tasks are `1`, `2`, `3`, children are `3.1`, `3.2`, and so on. Numbers are assigned at creation, persisted, and never reused within the project's task history.
- Commands accept `3`, `#3`, or `3.1`. Real ids remain internal.
- Existing tasks from Spec 1 that lack a `displayId` are backfilled in creation order on load.

### 3. Dashboard layout

```
┌ Tasks (2 running, 1 waiting) ┬ #3 Add dark mode · running · agent/task-3 · $0.04 ───┐
│ ▶ 1  Fix lint errors      ✓  │ ▸ assistant: I'll start by looking at the settings…  │
│ ▶ 2  Update tests         …  │ ▸ tool: read_file settings.tsx (84 lines)            │
│ ▶ 3  Add dark mode        ⚠  │ ▸ tool: edit_file settings.tsx   ← approval pending  │
│   ├ 3.1 Audit theme usage ✓  │                                                      │
│   └ 3.2 Write theme tests ▶  │ ┌ Approval #3 ─────────────────────────────────────┐ │
│                              │ │ edit_file settings.tsx  (write)   /approve 3     │ │
│                              │ └──────────────────────────────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────────────────────────────┘
 ⚠ 1 approval · 3 tasks running · queue: 1                       (/help for commands)
 > type a goal and press Enter…
```

**Left: task list**
- Tree view with indentation for child tasks, ordered by creation time, newest at the bottom (or top, matching the project's convention).
- Each row shows: display number, truncated goal, a status glyph, and optionally elapsed time and cost.
- Status glyphs (with ASCII fallbacks if the project already supports them): queued `…`, running `▶` (animated or static), waiting approval `⚠`, done `✓`, failed `✗`, cancelled `⊘`.
- A parent row also shows an **aggregate** (descendant count, total cost) when collapsed.
- Rows needing attention are visually distinct: waiting approval, review pending, failed.
- Highlight the selected task. Arrow keys move the selection when the list has focus.

**Right: task detail**
- Header: display number, goal, status, `statusDetail` (for example "rate limited, retrying in 30s"), branch name, usage and budget (for example `$0.04 · 12/60 requests`), and review state.
- Live log: assistant text, tool calls and truncated results, approval requests and outcomes, errors, and the final summary.
- **Auto-follow** the tail while the user is at the bottom. If the user scrolls up, stop following and show a "new output below" indicator. Scrolling uses PageUp, PageDown, and the mouse wheel if the TUI supports it.
- Long tool outputs are truncated in view with a note such as "(+212 lines, full output in task log)".
- For worktree tasks that have finished: a review banner such as `Review: 4 files changed (+86 −12) · /diff · /merge · /discard`.

**Footer and input**
- A status line with counts (running, waiting, queued, approvals pending).
- **One input line.** Plain text creates a new root task. Anything starting with `/` is a command. `Tab` moves focus between the list and the input.
- Terminal bell on approval requests and task completion is optional and **off by default**, controlled by config.

### 4. Commands

| Command | Behavior |
|---|---|
| plain text | Create a new task with that goal using the default policy and isolation |
| `/new [--read-only] [--shared] [--policy ask\|auto_in_worktree\|read_only] <goal>` | Create a task with explicit options |
| `/open <n>` | Select a task and show its log |
| `/cancel <n>` | Cancel a task. For a parent, cancels all its descendants too. Ask for confirmation when it has running descendants. |
| `/approve <n>` | Approve the oldest pending request for task `n` |
| `/approve all` | Approve every pending request. Requires an explicit confirmation step. |
| `/deny <n>` | Deny the oldest pending request for task `n` |
| `/diff <n>` | Show the task's diff (file summary, then patch) in the detail pane |
| `/merge <n>` | Merge the task's branch into the base branch. Shows the result, including conflicts. |
| `/discard <n>` | Discard the task's worktree and branch. Asks for confirmation. |
| `/resume <n>` | Resume an interrupted task |
| `/collapse <n>`, `/expand <n>` | Collapse or expand a task's children in the list |
| `/help` | List commands |
| `/quit` | Exit. If tasks are running, ask for confirmation and then call `shutdown()`, which marks running tasks as interrupted and resumable. |

Command rules:
- Unknown commands and bad arguments give a clear one-line error. They never create a task by accident.
- `/merge`, `/discard`, and `/approve all` are the only commands that need a confirmation step.
- Parsing lives in a pure, separately tested module.

### 5. Approvals inbox in the UI

- Pending approvals are visible in two places: inline in the selected task's log, and in a compact inbox summary in the footer (`⚠ 2 approvals`). Optionally, a key (for example `a`) opens an inbox overlay listing all pending approvals across all tasks.
- Each approval shows: task number (and path, such as `3 › 3.1`), tool, a one-line summary, risk class, and for file edits a short diff preview if it is cheap to produce.
- Resolving from anywhere (command or inbox keys) calls `resolveApproval`. The UI updates when the `approval:resolved` event arrives, not optimistically.
- If a task is cancelled, its approvals disappear from the inbox.

### 6. Rendering and performance

- Subscribe to events and **batch** UI updates (for example every 30 to 60 ms) so a chatty task cannot freeze the TUI.
- The UI keeps only a bounded window of log entries per task (default 2,000) and pages older entries from `getLog` when scrolled back.
- Rendering must not block the event loop or the agents.
- On terminal resize, the layout recomputes cleanly. Handle narrow terminals by collapsing the left pane to numbers and glyphs, or by showing one pane at a time.
- Status must be understandable **without color**. Glyphs carry meaning, and color only reinforces it.

### 7. Child tasks: the tools

These are new agent tools, separate from `spawn_sub_agent`, which stays as it is (a blocking, read-only helper inside a task).

**`spawn_task`**
- Input: `{ goal: string, readOnly?: boolean }`
- Creates a child task (`parentId` set, `depth + 1`) and returns **immediately** with `{ id, displayId }`. The parent keeps working while the child runs.
- The model **cannot** choose a higher privilege than its own. It may only restrict (`readOnly: true`). Policy and isolation are inherited and enforced in code.

**`wait_for_tasks`**
- Input: `{ ids: string[], timeoutMs?: number }`
- Blocks until all listed child tasks are terminal (or the timeout hits) and returns each child's `status`, `summary`, and `error`. It may only wait on the caller's own descendants.

**`get_task`**
- Input: `{ id: string }`
- Returns the status, usage, and summary (if any) of one of the caller's descendants, without blocking.

Tool errors are specific and actionable, for example: `"Cannot spawn: max depth 2 reached"` or `"Cannot spawn: this task already has 4 children (limit 4)"`.

### 8. Child tasks: guardrails (all enforced in code)

| Guardrail | Default | Notes |
|---|---|---|
| `maxDepth` | `2` | Root is depth 0. At the limit, `spawn_task` is not exposed to the model **and** is rejected if called. |
| `maxChildrenPerTask` | `4` | Counts all children ever spawned by that task, not just live ones. |
| `maxTasksPerTree` | `10` | Total tasks in one tree, root included. |
| Shared budget | one `Budget` per tree | See below. |
| Policy inheritance | child ≤ parent | A child can be stricter than its parent, never more permissive. |
| Cancel cascade | parent → descendants | Cancelling a child never cancels its parent. |

**Shared budget.** The root task creates the tree's `Budget`. Every descendant charges the **same** object, so a runaway tree cannot burn more than the root's limit. A child may optionally have a smaller sub-limit, but never above what remains. When the tree budget is exhausted, every non-terminal task in that tree is stopped with `error.code = 'budget_exceeded'`, and parents waiting on children are woken with the failure so they can report it.

**Policy inheritance.** The order from most to least strict is `read_only`, `ask`, `auto_in_worktree`. A child's effective policy is the stricter of the requested one and its parent's.

**Isolation inheritance.** Children run in their **parent's cwd** (the same worktree, if there is one). They do not get their own worktrees. This keeps review simple: **one tree equals one branch equals one diff equals one merge**. The root task owns the review state, and merging the root merges everything the tree did.

### 9. Child tasks: preventing deadlocks and clobbered files

Two coordination rules are required. Both need dedicated tests.

**Rule A: per-cwd write lock.**
- Read-only tasks never take the lock and run in parallel.
- A write-capable task must hold the lock for its cwd to run. If it is unavailable, the task stays `queued` with `statusDetail: 'waiting for worktree lock'`.
- A task holds the lock from when it starts until it finishes, **except** while it is inside `wait_for_tasks`, when it releases it.
- Result: a parent can spawn several write-capable children and wait. Those children run **one at a time** through the lock, so no two agents ever write to the same directory at once.

**Rule B: slot release.**
- A task blocked in `wait_for_tasks` **releases its concurrency slot** and, once its children are done, re-enters the queue **ahead of** other queued root tasks.
- Queued children are scheduled ahead of queued root tasks.
- Result: with a low concurrency cap (for example 2), a parent waiting on queued children can never starve them. No tree can deadlock itself.

While a task waits on children, its status stays `running`, with `statusDetail: 'waiting for children (2/3 done)'`.

### 10. Persistence and restart with trees

- `parentId`, `depth`, `displayId`, and the tree's budget usage are persisted.
- On restart, the tree is rebuilt from the index. Interrupted tasks in a tree are resumable.
- Resuming a parent that was waiting on children re-enters the wait with each child's current state. Children that already finished are not re-run.
- If the tree budget was already exhausted before the restart, resuming says so instead of starting work that will immediately fail.

### 11. Configuration additions

| Key | Default |
|---|---|
| `children.maxDepth` | `2` |
| `children.maxPerTask` | `4` |
| `children.maxPerTree` | `10` |
| `ui.bell` | `false` |
| `ui.logWindow` | `2000` |
| `ui.renderBatchMs` | `50` |

## The Things to Avoid

- **Do not let the TUI import `TaskManager` internals.** Use `TaskClient` only.
- **Do not keep conversation state in `App`.** One source of truth: the manager's per-task logs.
- **Do not update the UI optimistically** for approvals, merges, or cancels. Wait for the event.
- **Do not let a child exceed its parent's privileges.** Never accept a policy or isolation parameter from the model that would loosen anything.
- **Do not give children their own worktrees** in this version. One tree is one branch.
- **Do not allow unbounded recursion.** Depth, count, and tree-size limits are hard limits enforced in code, not suggestions in the prompt.
- **Do not let children spend outside the shared budget.** There must be no second budget path.
- **Do not let two write-capable tasks touch the same cwd at the same time.**
- **Do not let a waiting parent hold a concurrency slot or the write lock.**
- **Do not auto-merge or auto-discard.** Those happen only by explicit user command and confirmation.
- **Do not build the daemon.** Only keep the `TaskClient` seam that makes it possible later.
- **Do not add scope beyond this spec.** No follow-up messages to running tasks, task editing, drag-and-drop, theming systems, or notifications beyond the optional bell.
- **Do not break the existing sub-agent.** `spawn_sub_agent` keeps its current behavior.
- **Do not let a noisy task freeze the UI.** No unbatched re-render per log entry.
- **Do not commit** `.env`, `.agent/`, `tasks.json`, logs, worktrees, or secrets.

## The Things to Keep in Mind

- **The dashboard is a view.** It renders state and sends commands. All real logic (limits, locks, budgets, policy) lives in the engine, where tests can reach it without a terminal.
- **Make the pure parts pure.** The command parser, the tree builder (flat tasks to nested rows), the log windowing, and the aggregate calculations should be plain functions with their own unit tests.
- **Deadlocks hide in small caps.** Test with concurrency `1` and `2`, parents waiting on several children, children that themselves spawn children, and cancels at every moment.
- **Cancel cascades must be complete.** After cancelling a parent, no descendant may keep running, keep a lock, hold a slot, or leave an approval in the inbox.
- **Quota is the real limit.** A tree of agents burns requests fast. The shared budget and rate-limit pause from Spec 1 are what keep this usable, so show remaining budget in the UI where the user can see it.
- **Approvals can pile up.** Make the count prominent so the user notices when agents are blocked waiting on them.
- **One merge, one review.** Because children share the root's worktree, the review banner and `/merge` belong to the root. Children show `review: part of #3`.
- **Terminal differences.** Test narrow widths, no-color terminals, and terminals without Unicode support, if the project supports fallbacks.
- **Naming matters to the model.** `spawn_task`, `wait_for_tasks`, and `get_task` descriptions should tell the agent when to use them (parallelizable, well-defined sub-goals), when not to (trivial steps, or work that depends on its own unfinished edits), and that spending is shared.
- **Keep the system prompt guidance short.** Tell the agent that child tasks share its budget and its directory, that write-capable children run one at a time, and that it should usually wait for results before finishing.
- **Name consistency.** Follow the existing code's conventions for components, hooks, and state management.

## The End Result to Expect

### Deliverables

1. A `TaskClient` interface with an in-process adapter, and a TUI that depends only on it.
2. A dashboard with task tree, live log, approvals inbox, review controls, status footer, and one input.
3. All commands listed above, with a separately tested parser.
4. `spawn_task`, `wait_for_tasks`, and `get_task` tools, with all guardrails enforced in code.
5. The per-cwd write lock and the slot-release rule.
6. Tree-aware persistence, restart, and resume.
7. Tests, updated docs, and a short usage guide.
8. **A single commit containing all of the above.**

### Tests must cover

**Pure logic**
- Command parser: every command, aliases (`3`, `#3`, `3.1`), flags on `/new`, bad input, unknown commands.
- Tree builder: nesting, ordering, collapse and expand, aggregate cost and counts.
- Log windowing: bounded window, paging older entries, tail-following behavior.

**Dashboard (component or snapshot tests, following the project's approach)**
- Each status glyph, the parent aggregate row, and the review banner.
- Selecting a task shows its log; typing plain text creates a task; slash commands call the right `TaskClient` methods.
- Approvals appear inline and in the footer, `/approve` and `/deny` resolve them, and cancelled tasks' approvals vanish.
- Confirmation steps for `/merge`, `/discard`, `/approve all`, and `/quit` with running tasks.
- Batching: a burst of 1,000 log events does not produce 1,000 renders, and the final state is still correct.
- Narrow terminal and no-color rendering.

**Child tasks (engine level, with a scripted fake model)**
- `spawn_task` returns immediately, and the child runs while the parent continues; `wait_for_tasks` returns summaries; `get_task` reports status without blocking.
- Depth limit: `spawn_task` is hidden at max depth and rejected if called anyway.
- Children-per-task and tasks-per-tree limits are enforced with clear errors.
- **Shared budget:** parent and children charge one `Budget`; exhausting it stops every non-terminal task in the tree and wakes waiting parents with the failure.
- **Policy inheritance:** a child can never be more permissive than its parent; a model-supplied parameter cannot loosen anything.
- **Cancel cascade:** cancelling a parent stops all descendants, releases locks and slots, and clears their approvals; cancelling a child leaves the parent running.
- **Write lock:** two write-capable children run strictly one at a time; read-only children run in parallel; no two writers ever hold the same cwd.
- **Slot release:** with concurrency `1`, a parent that spawns two children and waits does not deadlock.
- **Nested trees:** a child that spawns its own child works up to the depth limit.
- **Restart:** a tree with an interrupted parent and mixed child states is rebuilt correctly and resumes without re-running finished children.
- **Review:** merging the root merges the whole tree's work in one diff; children show `part of #n`.
- **Regression:** `spawn_sub_agent`, the existing session behavior, and all Spec 1 tests still pass.

### Acceptance checklist

- [ ] Typing a plain goal in the TUI creates a task that runs in the background and appears in the list
- [ ] The selected task's log streams live and follows the tail unless the user scrolls up
- [ ] Approvals from several tasks show up in one inbox and can be resolved by command
- [ ] A finished worktree task shows a review banner, and `/diff`, `/merge`, and `/discard` work
- [ ] A task can spawn children, which appear nested and share one budget
- [ ] Depth, count, tree-size, and budget limits stop runaway trees
- [ ] A cancelled parent leaves no running descendants, held locks, or pending approvals
- [ ] Two write-capable children never write to the same directory at the same time
- [ ] A low concurrency cap never deadlocks a tree
- [ ] The TUI depends only on `TaskClient`
- [ ] Closing and reopening the TUI restores the tree, and interrupted tasks can be resumed
- [ ] `spawn_sub_agent` and the Spec 1 behavior are unchanged, and all tests pass
- [ ] Docs and usage guide updated
- [ ] **Everything is committed and `git_status` shows a clean tree**

### Expected behavior after the change

> **User** types: `Add dark mode to the settings page and update the tests`
> The task appears as `#3` and starts. It spawns `3.1` (read-only: audit current theme usage) and `3.2` (write-capable: write theme tests), then calls `wait_for_tasks`. `3.1` finishes in parallel, `3.2` runs after the parent releases its lock, and the parent resumes with both summaries. An edit needs approval, so the footer shows `⚠ 1 approval`. The user types `/approve 3`. When the task finishes, the banner reads `Review: 6 files changed (+142 −9)`. The user types `/diff 3`, reads it, then `/merge 3`. The merge lands on the base branch, and the worktree and branch are removed.

### Final report from the implementing agent

When finished, reply with:

1. The commit hash and message
2. A list of files created or modified
3. How to run the tests and how to launch the dashboard, plus the test results
4. Assumptions made or deviations from this spec, with the reason (especially around the lock, slot release, and shared-worktree children)
5. Known limitations
6. Suggested follow-ups (for example: messaging a running task, write-capable children with their own worktrees, and the background daemon that would make this always-on)