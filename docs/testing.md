# Testing

Forge uses the built-in `node:test` runner with `tsx` for TypeScript. No API key or
network access is required.

## Commands

| Command | What it runs |
| --- | --- |
| `pnpm test` | All unit and integration tests |
| `pnpm test:unit` | `tests/unit/**/*.test.ts` only |
| `pnpm test:integration` | `tests/integration/**/*.test.ts` only |
| `pnpm test:watch` | Re-runs the selected suites when `src/` or `tests/` changes |
| `pnpm test:coverage` | All tests plus the coverage gates |
| `pnpm test:unit --filter "budget"` | Runs matching unit tests with the isolated runner |

`pnpm test` is the full suite, so `prepublishOnly` and the release workflow keep working
without special cases.

## Layout

```
tests/unit/core         pure core logic and isolated filesystem modules
tests/unit/tools        tool helpers and file/shell implementations
tests/unit/ui           layout, text, keymap, selection, parser, theme, dashboard logic
tests/integration       git worktrees, task manager lifecycle, git tools, CLI smoke tests
tests/helpers           temp dirs, git repos, fake models/contexts, skip guards
```

Put behavior in `src/ui` when it can be pure, then cover it from `tests/unit/ui`. Integration
tests may create real git repositories and worktrees under a temporary `HOME`.

## Isolation

`scripts/run-tests.mjs` creates a temporary root before starting Node and sets:

- `HOME` / `USERPROFILE` so `~/.forge` lives in the temp root.
- `TMP` / `TEMP` / `TMPDIR` so git and test helpers stay off the real temp directory.
- `FORGE_TEST=1`, a dummy `OPENROUTER_API_KEY`, and an empty `DOTENV_CONFIG_PATH` so the
  developer's real `.env` is never loaded.

Each suite should use `tempDir(t)` from `tests/helpers/temp.ts`; it registers cleanup with
`t.after()` and retries Windows handle release. Git suites use `initGitRepo(t)` instead of a
fixed checkout path so parallel runs cannot collide.

Use `tests/helpers/guards.ts` for environment-dependent tests:

```ts
it('finds matches', { skip: !hasRipgrep() ? 'ripgrep is not installed' : false }, t => {
  // ...
});
```

The CLI smoke suite uses `dist/cli/app.js`, so run `pnpm build` before
`pnpm test:integration` locally. CI builds before testing.

## Coverage gates

`pnpm test:coverage` enforces:

- 85% lines
- 75% branches
- 75% functions

Coverage includes `src/**` and excludes `src/cli/app.tsx` (the Ink entry point). Raise the
thresholds only after the measured baseline has headroom; do not lower them to make a
change pass.

## Linting and formatting

- `pnpm lint` runs ESLint with TypeScript, React hooks, and Prettier-compatible rules.
- `pnpm format` writes Prettier formatting; `pnpm format:check` verifies it.
- `pnpm typecheck` checks both `src/**/*` and `tests/**/*` / `scripts/**/*.ts`.

Prettier uses `endOfLine: "auto"`, so both LF and CRLF checkouts pass without a repo-wide
line-ending rewrite.
