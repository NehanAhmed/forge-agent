import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deriveSessionTitle, formatRgOutput, resolveSafePath } from '../../../src/tools/helpers.js';
import { tempDir } from '../../helpers/temp.js';

describe('tool helpers', () => {
  it('derives concise session titles', () => {
    assert.equal(deriveSessionTitle('  hello   world  '), 'hello world');
    const long = deriveSessionTitle('x'.repeat(80));
    assert.equal(long.length, 51);
    assert.ok(long.endsWith('…'));
  });

  it('resolves paths inside the working directory', t => {
    const cwd = tempDir(t, 'forge-paths-');
    assert.equal(resolveSafePath('a/b.txt', cwd), path.join(cwd, 'a', 'b.txt'));
    assert.equal(resolveSafePath('.', cwd), path.resolve(cwd));
    assert.equal(resolveSafePath(cwd, cwd), path.resolve(cwd));
  });

  it('rejects traversal and absolute paths outside the working directory', t => {
    const cwd = tempDir(t, 'forge-paths-safe-');
    assert.throws(() => resolveSafePath('../outside.txt', cwd), /resolves outside/);
    assert.throws(() => resolveSafePath(path.resolve(cwd, '..', 'outside.txt'), cwd), /resolves outside/);
  });

  it('rejects symlink escapes when symlinks are available', t => {
    const cwd = tempDir(t, 'forge-paths-link-');
    const outside = tempDir(t, 'forge-paths-outside-');
    const link = path.join(cwd, 'escape');
    fs.writeFileSync(path.join(outside, 'file.txt'), 'outside');
    try {
      fs.symlinkSync(outside, link, 'junction');
    } catch {
      t.skip('symlinks are not available');
      return;
    }
    assert.throws(() => resolveSafePath('escape/file.txt', cwd), /symlink/);
  });

  it('groups, sorts, and marks ripgrep matches', () => {
    const output = [
      JSON.stringify({ type: 'match', data: { path: { text: 'a.ts' }, lines: { text: 'second\n' }, line_number: 5 } }),
      JSON.stringify({
        type: 'context',
        data: { path: { text: 'a.ts' }, lines: { text: 'context\n' }, line_number: 3 },
      }),
      JSON.stringify({ type: 'begin', data: { path: { text: 'a.ts' } } }),
      JSON.stringify({ type: 'match', data: { path: { text: 'b.ts' }, lines: { text: 'only\n' }, line_number: 1 } }),
    ].join('\n');

    const formatted = formatRgOutput(output, 10);
    assert.match(formatted, /a\.ts/);
    assert.match(formatted, /3: context/);
    assert.match(formatted, /5: second/);
    assert.match(formatted, /b\.ts/);
    assert.ok(formatted.indexOf('a.ts') < formatted.indexOf('b.ts'));
  });

  it('truncates after the match budget', () => {
    const output = Array.from({ length: 3 }, (_, index) =>
      JSON.stringify({
        type: 'match',
        data: { path: { text: 'a.ts' }, lines: { text: `line ${index}\n` }, line_number: index + 1 },
      }),
    ).join('\n');

    const formatted = formatRgOutput(output, 2);
    assert.match(formatted, /Results truncated at 2 matches/);
    assert.match(formatted, /line 1/);
    assert.ok(!formatted.includes('line 3'));
  });

  it('ignores malformed events and handles empty output', () => {
    assert.equal(formatRgOutput(''), 'No matches found.');
    assert.equal(formatRgOutput('{broken\n' + JSON.stringify({ type: 'end' })), 'No matches found.');
  });
});
