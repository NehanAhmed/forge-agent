import stringWidth from 'string-width';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;

const CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Remove terminal control sequences from untrusted text before rendering it.
 * Newlines and tabs are preserved; `wrapCells` normalises them.
 */
export function sanitizeText(text: string): string {
  return text.replace(ANSI_PATTERN, '').replace(CONTROL_PATTERN, '');
}

/** Visual width of a string in terminal cells. */
export function cellWidth(text: string): number {
  return stringWidth(sanitizeText(text));
}

/** Collapse newlines so a value can be rendered on exactly one line. */
export function singleLine(text: string): string {
  return sanitizeText(text).replace(/\r\n?/g, '\n').replace(/\n/g, ' ').replace(/\t/g, '  ');
}

/**
 * Truncate text at a grapheme boundary so it fits `maxWidth` terminal cells.
 * Adds an ellipsis when content is actually removed.
 */
export function truncateCells(text: string, maxWidth: number, ellipsis = '…'): string {
  const value = singleLine(text);
  if (maxWidth <= 0) return '';
  if (cellWidth(value) <= maxWidth) return value;

  const ellipsisWidth = cellWidth(ellipsis);
  if (maxWidth <= ellipsisWidth) {
    return truncatePlain(ellipsis, maxWidth);
  }

  return truncatePlain(value, maxWidth - ellipsisWidth) + ellipsis;
}

function truncatePlain(text: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const { segment } of segmenter.segment(text)) {
    const segmentWidth = stringWidth(segment);
    if (width + segmentWidth > maxWidth) break;
    result += segment;
    width += segmentWidth;
  }
  return result;
}

/** Pad a single-line value to exactly `width` cells (does not truncate). */
export function padCells(text: string, width: number): string {
  const value = singleLine(text);
  const padding = width - cellWidth(value);
  return padding > 0 ? value + ' '.repeat(padding) : value;
}

/** Truncate and pad to exactly `width` cells. */
export function fitCells(text: string, width: number): string {
  return padCells(truncateCells(text, width), width);
}

/**
 * Wrap text into lines of at most `width` cells. Existing newlines are
 * preserved, tabs are expanded, and wide/combining graphemes are never split.
 */
export function wrapCells(text: string, width: number): string[] {
  const maxWidth = Math.max(1, Math.floor(width));
  const value = sanitizeText(text).replace(/\r\n?/g, '\n').replace(/\t/g, '  ');
  const output: string[] = [];

  for (const paragraph of value.split('\n')) {
    if (paragraph === '') {
      output.push('');
      continue;
    }

    let line = '';
    let lineWidth = 0;

    for (const { segment } of segmenter.segment(paragraph)) {
      const segmentWidth = stringWidth(segment);
      if (lineWidth > 0 && lineWidth + segmentWidth > maxWidth) {
        output.push(line);
        line = '';
        lineWidth = 0;
      }
      // A single grapheme wider than the viewport cannot be split; emit it.
      line += segment;
      lineWidth += segmentWidth;
    }

    output.push(line);
  }

  return output.length > 0 ? output : [''];
}
