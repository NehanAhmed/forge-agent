import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { hasBuiltCli } from '../helpers/guards.js';
import { tempDir } from '../helpers/temp.js';

const CLI = path.join(process.cwd(), 'dist', 'cli', 'app.js');

function runCli(t: Parameters<typeof tempDir>[0], args: string[]) {
  const root = tempDir(t, 'forge-cli-');
  const home = path.join(root, 'home');
  fs.mkdirSync(home, { recursive: true });

  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: 'utf-8',
    timeout: 60_000,
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      FORGE_TEST: '1',
      NO_COLOR: '1',
      OPENROUTER_API_KEY: '',
    },
  });

  return { result, home };
}

describe('CLI smoke tests', { skip: !hasBuiltCli() ? 'run pnpm build first' : false }, () => {
  it('exits 1 with a helpful message on a non-TTY dashboard', t => {
    const { result } = runCli(t, []);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /interactive terminal/);
  });

  it('saves a key with config set-key before entering the dashboard', t => {
    const { result, home } = runCli(t, ['config', 'set-key', 'test-key']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /API key saved/);

    const config = JSON.parse(fs.readFileSync(path.join(home, '.forge', 'config.json'), 'utf-8'));
    assert.equal(config.apiKey, 'test-key');
  });
});
