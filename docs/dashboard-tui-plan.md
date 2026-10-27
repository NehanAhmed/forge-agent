# Dashboard TUI Rebuild — Implementation Plan & Progress

Status: **implemented (automated checks passing; manual PTY pass pending)**

> Verification note: `npm run build` and `npm test` pass. Component tests exercise
> initial selection, arrow navigation, log switching, help routing and confirm
> isolation. Layout math is unit-tested at 120x40, 80x24 and 50x12. A manual
> pseudo-terminal smoke test (resize, real paste, live approvals, exit restore)
> still belongs in the release checklist.
Owner: Forge
Scope: `src/cli/components/dashboard/**`, `src/ui/**`, `src/core/{task-manager,task-client,headless,config}.ts`, `src/cli/app.tsx`, tests, README.

This document is the single source of truth for the dashboard rebuild. Update the
checkboxes as work lands. Each phase must build and test cleanly before moving on.

---

## 1. Goals

1. Arrow keys, focus, selection and task-log navigation work immediately, with no
   hidden mode.
2. A clean, calm, low-density dashboard: one-line rows, compact logs, no redundant
   borders, no walls of text.
3. Responsive layout: usable at 120x40, 80x24 and 50x12; never push input off-screen.
4. All dashboard functionality reachable: create, select, expand/collapse, cancel,
   resume, approve/deny, approve all, diff, merge, discard, filter, help, quit.
5. Correct data: live status/usage, truthful queue/rate-limit state, no refetch storms.
6. Safe lifecycle: graceful shutdown, alternate screen restored, no unhandled
   rejections, no post-unmount writes.
7. Accessible: semantic colors, `NO_COLOR`, ASCII mode, focus not conveyed by color
   alone, ARIA labels/roles, screen-reader friendly linear mode.
8. Fast: streaming deltas coalesced, selected log only, virtualized list/log.

Non-goal: native mouse clicks. Ink 7 exposes no mouse API. Keyboard is the supported
input path; clicking is documented as unsupported rather than faked with fragile
stdin hacks.

---

## 2. Root causes (audit)

| Symptom | Cause | Location |
|---|---|---|
| Arrow keys appear dead | focus defaults to input; arrows only handled when focus === 'list'; no focus cue | `Dashboard.tsx` |
| Detail pane always empty | `selectedId` starts `null` | `Dashboard.tsx` |
| Selection jumps/skips | navigation walks flat newest-first `tasks`, list renders oldest-first tree rows | `Dashboard.tsx` vs `tree-builder.ts` |
| Clicking impossible | Ink 7 has no `onPress`/mouse API | `TaskTree.tsx` |
| Approvals invisible | `ApprovalsInbox` imported but never rendered | `Dashboard.tsx` |
| Commands silently no-op | `approve_all`, `diff`, `collapse`, `expand` have no switch cases | `Dashboard.tsx` |
| Broken on resize / 80x24 | hardcoded 40/80/30 widths, fixed 30-entry window | `Dashboard.tsx`, `TaskDetail.tsx` |
| Lag while streaming | every token becomes a log entry + sync disk append + full re-render | `headless.ts`, `task-manager.ts` |
| Misleading footer | `queueLength=0`, `rateLimited=false` hardcoded | `Dashboard.tsx` |
| Unsafe confirm | global `y`/`n` even while typing; no target/consequence | `Dashboard.tsx` |
| Text-heavy log | margin per entry, wrapped blocks, naive truncation | `TaskDetail.tsx` |
| Poor accessibility | all idle rows dim, color-only status, no NO_COLOR/ARIA | `TaskTree.tsx`, `app.tsx` |
| Tasks survive exit | no shutdown; manager constructed during render | `app.tsx` |

---

## 3. Target UX

### Layout (wide, >= 64 columns)

```
forge   ● 1 running   ⚠ 1 waiting   ✓ 4 done                        ? help
──────────────────────────────────────────────────────────────────────────
❯ ▶ 4   Fix login race condition            3s        │  #4 Fix login race condition
  ✓ 3   Add dark mode                                  │  running · 12s · 8 req · $0.04
  ▸ 2   Refactor auth                                  │  ─────────────────────────────
      ✓ 2.1  Extract session guard                     │  14:32:05  ⚡ read_file src/auth.ts
      ⚠ 2.2  Update tests                              │  14:32:06  ✓ 42 lines
                                                       │  14:32:08  Fixing the guard…
──────────────────────────────────────────────────────────────────────────
❯ type a goal or /help                                   (input)
↑↓ select · ←→ fold · enter open · a approvals · ? help  (context keys)
```

