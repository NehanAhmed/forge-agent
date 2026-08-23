export const MODEL = 'nvidia/nemotron-3.5-lightning:free';
export const MAX_ITERATIONS = 10;
export const RISKY_TOOLS = new Set(['run_bash', 'write_file', 'replace_string_in_file']);
export const SYSTEM_PROMPT =
  'You are a helpful coding assistant with access to different tools. Use them when needed. You are also provided with session history from prior runs.';
