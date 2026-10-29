import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cellWidth, fitCells, padCells, sanitizeText, truncateCells, wrapCells } from '../../../src/ui/text.js';

describe('UI Text', () => {
  it('measures wide and combining graphemes', () => {
    assert.equal(cellWidth('abc'), 3);
    assert.equal(cellWidth('界'), 2);
    assert.equal(cellWidth('e\u0301'), 1);
  });

  it('strips terminal control sequences', () => {
    assert.equal(sanitizeText('\u001B[31mred\u001B[0m'), 'red');
    assert.equal(sanitizeText('a\u0007b'), 'ab');
  });

  it('truncates at grapheme boundaries with an ellipsis', () => {
    assert.equal(truncateCells('abcdef', 4), 'abc…');
    assert.equal(truncateCells('界界界', 5), '界界…');
    assert.equal(truncateCells('abc', 10), 'abc');
    assert.equal(truncateCells('abcdef', 0), '');
    assert.equal(truncateCells('abcdef', 1), '…');
  });

  it('pads and fits to exact cells', () => {
    assert.equal(padCells('ab', 4), 'ab  ');
    assert.equal(padCells('界', 4), '界  ');
    assert.equal(fitCells('abcdef', 4), 'abc…');
    assert.equal(cellWidth(fitCells('界界界', 5)), 5);
  });

  it('wraps without splitting wide or combining graphemes', () => {
    assert.deepEqual(wrapCells('abcdef', 3), ['abc', 'def']);
    assert.deepEqual(wrapCells('界界界', 4), ['界界', '界']);
    assert.deepEqual(wrapCells('a\nb', 5), ['a', 'b']);
    assert.deepEqual(wrapCells('', 5), ['']);
  });
});