### Layout (narrow, < 64 columns)

One pane at a time. `Enter` opens detail; `Esc` returns to the list.

```
forge  ●1 running  ⚠1                ? help
❯ ▶ 4  Fix login race          3s
  ✓ 3  Add dark mode
  ▸ 2  Refactor auth
↑↓ select · enter open · ? help
❯ _
```

### Too small (< 50 cols or < 10 rows)

```
forge — terminal too small (need at least 50x10)
q quit · ? help
```

### Task row anatomy (always one line)

`[caret] [indent] [tree glyph] [displayId] [status glyph] [goal…] [meta]`

- `❯` marks selection; bold + accent as reinforcement.
- Cost only when non-zero and `ui.showCost`.
- `statusDetail` never in rows.
- Cell-accurate truncation; rows can never wrap.
- Attention rows get a warning glyph plus readable text (not just color).

### Detail header (max 2 lines)

```
#4 Fix login race condition                         ▶ running
12s · 8 req · $0.04 · wt/4-fix-login
```

Status detail, review badge, summary and error appear only when present.

### Log

```
14:32:05  ⚡ read_file src/auth.ts
14:32:06  ✓ 42 lines
14:32:08  Fixing the guard…
```

One line per event in compact mode; `v` switches to wrapped multi-line entries.
Follow-tail is explicit; scrolling pauses it; `End`/`f` resumes.

---

## 4. Keymap

| Context | Keys | Action |
|---|---|---|
| Global | `Tab` / `Shift+Tab` | cycle list <-> input (detail returns to list) |
| Global | `↑` / `↓` | move selection (list/input) or scroll log (detail) |
| Global | `PgUp` / `PgDn` | scroll log |
| Global | `?` (not while typing) | help overlay |
| Global | `Ctrl+C` | quit; confirm if work is active |
| Global | `Esc` | close overlay -> blur input -> back to list |
| List | `j`/`k`, `Home`/`End`, `g`/`G` | move / first / last |
| List | `←`/`h`, `→`/`l` | collapse / expand |
| List | `Enter` | open detail |
| List | `a` | approvals overlay |
| List | `c` / `r` / `m` / `x` | cancel / resume / merge / discard (confirm where destructive) |
| List | `s` | cycle filter: all -> active -> attention |
| List | `/` | focus input with `/` |
| List | `q` | quit (confirm if work is active) |
| Detail | `j`/`k`, `PgUp`/`PgDn`, `g`/`G` | scroll / page / top-bottom |
| Detail | `f` | toggle follow tail |
| Detail | `v` | toggle compact/verbose log |
| Detail | `Esc` | back to list |
| Input | printable | edit (TextInput) |
| Input | `Enter` | submit (guarded against double submit) |
| Input | `Esc` | blur to list |
| Input | `Ctrl+P` / `Ctrl+N` | history |
| Input | `Ctrl+U` | clear line |
| Approvals | `↑`/`↓`, `Enter`/`y`, `n`/`x`, `A`, `Esc` | select / approve / deny / approve all / close |
| Approvals (confirm all) | `y` approve all; `n`/`x`/`Esc` cancel | Enter and other keys are ignored until y/n |
| Confirm | `y` confirm; `n`/`Esc`/`Enter` cancel | only the confirm prompt handles these keys |
| Diff | `↑`/`↓`, `PgUp`/`PgDn`, `g`/`G`, `Esc` | scroll / close |

---

## 5. Architecture

### New pure modules (no Ink imports)

| File | Responsibility |
|---|---|
| `src/ui/text.ts` | grapheme/cell-safe `cellWidth`, `truncateCells`, `padCells`, `wrapCells`, control-sequence sanitization |
| `src/ui/layout.ts` | `computeLayout(columns, rows)` -> mode, pane widths, main/log heights |
| `src/ui/selection.ts` | `moveSelection`, `edgeSelection`, `pickInitialSelection`, `ensureVisible`, `clampTop`, `clampScroll` |
| `src/ui/keymap.ts` | `resolveAction(input, key, context)` -> intent union; no components |
| `src/ui/theme.ts` | semantic color slots + glyph set; `NO_COLOR` / ASCII resolution |
| `src/ui/log-view.ts` | entry -> display lines (compact/wrapped), line windowing with follow tail |
| `src/core/stream-buffer.ts` | `StreamCoalescer`: coalesce streaming assistant text by size/time |

