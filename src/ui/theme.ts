import type { TaskStatus } from '../core/task.js';

export interface Theme {
  noColor: boolean;
  accent?: string;
  focus?: string;
  text?: string;
  muted?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
  separator?: string;
}

export interface Glyphs {
  selected: string;
  collapsed: string;
  expanded: string;
  leaf: string;
  separator: string;
  bullet: string;
  approval: string;
}

function color(enabled: boolean, value: string): string | undefined {
  return enabled ? value : undefined;
}

/**
 * Resolve semantic colour slots once, at the container. Widgets never contain
 * raw colour names. `NO_COLOR` takes precedence over capability detection.
 */
export function createTheme(options: { noColor?: boolean; env?: NodeJS.ProcessEnv } = {}): Theme {
  const env = options.env ?? process.env;
  const envNoColor = env.NO_COLOR !== undefined;
  const enabled = !(options.noColor ?? envNoColor);

  return {
    noColor: !enabled,
    accent: color(enabled, 'cyan'),
    focus: color(enabled, 'cyanBright'),
    text: undefined,
    muted: color(enabled, 'gray'),
    success: color(enabled, 'greenBright'),
    warning: color(enabled, 'yellowBright'),
    error: color(enabled, 'redBright'),
    info: color(enabled, 'magentaBright'),
    separator: color(enabled, 'gray'),
  };
}

export function createGlyphs(ascii: boolean): Glyphs {
  return ascii
    ? {
        selected: '>',
        collapsed: '+',
        expanded: '-',
        leaf: '-',
        separator: '|',
        bullet: '-',
        approval: '!',
      }
    : {
        selected: '❯',
        collapsed: '▸',
        expanded: '▾',
        leaf: '·',
        separator: '│',
        bullet: '·',
        approval: '⚠',
      };
}

export function statusColor(status: TaskStatus, theme: Theme): string | undefined {
  switch (status) {
    case 'running':
      return theme.success;
    case 'waiting_approval':
      return theme.warning;
    case 'failed':
      return theme.error;
    case 'queued':
    case 'cancelled':
      return theme.muted;
    case 'done':
      return theme.success;
  }
}

export type LogKind = 'reasoning' | 'tool_call' | 'tool_result' | 'assistant' | 'info' | 'error';

export function logGlyph(kind: LogKind, ascii: boolean): string {
  if (ascii) {
    switch (kind) {
      case 'assistant':
        return '*';
      case 'reasoning':
        return '.';
      case 'tool_call':
        return '>';
      case 'tool_result':
        return '<';
      case 'info':
        return 'i';
      case 'error':
        return 'x';
    }
  }
  switch (kind) {
    case 'assistant':
      return '◆';
    case 'reasoning':
      return '…';
    case 'tool_call':
      return '⚡';
    case 'tool_result':
      return '↳';
    case 'info':
      return 'ℹ';
    case 'error':
      return '✗';
  }
}

export function logColor(kind: LogKind, theme: Theme): string | undefined {
  switch (kind) {
    case 'assistant':
      return theme.text;
    case 'reasoning':
      return theme.muted;
    case 'tool_call':
      return theme.warning;
    case 'tool_result':
      return theme.muted;
    case 'info':
      return theme.info;
    case 'error':
      return theme.error;
  }
}
