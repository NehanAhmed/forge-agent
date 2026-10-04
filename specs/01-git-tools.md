# Spec: Add Git Tools to the Agent

## The Goal

Give the agent the ability to manage version control on its own by adding a small, safe set of git tools: `git_status`, `git_diff`, `git_add`, and `git_commit`.

After this change, the agent should be able to finish a piece of work by inspecting what changed, staging the right files, and committing them with a meaningful message, without the user running git commands by hand.

## The Task

1. **Study the existing tools first.** Before writing anything, find how the agent's current tools are defined, registered, validated, and tested. Match that pattern exactly: same file layout, same schema style, same return format, same error handling. If the project already has a shell or subprocess helper, reuse it.
2. **Implement four new tools** in the same place and style as the existing ones:
   - `git_status`
   - `git_diff`
   - `git_add`
   - `git_commit`
3. **Register the tools** so the agent can discover and call them, the same way existing tools are registered.
4. **Write tool descriptions** that an LLM can act on. Each description should say what the tool does, when to use it, and what it returns. The `git_commit` description should tell the agent to check `git_status` and `git_diff` before committing.
5. **Add tests** for every tool (see "The End Result to Expect").
6. **Update documentation**: the README or tool list, and the agent's system prompt if it lists available tools.

## The Functionality

All tools run against the agent's working repository (the workspace root) and return results in the project's existing tool-result format. If there is no existing convention, use:

```json
{ "success": true, "output": "<stdout>", "error": null, "exit_code": 0 }
```

### `git_status`

- **Input:** none.
- **Behavior:** runs `git status --porcelain=v1 --branch`. Returns the current branch and the list of staged, unstaged, and untracked files.
- **Output:** the raw status text, plus a parsed summary if that fits the project's style.

### `git_diff`

- **Input:**
  - `staged` (boolean, optional, default `false`): `true` shows staged changes (`--cached`).
  - `paths` (list of strings, optional): limits the diff to specific files.
- **Behavior:** returns the diff text. Truncate very large output to a sensible limit (for example 50,000 characters) and add a clear note when truncated.

### `git_add`

- **Input:**
  - `paths` (list of strings, **required**, at least one): files or directories to stage.
- **Behavior:**
  - Validates every path (see safety rules below), then runs `git add -- <paths>`.
  - Staging everything requires the explicit value `"."`. Never stage everything implicitly.
  - Returns a short confirmation and, ideally, the updated staged file list.
- **Errors:** return a clear error for nonexistent paths, paths outside the repo, or ignored files that git refuses to add.

### `git_commit`

- **Input:**
  - `message` (string, **required**): the commit message. May be multi-line (subject, blank line, body).
- **Behavior:**
  - Commits **only what is already staged**, using `git commit -m <message>`.
  - Rejects empty or whitespace-only messages before calling git.
  - If nothing is staged, returns a clear "nothing to commit" error. It must not crash and must not auto-stage files.
  - On success, returns the new commit hash (short), the branch, and the files-changed summary.
  - Git hooks run normally. If a hook fails, return the hook's output as the error.

### Safety rules that apply to all four tools

- Run git through an argument list (for example `subprocess.run([...])` or the language equivalent), never through a shell string.
- Resolve every user-supplied path against the repo root and reject anything that escapes it (`..`, absolute paths outside the repo, symlinks pointing outside).
- Always put `--` before the path list so a filename like `-A` or `--force` cannot be read as an option.
- Set a timeout (default 30 seconds) on every git call.
- Set `GIT_TERMINAL_PROMPT=0` and make sure no call can open an interactive editor or prompt and hang.
- If the directory is not a git repository, or `git` is not installed, return a clear, specific error.

## The Things to Avoid