### Components / hooks

| File | Responsibility |
|---|---|
| `Dashboard.tsx` | container: data hooks, UI state, one `useInput`, action dispatch |
| `components/HeaderBar.tsx` | brand, live counts, filter chip, approvals badge |
| `components/TaskList.tsx` | virtualized one-line task rows, selection/fold indicators |
| `components/TaskDetail.tsx` | two-line header + log viewport |
| `components/InputBar.tsx` | single-line input, no border |
| `components/KeyBar.tsx` | notice / confirm prompt / contextual key hints |
| `components/TooSmall.tsx` | minimal recovery screen |
| `components/overlays/{Help,Approvals,Diff}Overlay.tsx` \| modal content; destructive confirm is rendered in the key bar by the container |
| `hooks/{useTaskStore,useTaskLogs,useClock}.ts` | event-driven data, selected-only log renders, 1s clock |

### State model

```ts
type Focus = 'list' | 'input' | 'detail';
type Filter = 'all' | 'active' | 'attention';
type Overlay =
  | { kind: 'help' }
  | { kind: 'approvals'; index: number; confirmingAll: boolean }
  | { kind: 'confirm'; request: { title; target; consequence; action }; pending: boolean }
  | { kind: 'diff'; taskId: string; title: string; lines: string[]; top: number; loading: boolean; error: string | null }
  | null;

interface Notice { kind: 'info' | 'error'; text: string }
```

Destructive confirmations are rendered by `KeyBar` (the key bar owns the prompt,
while the container owns the pending action), keeping the main pane reserved for
the task list/log.

Selection is by stable `task.id`. Row indices are derived. Deletion, collapse,
filtering and resize clamp selection/scroll, never leave it dangling.

---

## 6. Core and performance changes

1. **Stream coalescing** (`headless.ts` + `stream-buffer.ts`): flush assistant text
   every 120 ms or 512 chars, plus final flush on end/abort/error. Summary text stays
   identical. This removes per-token `appendFileSync` and event storms.
2. **Event-driven task store**: typed `TaskEventMap`; update one task on
   `task:status` / `task:usage` / `task:review` instead of calling `listTasks()` on
   every event. Live usage/cost.
3. **Selected-only log store**: per-task cache; only the selected task triggers a
   render; race-safe fetch by sequence; entries capped at `ui.logWindow`.
4. **Truthful stats**: queued/running/waiting/failed counts come from live task
   state. Rate-limit pauses are logged by the manager; the header does not fake a
   rate-limit flag.
5. **Lifecycle**: construct `TaskManager` before `render()`; dashboard renders in
   `alternateScreen`; `exitOnCtrlC: false`; `await waitUntilExit()` then
   `manager.shutdown()`; non-TTY fallback message. Queued tasks restored from disk
   are started only after the dashboard mounts.
6. **Safe shutdown**: stop dequeuing, release pending approvals, abort active runs,
   wait up to `graceMs`, mark leftovers interrupted/resumable, flush and save.
7. **Config**: `ui.{ascii, timestamps, showCost, compactLog, alternateScreen, bell}`;
   `NO_COLOR` wins over color detection.
8. **Command handling**: all parser kinds handled; every async action wrapped in
   try/catch with a visible error notice; duplicate-submit guard.
9. **Confirmation**: destructive actions use the key-bar prompt only; the prompt
   names the task, action and consequence. Approve-all has its own y/n guard inside
   the approvals overlay.

---

## 7. Accessibility checklist

- [x] Semantic theme slots, no raw color literals in components.
- [x] `NO_COLOR` respected; ASCII glyph mode.
- [x] Selection has marker + weight + color, readable in monochrome.
- [x] Primary text never dimmed; dim only secondary metadata.
- [x] Status has a text label in detail/header and `aria-label` on rows.
- [x] `aria-role` `list`/`listitem`, `aria-state.selected`; input labelled.
- [x] Screen-reader mode uses linear single-pane presentation and no animation.
- [x] Contextual hints always visible; compact `?` help.
- [x] No blinking, no motion that delays input.
- [x] Long/untrusted strings sanitized and cell-truncated.

---

## 8. Test plan

