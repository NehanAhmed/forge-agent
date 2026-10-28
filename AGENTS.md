# AGENTS.md — Forge

Forge is a CLI-only TypeScript agent (`@nehanahmed/forge`) with two TUIs: a task
dashboard (default) and a legacy chat (`forge chat`). Built on Ink (React 19) and
`@openrouter/agent`.

## Commands

| Command | What it does |
|---|---|
| `pnpm install --frozen-lockfile` | Install (pnpm only; pinned `pnpm@12.6.0`) |
| `pnpm build` | `clean` → `tsc` → `scripts/add-shebang.js`; output in `dist/` |
| `pnpm test` | Full suite via `node:test` + tsx (~30s, no API key needed) |
| `pnpm exec tsx --test tests/git-tools.test.ts` | Run one test file (repeat the flag per file) |
| `node scripts/verify-package.js` | Publish-shape checks; **requires a fresh `pnpm build`** |
| `npm pack --dry-run --json` | Inspect the exact published file set |
| `pnpm dev` | Watches `src/cli/app.tsx`; **fails if `dist/cli/app.js` does not exist**, so build once first |
| `pnpm exec tsx scripts/demo-task-engine.ts` | Task-engine demo (not wired to a script) |

- There is **no lint, formatter, or standalone typecheck script**. `pnpm build` is the
  only typecheck, and `tsconfig.json` only includes `src/**/*` — tests and `scripts/`
  are never typechecked.
- Verify changes with `pnpm build && pnpm test` before claiming completion.
- Running the CLI: `forge`, `forge chat`, `forge chat --resume [ID]`,
  `forge config set-key <key>`. After editing, rebuild or `forge` runs stale code.
  For local use: `pnpm build && npm link`.

## Everyday changes: branch → PR → merge

Pushing and merging only update GitHub. They do **not** publish to npm.

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/my-change
# edit; if dependencies changed, run pnpm install
pnpm test
pnpm build
node scripts/verify-package.js
pnpm audit --prod --audit-level high
npm pack --dry-run
git add .
git commit -m "feat: describe the change"
git push -u origin feat/my-change
```

1. Open a PR, wait for all four CI jobs (Node 22/24 × Ubuntu/Windows), review, merge.
   The current ruleset may require a second approval or an admin bypass.
2. Sync again: `git switch main && git pull --ff-only origin main`. CI also runs on main.

- `scripts/verify-package.js` hard-fails on `package-lock.json`, `src/index.ts`,
  `dist/index.js`, a missing shebang, stale dashboard files, shipped `.map` files,
  wrong `engines`/`publishConfig`/`packageManager`, and `0.1.3` (already published).
  Use pnpm only; `npm install` creates `package-lock.json` and breaks verification.
  Commit `pnpm-lock.yaml` whenever dependencies change.
- CI runs test/build/audit/package verification plus a Linux tarball smoke test that
  asserts non-TTY `forge` exits **1** with `interactive terminal` — don't change that
  message casually.
- Never push directly to `main`; no `--amend`, `--no-verify`, `reset --hard`, or
  force-push. Hooks run normally.
- Forge-managed task branches are `agent/task-*` in worktrees under
  `~/.forge/worktrees/`. Merge them only through dashboard `/merge <n>` or
  `mergeWorktree()`; never hand-merge or commit into them.

## Publishing a release (npm)

GitHub is source history; npm is the distribution channel. Only annotated `v*` tags
release. The tag picks one exact `main` commit, and the tag, `package.json` version, and
npm `gitHead` must all agree. Code merged after a tag waits for the next release.

1. **Choose the version** (semver): patch = bug fix, minor = feature (pre-1.0 minors may
   break), major = breaking change after 1.0. A hyphen version (`X.Y.Z-beta.N`) is a
   prerelease and publishes under the `next` dist-tag.
2. **Bump via a dedicated PR — do not tag yet:**

   ```sh
   git switch main
   git pull --ff-only origin main
   git switch -c chore/release-X.Y.Z
   npm version X.Y.Z --no-git-tag-version
   git add package.json
   git commit -m "chore(release): vX.Y.Z"
   git push -u origin chore/release-X.Y.Z
   ```

   Open the PR, wait for CI, merge it.

3. **On updated `main`, confirm the version and tag are unused, then preflight:**

   ```sh
   git switch main
   git pull --ff-only origin main
   node -p "require('./package.json').version"
   npm view "@nehanahmed/forge@X.Y.Z" version   # must be 404
   git tag --list "vX.Y.Z"                      # must be empty
   git ls-remote --tags origin "vX.Y.Z"         # must be empty

   pnpm install --frozen-lockfile
   pnpm test
   pnpm build
   node scripts/verify-package.js
   pnpm audit --prod --audit-level high
   npm pack --dry-run
   ```

4. **Create and push the annotated tag (the release trigger):**

   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git rev-parse HEAD
   git rev-parse "vX.Y.Z^{commit}"   # must match HEAD
   git push origin vX.Y.Z
   ```

5. **Actions → Release** verifies tag == `package.json` and that the tag commit is on
   `main`, reruns tests/build/audit/package verification, publishes with OIDC and
   provenance (granular `NPM_TOKEN` fallback), and creates the GitHub Release. Approve
   the `npm` environment if configured. Never run `npm publish` manually.

6. **Verify the release:**

   ```sh
   npm view "@nehanahmed/forge" dist-tags
   npm view "@nehanahmed/forge@X.Y.Z" version gitHead
   npm view "@nehanahmed/forge@X.Y.Z" dist.attestations --json
   git rev-parse "vX.Y.Z^{commit}"
   npm install --global @nehanahmed/forge@X.Y.Z
   forge
   ```

   Check `latest`, `gitHead` == tag commit, attestations, and the GitHub Release. Smoke
   test in a real TTY; redirected output hits the non-TTY fallback.

