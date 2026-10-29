import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamCoalescer } from '../../../src/core/stream-buffer.js';

describe('StreamCoalescer', () => {
  it('flushes when the character budget is reached', () => {
    const flushed: string[] = [];
    const coalescer = new StreamCoalescer({ maxChars: 5, maxDelayMs: 10_000, onFlush: text => flushed.push(text) });

    coalescer.push('abc');
    assert.deepEqual(flushed, []);
    coalescer.push('def');
    assert.deepEqual(flushed, ['abcdef']);
    assert.equal(coalescer.pending(), '');
  });

  it('flushes on the time budget', () => {
    let now = 0;
    const flushed: string[] = [];
    const coalescer = new StreamCoalescer({
      maxChars: 100,
      maxDelayMs: 120,
      now: () => now,
      onFlush: text => flushed.push(text),
    });

    now = 50;
    coalescer.push('hello');
    assert.deepEqual(flushed, []);
    now = 130;
    coalescer.push(' world');
    assert.deepEqual(flushed, ['hello world']);
  });

  it('flushes trailing text and ignores empty flushes', () => {
    const flushed: string[] = [];
    const coalescer = new StreamCoalescer({ onFlush: text => flushed.push(text) });

    coalescer.push('tail');
    coalescer.flush();
    coalescer.flush();
    assert.deepEqual(flushed, ['tail']);
  });

  it('flushes trailing text after maxDelayMs without another push', async () => {
    const flushed: string[] = [];
    const coalescer = new StreamCoalescer({
      maxChars: 100,
      maxDelayMs: 20,
      onFlush: text => flushed.push(text),
    });

    coalescer.push('tail');
    assert.deepEqual(flushed, []);
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.deepEqual(flushed, ['tail']);
    assert.equal(coalescer.pending(), '');
  });
});
