import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveApiKey } from '../../../src/core/client.js';
import { tempDir } from '../../helpers/temp.js';

describe('API key resolution', () => {
  it('prefers the environment over the config file', t => {
    const dir = tempDir(t, 'forge-client-key-');
    const configPath = path.join(dir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ apiKey: 'file-key' }));
    const previous = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'env-key';
    t.after(() => {
      if (previous === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previous;
    });

    assert.equal(resolveApiKey(configPath), 'env-key');
  });

  it('reads the config file when the environment is empty', t => {
    const dir = tempDir(t, 'forge-client-file-');
    const configPath = path.join(dir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ apiKey: 'file-key' }));
    const previous = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    t.after(() => {
      if (previous !== undefined) process.env.OPENROUTER_API_KEY = previous;
    });

    assert.equal(resolveApiKey(configPath), 'file-key');
  });

  it('returns undefined for missing or malformed config files', t => {
    const dir = tempDir(t, 'forge-client-missing-');
    const previous = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    t.after(() => {
      if (previous !== undefined) process.env.OPENROUTER_API_KEY = previous;
    });

    assert.equal(resolveApiKey(path.join(dir, 'missing.json')), undefined);

    const malformed = path.join(dir, 'malformed.json');
    fs.writeFileSync(malformed, '{broken');
    assert.equal(resolveApiKey(malformed), undefined);
  });
});