| Level | File | Covers |
|---|---|---|
| Pure | `tests/ui-layout.test.ts` | wide/narrow/tiny, height math, resize clamping |
| Pure | `tests/ui-selection.test.ts` | move/clamp, collapsed rows, deletion, initial selection |
| Pure | `tests/ui-keymap.test.ts` | input safety, focus/overlay routing, confirm isolation |
| Pure | `tests/ui-text.test.ts` | wide chars, combining, truncate/pad, control stripping |
| Pure | `tests/ui-log-view.test.ts` | compact/wrapped lines, follow tail, offsets, resize |
| Pure | `tests/stream-buffer.test.ts` | size/time flush, final flush, abort |
| Component | `tests/dashboard.test.ts` | initial selection, arrows update detail, tab, overlays, cancel confirm, approve-all y/n guard |
| Integration | `tests/task-engine.test.ts` | queue/write-lock ordering, restored queued tasks, persisted log history, shutdown |
| Existing | `tests/ui-pure.test.ts` | keep parser/tree/glyph coverage; extend for new commands |
| Manual PTY | checklist | 120x40, 80x24, 50x12, resize, paste, approvals, merge/discard, exit restores terminal (pending release smoke test) |

Commands: `npm run build`, `npm test`.

---

## 9. Implementation phases

### Phase 1 — Pure model layer
- [x] `src/ui/text.ts`
- [x] `src/ui/layout.ts`
- [x] `src/ui/selection.ts`
- [x] `src/ui/keymap.ts`
- [x] `src/ui/theme.ts`
- [x] `src/ui/log-view.ts`
- [x] `src/core/stream-buffer.ts`
- [x] config `ui` extensions
- [x] unit tests for all of the above

### Phase 2 — Dashboard shell
- [x] `useTaskStore`, `useTaskLogs`, `useClock`
- [x] `HeaderBar`, `TaskList`, `TaskDetail`, `InputBar`, `KeyBar`, `TooSmall`
- [x] `Dashboard` state machine, single `useInput`, responsive layout
- [x] initial selection, working arrows/j/k, list scrolling, detail scrolling
- [x] help overlay, notice line, quit flow
- [x] component tests

### Phase 3 — Overlays and actions
- [x] approvals overlay (approve, deny, approve all)
- [x] confirm prompt in the key bar with target/consequence; modal-only keys
- [x] diff overlay
- [x] cancel / resume / merge / discard / collapse / expand / filter
- [x] fix `approve_all`, `diff`, `collapse`, `expand` command routing
- [x] input history, paste sanitization, duplicate-submit guard

### Phase 4 — Performance and lifecycle
- [x] streaming delta coalescing in `headless.ts`
- [x] typed task events; event-driven updates; live usage
- [x] selected-only log renders and race-safe fetches
- [x] persisted log history reloads after restart; sequence numbers never repeat
- [x] truthful task counts (queue derived from live statuses); no fabricated rate-limit state
- [x] safe shutdown; alternate screen; non-TTY fallback
- [x] queued tasks restored and started after the next dashboard mount
- [x] write-lock queue cannot spin or leak; rate-limit pause resumes automatically
- [x] layout math verified at 120x40 / 80x24 / 50x12

### Phase 5 — Accessibility, docs, polish
- [x] theme + glyph integration everywhere
- [x] `NO_COLOR`, ASCII, ARIA, screen-reader mode
- [x] README dashboard/keymap/config update
- [x] final build and full test suite pass; manual PTY smoke test documented as the remaining release check

---

## 10. Definition of done

- [x] `npm run build` passes with no TypeScript errors.
- [x] `npm test` passes, including new unit and component tests.
- [x] Launching `forge` shows the newest task selected and its log immediately.
- [x] Up/Down move the selection and update the detail pane on the first keypress.
- [x] Tab clearly cycles focus; `Esc` always has a visible, predictable effect.
- [x] Approvals, diff, merge, discard, cancel, resume work from the UI.
- [x] `/approve all`, `/diff`, `/collapse`, `/expand` no longer no-op.
- [x] Resizing to 80x24 and 50x12 keeps the input and key hints visible (layout unit tests; PTY smoke test pending).
- [x] Streaming a response does not freeze input or flood the log.
- [x] Exit path restores the terminal and marks interrupted tasks resumable (Ink alternate-screen teardown + manager shutdown).
- [x] README matches actual keys and behavior.
