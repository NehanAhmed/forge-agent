export const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const MAX_ITERATIONS = 10;
export const RISKY_TOOLS = new Set(['run_bash', 'write_file', 'replace_string_in_file']);
export const SYSTEM_PROMPT =
  'You are a helpful coding assistant with access to different tools. Use them when needed. You are also provided with session history from prior runs.';
export const COMPACTION_THRESHOLD_TOKENS = 2000;
export const COMPACTION_KEEP_RECENT = 5;
export const FALLBACK_MODELS = ['nvidia/nemotron-3.5-lightning:free', 'dots-studio/dots-3-note-preview:free','poolside/laguna-s-2.1:free'];