- **Do not use `shell=True`** or build commands by string concatenation or interpolation.
- **Do not add destructive or remote git operations.** No `push`, `pull`, `fetch`, `reset`, `clean`, `checkout`, `rebase`, `merge`, `stash`, branch deletion, or any `--force` variant. These are out of scope for this task.
- **Do not use `git commit -a`, `--amend`, or `--no-verify`.** Commits contain only what was explicitly staged, and hooks must run.
- **Do not modify git config.** If `user.name` or `user.email` is missing, return an error that explains it. Do not set them.
- **Do not stage files implicitly.** `git_commit` must never run `git add` on the agent's behalf.
- **Do not add new dependencies** (for example GitPython) unless the project already uses them. Shelling out to the `git` CLI is the default.
- **Do not refactor or reformat unrelated code.** Keep the diff focused on this feature.
- **Do not swallow errors.** Every failure should reach the agent with git's real stderr, not a generic "failed" message.
- **Do not hardcode paths**, branch names, or author information.

## The Things to Keep in Mind

- **Consistency beats cleverness.** If the existing tools do something a certain way, do it that way, even if you would normally choose differently.
- **The agent is the user of these tools.** Tool names, parameter names, and descriptions are what the LLM reads when deciding what to call. Keep them short, unambiguous, and single-purpose.
- **Output size matters.** Large diffs and status output eat the agent's context window, so enforce the truncation limits and say when output was cut.
- **Cross-platform behavior.** Paths may use backslashes on Windows. Filenames may contain spaces or non-ASCII characters, so use `-z` or equivalent where parsing status output.
- **Edge cases to handle:**
  - A brand-new repo with no commits yet (first commit)
  - Detached HEAD state
  - Merge conflicts present in the working tree
  - Binary files in a diff
  - GPG signing that prompts or fails (should time out cleanly, not hang)
- **Commit message quality.** Do not enforce a style, but the tool description should encourage a short imperative subject line (about 50 to 72 characters) with an optional body.
- **Idempotence.** Calling `git_add` twice on the same path should succeed both times. Calling `git_commit` twice in a row should succeed once and then report nothing to commit.
- **Secrets.** If it is cheap to do so, make `git_add` return a warning (not an error) when staging files named like `.env`, `*.pem`, or `id_rsa`.

## The End Result to Expect

### Deliverables

1. Four new tools (`git_status`, `git_diff`, `git_add`, `git_commit`) implemented in the project's existing tool structure.
2. Tools registered and visible to the agent, each with a clear name, description, and input schema.
3. A test suite covering the tools, using a temporary git repository fixture (never the real project repo).
4. Updated documentation listing the new tools and their parameters.

### Tests must cover

- **Happy path** for each tool.
- **Not a git repo** returns a clear error.
- **`git_add`** with a nonexistent path, a path outside the repo (`../x`), and a filename that starts with `-`.
- **`git_commit`** with an empty message, with nothing staged, and with staged files (verify the commit exists via `git log`).
- **`git_diff`** with `staged` true and false, and with truncation of large output.
- **`git_commit`** does not include unstaged files.

### Acceptance checklist

- [ ] All four tools appear in the agent's tool list and can be called successfully
- [ ] End-to-end flow works: edit a file, then `git_status`, `git_diff`, `git_add`, `git_commit`, then `git_status` shows a clean tree
- [ ] No tool can run `push`, `reset`, `--force`, `--amend`, `--no-verify`, or `commit -a`
- [ ] No shell string execution anywhere in the new code
- [ ] Path traversal and option injection are blocked and tested
- [ ] Every failure returns git's actual error message
- [ ] All new and existing tests pass
- [ ] Docs and system prompt (if applicable) are updated
- [ ] The diff touches only what this feature needs

### Expected agent behavior after the change

> **User:** "Fix the typo in README and commit it."
> **Agent:** edits the file, calls `git_status`, calls `git_diff`, calls `git_add` with `["README.md"]`, calls `git_commit` with `"Fix typo in README installation section"`, then reports the commit hash and the changed file.

### Final report from the implementing agent

When finished, reply with:

1. A list of files created or modified
2. How to run the tests, and their results
3. Any assumptions made or deviations from this spec, with the reason
4. Any follow-up suggestions (for example, `git_log` or `git_branch` as a later addition)