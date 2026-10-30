import type { LogEntry } from '../core/context.js';
import { sanitizeText, truncateCells, wrapCells, cellWidth } from './text.js';
import { timeLabel } from './format.js';
import { logGlyph } from './theme.js';

export interface LogDisplayLine {
  seq: number;
  entry: LogEntry;
  kind: 'entry' | 'continuation';
  /** Timestamp + glyph (or equivalent spaces for continuation lines). */
  prefix: string;
  /** Content for this line, already truncated/wrapped. */
  text: string;
}

export interface LogViewOptions {
  width: number;
  timestamps: boolean;
  verbose: boolean;
  ascii: boolean;
  /** Safety cap for pathological logs. Oldest lines are dropped. */
  maxLines?: number;
}

export interface LogWindow {
  lines: LogDisplayLine[];
  atBottom: boolean;
  hasNewBelow: boolean;
  maxOffset: number;
  total: number;
}

/**
 * Turn log entries into display lines. Compact mode emits exactly one line per
 * entry; verbose mode wraps long content while keeping a stable prefix.
 */
export function buildLogLines(entries: LogEntry[], options: LogViewOptions): LogDisplayLine[] {
  const width = Math.max(1, Math.floor(options.width));
  const maxLines = options.maxLines ?? 4000;
  const lines: LogDisplayLine[] = [];

  for (const entry of entries) {
    const time = options.timestamps ? `${timeLabel(entry.timestamp)} ` : '';
    const prefix = `${time}${logGlyph(entry.type, options.ascii)} `;
    const prefixWidth = cellWidth(prefix);
    const available = Math.max(1, width - prefixWidth);
    const content = sanitizeText(entry.content).replace(/\r\n?/g, '\n').replace(/\t/g, '  ');

    if (options.verbose) {
      const wrapped = wrapCells(content, available);
      const indent = ' '.repeat(prefixWidth);
      wrapped.forEach((text, index) => {
        lines.push({
          seq: entry.seq,
          entry,
          kind: index === 0 ? 'entry' : 'continuation',
          prefix: index === 0 ? prefix : indent,
          text,
        });
      });
    } else {
      lines.push({
        seq: entry.seq,
        entry,
        kind: 'entry',
        prefix,
        text: truncateCells(content.replace(/\n/g, ' '), available),
      });
    }
  }

  return lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
}

/**
 * Window display lines. `offset` is measured from the bottom (0 = follow tail),
 * which keeps the newest output visible by default and clamps after resize.
 */
export function windowLogLines(lines: LogDisplayLine[], height: number, offset: number): LogWindow {
  const total = lines.length;
  const viewport = Math.max(1, Math.floor(height));
  const maxOffset = Math.max(0, total - viewport);
  const clamped = Math.min(maxOffset, Math.max(0, Math.floor(offset)));
  const end = total - clamped;
  const start = Math.max(0, end - viewport);

  return {
    lines: lines.slice(start, end),
    atBottom: clamped === 0,
    hasNewBelow: clamped > 0,
    maxOffset,
    total,
  };
}
