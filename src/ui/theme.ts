import type { TaskStatus } from '../core/task.js';

export interface Theme {
  noColor: boolean;
  /** Dominant surface (60%): the dashboard canvas. */
  background?: string;
  /** Secondary surface (30%): chrome bars, rails and selection blocks. */
  surface?: string;
  /** Background used for the selected task row. */
  selectionBackground?: string;
  /** Accent (10%): wordmark, focus and highlighted values. */
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

/**
 * Forge's palette follows the 60-30-10 rule:
 *
 * - 60% dominant `#283618` — the dark olive canvas behind the main panes.
 * - 30% secondary `#606c38` — header, key bar, borders and selected rows.
 * - 10% accent `#fefae0` — primary text, the wordmark and focus highlights.
 *
 * `muted` and the semantic colours are tints of the same family so alerts stay
 * legible without introducing a competing hue.
 */
export const PALETTE = {
  dominant: '#283618',
  secondary: '#606c38',
  accent: '#fefae0',
  muted: '#cfd8bb',
  success: '#b5c99a',
  warning: '#e0a458',
  error: '#e2725b',
  info: '#9fb8ad',
} as const;

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
    background: color(enabled, PALETTE.dominant),
    surface: color(enabled, PALETTE.secondary),
    selectionBackground: color(enabled, PALETTE.secondary),
    accent: color(enabled, PALETTE.accent),
    focus: color(enabled, PALETTE.accent),
    text: color(enabled, PALETTE.accent),
    muted: color(enabled, PALETTE.muted),
    success: color(enabled, PALETTE.success),
    warning: color(enabled, PALETTE.warning),
    error: color(enabled, PALETTE.error),
    info: color(enabled, PALETTE.info),
    separator: color(enabled, PALETTE.secondary),
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

export type LogKind = 'reasoning' | 'tool_call' | 'tool_result' | 'assistant' | 'info' | 'error' | 'user';

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
      case 'user':
        return '❯';
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
    case 'user':
      return '❯';
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
    case 'user':
      return theme.accent;
  }
}
