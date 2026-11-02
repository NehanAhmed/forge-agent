import { parseTaskRef } from '../core/tree.js';

export interface CommandOptions {
  readOnly?: boolean;
  shared?: boolean;
  policy?: 'ask' | 'auto_in_worktree' | 'read_only';
}

export type ParsedCommand =
  | { kind: 'create'; goal: string }
  | { kind: 'new'; options: CommandOptions; goal: string }
  | { kind: 'open'; target: string }
  | { kind: 'cancel'; target: string }
  | { kind: 'approve'; target: string }
  | { kind: 'approve_all' }
  | { kind: 'deny'; target: string }
  | { kind: 'diff'; target: string }
  | { kind: 'merge'; target: string }
  | { kind: 'discard'; target: string }
  | { kind: 'delete'; target: string }
  | { kind: 'resume'; target: string }
  | { kind: 'collapse'; target: string }
  | { kind: 'expand'; target: string }
  | { kind: 'help' }
  | { kind: 'quit' }
  | { kind: 'unknown'; error: string };

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { kind: 'unknown', error: 'Empty command' };
  }

  if (!trimmed.startsWith('/')) {
    return { kind: 'create', goal: trimmed };
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  if (cmd === 'help') return { kind: 'help' };
  if (cmd === 'quit' || cmd === 'exit') return { kind: 'quit' };

  if (cmd === 'approve') {
    if (parts[1] === 'all') {
      return { kind: 'approve_all' };
    }
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /approve <n> or /approve all' };
    return { kind: 'approve', target };
  }

  if (cmd === 'deny') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /deny <n>' };
    return { kind: 'deny', target };
  }

  if (cmd === 'open') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /open <n>' };
    return { kind: 'open', target };
  }

  if (cmd === 'cancel') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /cancel <n>' };
    return { kind: 'cancel', target };
  }

  if (cmd === 'diff') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /diff <n>' };
    return { kind: 'diff', target };
  }

  if (cmd === 'merge') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /merge <n>' };
    return { kind: 'merge', target };
  }

  if (cmd === 'discard') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /discard <n>' };
    return { kind: 'discard', target };
  }

  if (cmd === 'delete' || cmd === 'del' || cmd === 'rm') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: `Usage: /${cmd} <n>` };
    return { kind: 'delete', target };
  }

  if (cmd === 'resume') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /resume <n>' };
    return { kind: 'resume', target };
  }

  if (cmd === 'collapse') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /collapse <n>' };
    return { kind: 'collapse', target };
  }

  if (cmd === 'expand') {
    const target = parts[1] ? parseTaskRef(parts[1]) : null;
    if (!target) return { kind: 'unknown', error: 'Usage: /expand <n>' };
    return { kind: 'expand', target };
  }

  if (cmd === 'new') {
    const usage = 'Usage: /new [--read-only] [--shared] [--policy ask|auto_in_worktree|read_only] <goal>';
    const options: CommandOptions = {};
    let idx = 1;
    while (idx < parts.length && parts[idx]?.startsWith('--')) {
      const flag = parts[idx];
      if (flag === '--read-only') {
        options.readOnly = true;
      } else if (flag === '--shared') {
        options.shared = true;
      } else if (flag === '--policy') {
        const val = parts[idx + 1];
        if (val !== 'ask' && val !== 'auto_in_worktree' && val !== 'read_only') {
          return { kind: 'unknown', error: usage };
        }
        options.policy = val;
        idx++;
      } else {
        return { kind: 'unknown', error: usage };
      }
      idx++;
    }
    const goal = parts.slice(idx).join(' ');
    if (!goal) return { kind: 'unknown', error: usage };
    return { kind: 'new', options, goal };
  }

  return { kind: 'unknown', error: `Unknown command: /${cmd}. Type /help for available commands.` };
}
