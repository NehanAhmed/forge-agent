# Spec: Add Task/Todo Tracking to the Agent

## The Goal

Give the agent a built-in todo list it can use to plan multi-step work and report progress as it goes. The list is saved per session and shown live in the TUI sidebar, so the user can see at a glance what the agent has done, what it is doing now, and what is left.

This makes long tasks easier for the agent to stay on track with and gives the user visibility without having to read the full transcript.

## The Task

1. **Study the existing codebase first.** Before writing anything, find out:
   - how tools are defined, registered, and tested
   - how sessions are created, stored, resumed, and deleted
   - how the TUI is structured, how the sidebar is rendered, and how other components get live updates (events, state store, message bus, etc.)

   Follow those existing patterns exactly. Do not invent a parallel mechanism.
2. **Add a todo data model and per-session storage** that lives with the rest of the session's persisted state.
3. **Implement two tools** in the project's existing tool structure:
   - `todo_write`: replaces the session's todo list
   - `todo_read`: returns the current todo list
4. **Render the todo list in the TUI sidebar**, updating live whenever the agent changes it.
5. **Teach the agent when and how to use the todo list** by adding concise guidance to the system prompt and writing clear tool descriptions.
6. **Add tests** for validation, persistence, session isolation, and sidebar rendering.
7. **Update documentation** (README or tool list) to describe the feature.

## The Functionality

### Data model

Each todo item has:

```json
{
  "id": "string",
  "content": "string",
  "status": "pending | in_progress | completed"
}
```

- Array order is display order.
- `id` is unique within the list. The agent may supply it, or the tool may assign one if omitted.
- `content` is a short, imperative description of the step (for example "Add git_commit tool").

### Storage and persistence

- Todos are stored **per session**, alongside that session's other persisted state, using the project's existing storage mechanism.
- Writes are atomic (write to a temp file and rename, or use a transaction) so a crash cannot corrupt the list.
- When a session is resumed, its todo list is restored exactly as it was, and the sidebar shows it immediately.
- A new session starts with an empty list.
- Deleting a session also deletes its todos.
- If stored todo data is missing or corrupted, fall back to an empty list and log a warning. Never crash the session.

### `todo_write`

- **Input:** `todos` (list of items as defined above). This **replaces the entire list**, which keeps updates atomic and easy for the model to reason about.
- **Validation (reject with a specific, actionable error message):**
  - at most **one** item may be `in_progress` at a time
  - `id` values must be unique
  - `status` must be one of the three allowed values
  - `content` must be non-empty after trimming, and no longer than 200 characters
  - list length must not exceed 50 items
- **Behavior:** on success, saves the list, notifies the UI, and returns the full updated list plus counts (for example `2 of 5 completed`), so the model always sees the current state.
- Passing an empty list clears the todos.

### `todo_read`

- **Input:** none.
- **Behavior:** returns the current list and counts. Returns a clear "no todos" message if the list is empty.

### Agent guidance (system prompt and tool descriptions)

The guidance should tell the agent to:

- use the todo list for tasks with **three or more distinct steps**, or when the user gives multiple tasks, and skip it for trivial single-step requests
- create the list **before** starting the work
- mark an item `in_progress` **before** beginning it, and `completed` **immediately** after finishing it, rather than batching updates at the end
- keep exactly one item `in_progress` at a time
- add new items when it discovers extra work, and remove items that are no longer relevant
- only mark an item `completed` when it is actually done, not when tests are failing or the work is partial

### TUI sidebar

- A "Tasks" section in the existing sidebar, showing items in order with a status marker:
  - pending: `○`
  - in progress: `◐` or `▶`, plus a distinct style (bold or accent color)
  - completed: `✓`, dimmed or struck through
- A progress summary in the section header, such as `Tasks (2/5)`.
- Updates **live** when `todo_write` succeeds, with no manual refresh and no waiting for the end of the turn.
- Long items are truncated with an ellipsis to fit the sidebar width. Long lists scroll or collapse sensibly instead of breaking the layout.
- Empty state: hide the section, or show a subtle "No tasks" line, whichever matches how other sidebar sections behave.
- Status must be readable **without color** (markers carry the meaning, color only reinforces it).
- The sidebar section is **read-only**. The user does not edit todos from it in this version.

### Non-TUI modes

If the agent runs headless or in a mode with no sidebar, the tools still work and still persist. The UI notification must be a no-op when no UI is attached.

## The Things to Avoid