- **Prereleases**: install with `@next`, keep `latest` stable. Promote with
  `npm dist-tag add "@nehanahmed/forge@X.Y.Z" latest` (needs npm auth and `dist-tag`
  permission on the Trusted Publisher).
- **Failure before publish**: fix config and rerun the same tag; do not move it. If code
  changes are required and nothing was published, delete/recreate the tag on the new
  `main` commit.
- **Published but GitHub Release failed**: rerun the workflow; it skips the existing npm
  version and retries the release.
- **Bad published package**: never reuse or move the version. Deprecate it
  (`npm deprecate "@nehanahmed/forge@X.Y.Z" "reason"`), bump a patch, and release again.
- **Never**: tag before the version is merged to `main`, tag a feature branch, reuse or
  move a published tag/version, commit `package-lock.json`, or add `"main"` /
  `src/index.ts` (CLI-only package).

## Architecture

- `src/cli/app.tsx` — the only bin entry (`dist/cli/app.js`). Handles `config set-key`
  before Ink starts, then `forge chat` vs. the default dashboard. Non-TTY dashboard
  exits 1; credentials are validated before entering the alternate screen.
- `src/cli/agent-cli.ts` — interactive chat loop/streaming. `src/core/headless.ts` —
  `runAgentHeadless` used by tasks (retry/backoff, budget, abort signal).
- Task engine — `core/task-manager.ts` (queue, concurrency, child tree, events),
  `core/task.ts` (state machine), `core/worktree.ts` (create/checkpoint/diff/merge/
  discard, path+branch guards), `core/approvals.ts` (policies, command allowlist),
  `core/persistence.ts` (atomic task state), `core/budget.ts`, `core/tree.ts`.
- Tools — `src/tools/definitions.ts` wires 13 zod schemas to `implementations.ts`:
  `run_bash`, `read_file`, `write_file`, `replace_string_in_file`, `spawn_sub_agent`,
  `search_code`, `git_status`/`git_diff`/`git_add`/`git_commit`,
  `spawn_task`/`wait_for_tasks`/`get_task`.
- TUI — `src/ui/*.ts` is pure logic (text width, keymap, selection, layout, log view,
  tree building) and is what most tests cover; `src/cli/components/dashboard/**`
  holds Ink components/hooks. Put behavior in `src/ui` so it stays testable.

## Invariants and conventions

- ESM only (`"type": "module"`), NodeNext resolution: **every relative import needs a
  `.js` extension**, even from `.tsx`. Strict TS with `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, and `isolatedModules`.
- Approval policy is not optional: `RISKY_TOOLS` (`run_bash`, `write_file`,
  `replace_string_in_file`) go through `executeWithPolicy`; `git_add`/`git_commit` are
  `write` risk. Never bypass, widen the shell allowlist, or add a write tool without
  approval wiring.
- Default model comes from `DEFAULT_MODEL_ID` (`core/models.ts`, used by the UI picker
  and headless runs) while `MODEL` (`core/constants.ts`) is used for compaction and the
  sub-agent. Changing "the model" in one place leaves the other stale.
- `core/state.ts` creates `~/.forge/meta` at **import time**. Keep imports side-effect
  free elsewhere, and don't let tests or demos touch real task/session data.
- Storage: interactive sessions in `.agent-sessions/` under the cwd; session meta in
  `~/.forge/meta/meta.json`; task state in `~/.forge/tasks/`; worktrees in
  `~/.forge/worktrees/`; config + API key in `~/.forge/config.json`. Never commit any
  of these (`.env`, `.forge/`, `.agent-sessions/` are gitignored).
- `dist/` is generated and gitignored — never edit it directly.
- `tests/git-tools.test.ts` creates and deletes `tests/temp-git-repo/`; leftovers are
  gitignored and safe to delete. Tests must be run from the repo root.

## Agent working rules

1. **Do not break existing behavior.** Read the surrounding code and call sites first;
   extend or refactor rather than rewrite. Preserve public tool names, CLI flags,
   persisted JSON shapes, and config keys unless the task explicitly changes them.
2. **Ask when anything is ambiguous.** If requirements conflict with existing behavior,
   validation, release rules, or evaluation criteria — stop and ask instead of guessing.
   Never invent commands, flags, or file paths; verify them in the repo.
3. **Prefer the smallest complete change.** Target the root cause, keep diffs focused,
   avoid drive-by reformatting, dependency additions, or broad renames. If a larger
   refactor is genuinely needed, explain why before starting.
4. **Write maintainable, modern code.** Follow the existing module boundaries and
   naming; reuse `src/ui` pure helpers; keep functions typed and side effects explicit;
   no `any` where a real type exists; handle errors where they occur instead of
   swallowing them.
5. **Verify before and after.** Reproduce or locate the problem, make the change, then
   run `pnpm build` and the relevant tests (single file first, full suite before
   finishing). Manually exercise the affected TUI path when behavior is visual.
6. **Handle failure paths.** Consider non-TTY output, Windows paths/line endings,
   missing `rg`, absent git repo, malformed JSON, aborted tasks, and concurrent
   worktree/task state. Return actionable errors rather than crashing Ink.
7. **Never do destructive or irreversible things** — no deleting user work, no
   `git push --force`, `reset --hard`, `--no-verify`, no publishing/version bumping
   without being asked, and no secrets in code, logs, commits, or tests.
