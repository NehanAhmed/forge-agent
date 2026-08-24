# Tool Summary

This file lists all tool definitions found in `tools.ts`.

| Tool Name | Description |
|---|---|
| `run_bash` | Execute a shell command in the current working directory. Use this for listing files, searching code (grep/find), checking git status, running scripts, or any other shell operation. Returns combined stdout/stderr. Prefer `read_file` over `cat` for reading a single file, and prefer `replace_string_in_file` over shell text-manipulation (sed/awk) for editing. |
| `read_file` | Read the full contents of a single file at the given path and return it as text. Use this before editing a file to see its exact current content. |
| `write_file` | Create a new file or completely overwrite an existing file with the given content. Use this only for creating new files or when the entire file content should be replaced. For modifying part of an existing file, use `replace_string_in_file` instead — it is safer and preserves everything else in the file. |
| `replace_string_in_file` | Make a precise, surgical edit to an existing file by replacing one exact occurrence of a string with a new string. This is the preferred way to modify part of a file — it leaves the rest of the file untouched. `stringToReplace` must match EXACTLY ONE location in the file, character-for-character (including whitespace/indentation). Keep `stringToReplace` as SHORT as possible: include only the specific text being changed plus the minimum surrounding context needed to make the match unique (e.g. a variable name plus one line of context, not an entire function). If the string appears zero times or multiple times, this tool will fail — read the file first with `read_file` if unsure of exact formatting, and widen the match only as much as needed to make it unique. |

**Total tool definitions:** 4