import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  editFile,
  editFileAll,
  editFileOnce,
  readFile,
  runBash,
  searchCodebase,
  spawnSubAgent,
  writeFile,
} from '../../../src/tools/implementations.js';
import { createTestContext } from '../../helpers/context.js';
import { fakeModel } from '../../helpers/model.js';
import { tempDir } from '../../helpers/temp.js';
import { hasRipgrep } from '../../helpers/guards.js';

describe('file tools', () => {
  it('writes, reads, and edits files inside the working directory', t => {
    const cwd = tempDir(t, 'forge-files-');
    const ctx = createTestContext({ cwd });

    assert.match(writeFile(ctx, 'nested/file.txt', 'hello world'), /written successfully/);
    assert.equal(readFile(ctx, 'nested/file.txt'), 'hello world');

    const edited = editFile(ctx, 'nested/file.txt', 'world', 'forge');
    assert.match(edited, /Successfully replaced 1 occurrence/);
    assert.equal(fs.readFileSync(path.join(cwd, 'nested', 'file.txt'), 'utf-8'), 'hello forge');
  });

  it('returns actionable errors for missing files and bad paths', t => {
    const cwd = tempDir(t, 'forge-files-errors-');
    const ctx = createTestContext({ cwd });

    assert.match(readFile(ctx, 'missing.txt'), /^ERROR:/);
    assert.match(readFile(ctx, '../outside.txt'), /resolves outside/);
    assert.match(writeFile(ctx, '../outside.txt', 'x'), /resolves outside/);
    assert.match(editFile(ctx, 'missing.txt', 'a', 'b'), /^ERROR:/);
    assert.match(editFile(ctx, 'missing.txt', 'a', 'b'), /^ERROR:/);
  });

  it('reports when the replacement string is not present', t => {
    const cwd = tempDir(t, 'forge-files-edit-');
    const ctx = createTestContext({ cwd });
    writeFile(ctx, 'a.txt', 'hello');
    assert.match(editFile(ctx, 'a.txt', 'nope', 'yes'), /was not found/);
  });

  it('refuses a single edit when the search string matches more than once', t => {
    const cwd = tempDir(t, 'forge-files-multi-');
    const ctx = createTestContext({ cwd });
    writeFile(ctx, 'dup.txt', 'foo bar foo');
    const result = editFileOnce(ctx, 'dup.txt', 'foo', 'baz');
    assert.match(result, /matches 2 locations/);
    assert.equal(fs.readFileSync(path.join(cwd, 'dup.txt'), 'utf-8'), 'foo bar foo');
  });

  it('replaces every occurrence with replace_all_strings', t => {
    const cwd = tempDir(t, 'forge-files-all-');
    const ctx = createTestContext({ cwd });
    writeFile(ctx, 'dup.txt', 'foo bar foo');
    const result = editFileAll(ctx, 'dup.txt', 'foo', 'baz');
    assert.match(result, /Successfully replaced 2 occurrence/);
    assert.equal(fs.readFileSync(path.join(cwd, 'dup.txt'), 'utf-8'), 'baz bar baz');
  });

  it('editFileAll reports when the search string is missing', t => {
    const cwd = tempDir(t, 'forge-files-all-missing-');
    const ctx = createTestContext({ cwd });
    writeFile(ctx, 'a.txt', 'hello');
    assert.match(editFileAll(ctx, 'a.txt', 'nope', 'yes'), /was not found/);
  });
});

describe('shell tool', () => {
  it('runs commands in the task cwd', t => {
    const cwd = tempDir(t, 'forge-shell-');
    const ctx = createTestContext({ cwd });
    const output = runBash(ctx, 'node -e "process.stdout.write(process.cwd())"');
    assert.equal(path.resolve(output.trim()), path.resolve(cwd));
  });

  it('refuses to run after cancellation', () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = createTestContext({ signal: controller.signal });
    assert.equal(runBash(ctx, 'echo hello'), 'ERROR: Operation cancelled');
  });

  it('returns command failures as errors', t => {
    const ctx = createTestContext({ cwd: tempDir(t, 'forge-shell-error-') });
    const output = runBash(ctx, 'node -e "process.exit(7)"');
    assert.match(output, /^ERROR:/);
  });
});

describe('code search tool', () => {
  it('rejects paths outside the working directory', t => {
    const ctx = createTestContext({ cwd: tempDir(t, 'forge-search-') });
    assert.match(searchCodebase(ctx, 'needle', '../outside'), /resolves outside/);
  });

  it('finds matches when ripgrep is installed', { skip: !hasRipgrep() ? 'ripgrep is not installed' : false }, t => {
    const cwd = tempDir(t, 'forge-search-rg-');
    fs.writeFileSync(path.join(cwd, 'a.ts'), 'const needle = 1;\n');
    const ctx = createTestContext({ cwd });
    const output = searchCodebase(ctx, 'needle', '.', 10);
    assert.match(output, /needle/);
    assert.match(output, /a\.ts/);
  });
});

describe('sub-agent tool', () => {
  it('uses the context model call and records usage', async () => {
    const ctx = createTestContext({
      model: { text: 'sub result', usage: { inputTokens: 20, outputTokens: 10, cost: 0.001 } },
    });

    const result = await spawnSubAgent(ctx, 'look around');

    assert.equal(result, 'sub result');
    assert.deepEqual(ctx.budget.used, { tokens: 30, cost: 0.001, requests: 1 });
  });

  it('retries a retryable failure and then succeeds', async () => {
    let calls = 0;
    const ctx = createTestContext({
      callModel: (() => {
        calls++;
        if (calls === 1) {
          const error: any = new Error('rate limited');
          error.status = 429;
          error.headers = { 'retry-after': '0' };
          throw error;
        }
        return fakeModel({
          text: 'recovered',
          usage: { inputTokens: 5, outputTokens: 2, cost: 0.0002 },
        })();
      }) as any,
    });

    const result = await spawnSubAgent(ctx, 'task', { retry: { sleep: async () => {} } });

    assert.equal(result, 'recovered');
    assert.equal(calls, 2);
    assert.deepEqual(ctx.budget.used, { tokens: 7, cost: 0.0002, requests: 2 });
  });

  it('returns an ERROR string after exhausting retries', async () => {
    let calls = 0;
    const ctx = createTestContext({
      callModel: (() => {
        calls++;
        const error: any = new Error('bad gateway');
        error.status = 502;
        throw error;
      }) as any,
    });

    const result = await spawnSubAgent(ctx, 'task', { retry: { sleep: async () => {} } });

    assert.match(result, /^ERROR: sub-agent model call failed after 6 attempts/);
    assert.equal(calls, 6);
    assert.deepEqual(ctx.budget.used, { tokens: 0, cost: 0, requests: 6 });
  });

  it('does not retry non-retryable failures', async () => {
    let calls = 0;
    const ctx = createTestContext({
      callModel: (() => {
        calls++;
        const error: any = new Error('unauthorized');
        error.status = 401;
        throw error;
      }) as any,
    });

    const result = await spawnSubAgent(ctx, 'task', {
      retry: {
        sleep: async () => {
          throw new Error('should not sleep');
        },
      },
    });

    assert.match(result, /^ERROR: sub-agent model call failed —/);
    assert.equal(calls, 1);
    assert.deepEqual(ctx.budget.used, { tokens: 0, cost: 0, requests: 1 });
  });
});
