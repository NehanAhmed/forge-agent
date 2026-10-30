import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLogLines, windowLogLines } from '../../../src/ui/log-view.js';
import type { LogEntry } from '../../../src/core/context.js';

const base = Date.UTC(2026, 0, 1, 12, 0, 0);

function entry(seq: number, type: LogEntry['type'], content: string): LogEntry {
  return { seq, timestamp: base + seq * 1000, type, content };
}

describe('UI Log View', () => {
  it('emits exactly one sanitized line per entry in compact mode', () => {
    const lines = buildLogLines(
      [entry(1, 'tool_call', 'read_file\nsrc/a.ts'), entry(2, 'assistant', '\u001B[31mhello\u001B[0m')],
      { width: 30, timestamps: true, verbose: false, ascii: false },
    );

    assert.equal(lines.length, 2);
    assert.ok(lines[0]!.text.includes('read_file src/a.ts'));
    assert.equal(lines[1]!.text, 'hello');
    assert.equal(lines[0]!.kind, 'entry');
  });

  it('wraps entries in verbose mode with a stable prefix', () => {
    const lines = buildLogLines([entry(1, 'assistant', 'abcdefghij')], {
      width: 6,
      timestamps: false,
      verbose: true,
      ascii: true,
    });

    assert.ok(lines.length > 1);
    assert.equal(lines[0]!.kind, 'entry');
    assert.equal(lines[1]!.kind, 'continuation');
    assert.equal(lines[0]!.prefix.length, lines[1]!.prefix.length);
  });

  it('windows lines from the bottom and clamps offsets', () => {
    const lines = buildLogLines(
      Array.from({ length: 10 }, (_, index) => entry(index + 1, 'info', `line ${index + 1}`)),
      { width: 40, timestamps: false, verbose: false, ascii: false },
    );

    const tail = windowLogLines(lines, 3, 0);
    assert.deepEqual(
      tail.lines.map(line => line.seq),
      [8, 9, 10],
    );
    assert.equal(tail.atBottom, true);
    assert.equal(tail.maxOffset, 7);

    const scrolled = windowLogLines(lines, 3, 2);
    assert.deepEqual(
      scrolled.lines.map(line => line.seq),
      [6, 7, 8],
    );
    assert.equal(scrolled.atBottom, false);
    assert.equal(scrolled.hasNewBelow, true);

    assert.equal(windowLogLines(lines, 3, 999).lines.map(line => line.seq)[0], 1);
    assert.equal(windowLogLines([], 3, 0).lines.length, 0);
  });
});