- **Do not share todos across sessions.** No global or module-level singleton holding the list.
- **Do not allow more than one `in_progress` item.** Reject it instead of silently fixing it.
- **Do not let the UI block the agent loop.** Rendering and notification must not slow down or stall tool execution.
- **Do not write to disk on every render.** Persist only when `todo_write` succeeds.
- **Do not build a second event or state system.** Use the project's existing one for UI updates.
- **Do not add scope the spec doesn't ask for.** No priorities, due dates, subtasks, tags, user-editable sidebar, or keyboard shortcuts in this version.
- **Do not add heavy new dependencies** for storage or rendering.
- **Do not refactor or restyle unrelated parts of the sidebar or TUI.** Keep the diff focused.
- **Do not rely on color alone** to communicate status.
- **Do not swallow errors.** Validation failures must return a clear message to the agent so it can fix its call.

## The Things to Keep in Mind

- **Consistency beats cleverness.** If the project already has a pattern for tools, session storage, or sidebar sections, use it, even if you would normally choose differently.
- **The agent is the main user of the tools.** Tool names, parameters, error messages, and descriptions are what the LLM reads, so keep them short and unambiguous. Validation errors should say exactly what to change (for example "Only one todo can be in_progress; found 2: ids a, c").
- **Whole-list replacement is intentional.** It prevents partial-update drift and keeps the tool surface small. The cost is that the agent must resend the full list each time, so keep the 50-item and 200-character limits.
- **Context cost.** The write result echoes the full list so the model always has current state. Keep that output compact.
- **Concurrency.** Tool execution and UI rendering may run on different threads or tasks. Make sure reads and writes of the todo state are safe.
- **Terminal quirks.** Handle narrow widths, wide (CJK) characters, and terminals without Unicode support (fall back to ASCII markers like `[ ]`, `[~]`, `[x]` if the project already has such a fallback).
- **Session lifecycle.** If the project supports forking, branching, or exporting sessions, decide how todos behave there and follow the existing session model. Note the choice in your final report.
- **Schema evolution.** Store a small version field with the persisted data so the format can change later without breaking old sessions.
- **Subagents.** If the project has subagents or nested agents, todos belong to the session by default. Note any assumption you make.

## The End Result to Expect

### Deliverables

1. Todo data model with per-session, atomic persistence.
2. `todo_write` and `todo_read` tools, registered and available to the agent, with clear descriptions and input schemas.
3. A "Tasks" section in the TUI sidebar that updates live.
4. System prompt guidance on when and how to use the todo list.
5. Tests (see below).
6. Updated documentation.

### Tests must cover

- **Validation:** two `in_progress` items rejected, duplicate ids rejected, invalid status rejected, empty or over-long content rejected, more than 50 items rejected, empty list clears todos.
- **Persistence:** write, then restart or resume the session, then the same list is restored; corrupted storage falls back to an empty list without crashing.
- **Isolation:** two sessions have independent todo lists; deleting a session removes its todos.
- **Tool results:** `todo_write` returns the full updated list and counts; `todo_read` matches the last write; `todo_read` on an empty list returns a clear message.
- **Sidebar rendering:** each status marker, the progress count in the header, truncation of long items, the empty state, and a re-render when the todo list changes (snapshot or component tests, following the project's TUI testing approach).
- **Headless mode:** tools work and persist with no UI attached.

### Acceptance checklist

- [ ] Agent can create a list, mark items `in_progress` and `completed`, and the sidebar reflects each change immediately
- [ ] Todos survive quitting and resuming the session
- [ ] A new session starts with no todos, and sessions never see each other's lists
- [ ] Invalid writes are rejected with specific, actionable errors
- [ ] Status is understandable in a terminal with colors disabled
- [ ] Works in headless mode without errors
- [ ] No parallel state or event system was introduced
- [ ] All new and existing tests pass
- [ ] Docs and system prompt updated
- [ ] The diff touches only what this feature needs

### Expected agent behavior after the change

> **User:** "Add dark mode to the settings page, update the tests, and bump the version."
> **Agent:** calls `todo_write` with three items (first `in_progress`, others `pending`), does the first task, calls `todo_write` again to mark it `completed` and the second `in_progress`, and continues until all items are `completed`. The sidebar shows the list updating at each step, and the user sees `Tasks (3/3)` when done.

### Final report from the implementing agent

When finished, reply with:

1. A list of files created or modified
2. How to run the tests, and their results
3. Any assumptions made or deviations from this spec, with the reason (especially around session forking and subagents)
4. Any follow-up suggestions (for example, user-editable todos or per-item notes as later additions)