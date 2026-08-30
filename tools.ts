export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'run_bash',
      description:
        'Execute a shell command in the current working directory. Use this for listing files, searching code (grep/find), checking git status, running scripts, or any other shell operation. Returns combined stdout/stderr. Prefer read_file over `cat` for reading a single file, and prefer replace_string_in_file over shell text-manipulation (sed/awk) for editing.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'A single shell command to execute, e.g. "ls -la" or "grep -rn TODO src/"',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description:
        'Read the full contents of a single file at the given path and return it as text. Use this before editing a file to see its exact current content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative or absolute path to the file to read.',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description:
        'Create a new file or completely overwrite an existing file with the given content. Use this only for creating new files or when the entire file content should be replaced. For modifying part of an existing file, use replace_string_in_file instead — it is safer and preserves everything else in the file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative or absolute path to the file to write.',
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file, replacing anything already there.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'replace_string_in_file',
      description:
        'Make a precise, surgical edit to an existing file by replacing one exact occurrence of a string with a new string. This is the preferred way to modify part of a file — it leaves the rest of the file untouched. stringToReplace must match EXACTLY ONE location in the file, character-for-character (including whitespace/indentation). Keep stringToReplace as SHORT as possible: include only the specific text being changed plus the minimum surrounding context needed to make the match unique (e.g. a variable name plus one line of context, not an entire function). If the string appears zero times or multiple times, this tool will fail — read the file first with read_file if unsure of exact formatting, and widen the match only as much as needed to make it unique.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative or absolute path to the file to edit.',
          },
          stringToReplace: {
            type: 'string',
            description: 'The exact existing text to find and replace. Must match exactly one location in the file.',
          },
          newString: {
            type: 'string',
            description: 'The text to replace it with.',
          },
        },
        required: ['path', 'stringToReplace', 'newString'],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spawn_sub_agent",
      description:
        "Delegate a self-contained investigative task to a sub-agent with a fresh, isolated context. Use this for tasks that would pollute your context with a lot of intermediate noise — e.g. 'search the codebase for all usages of X', 'read through these 5 files and summarize the auth flow', 'find where Y is configured'. The sub-agent has read-only tools (read_file, run_bash) and returns a single summarized answer — you will NOT see its intermediate steps. Do not use this for tasks that require writing/editing files, or for simple single-file lookups you can do directly.",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "A clear, self-contained description of what the sub-agent should find/do and report back. It has no knowledge of the current conversation, so include all necessary context.",
          },
        },
        required: ["task"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description:
        "Search the codebase for a text pattern using ripgrep (regex supported). Automatically excludes node_modules, dist, build output, and lockfiles — you do not need to add exclusions yourself. Use this instead of grep/rg via run_bash. Returns matching file paths and line numbers with surrounding context.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Text or regex pattern to search for." },
          path: { type: "string", description: "Directory to search in. Defaults to current directory." },
          maxResults: {
            type: "number",
            description: "Maximum total matches to return (default 60, hard cap 150). Prefer narrowing your search pattern or path over raising this — only increase it if you've confirmed the results are truncated and a narrower search isn't feasible.",
          },
        },
        required: ["pattern"],
      },
    },
  }
];