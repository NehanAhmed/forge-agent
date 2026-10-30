import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, getConfig, updateConfig } from '../../../src/core/config.js';
import { tempDir } from '../../helpers/temp.js';

function configPath(t: Parameters<typeof tempDir>[0]): string {
  return path.join(tempDir(t, 'forge-config-'), 'config.json');
}

describe('configuration', () => {
  it('returns defaults when the file is missing', t => {
    const file = configPath(t);
    assert.deepEqual(getConfig(file), DEFAULT_CONFIG);
    assert.equal(fs.existsSync(file), false);
  });

  it('merges partial values with defaults', t => {
    const file = configPath(t);
    fs.writeFileSync(
      file,
      JSON.stringify({
        children: { maxDepth: 5 },
        ui: { ascii: true, logWindow: 10 },
      }),
    );

    const config = getConfig(file);
    assert.equal(config.children.maxDepth, 5);
    assert.equal(config.children.maxPerTask, DEFAULT_CONFIG.children.maxPerTask);
    assert.equal(config.ui.ascii, true);
    assert.equal(config.ui.logWindow, 10);
    assert.equal(config.ui.timestamps, DEFAULT_CONFIG.ui.timestamps);
  });

  it('falls back for wrong types and malformed JSON', t => {
    const wrongTypes = configPath(t);
    fs.writeFileSync(
      wrongTypes,
      JSON.stringify({
        ui: { ascii: 'yes', logWindow: -1, renderBatchMs: 'fast', timestamps: 0 },
      }),
    );
    const config = getConfig(wrongTypes);
    assert.equal(config.ui.ascii, DEFAULT_CONFIG.ui.ascii);
    assert.equal(config.ui.logWindow, DEFAULT_CONFIG.ui.logWindow);
    assert.equal(config.ui.renderBatchMs, DEFAULT_CONFIG.ui.renderBatchMs);
    assert.equal(config.ui.timestamps, DEFAULT_CONFIG.ui.timestamps);

    const malformed = configPath(t);
    fs.writeFileSync(malformed, '{broken');
    assert.deepEqual(getConfig(malformed), DEFAULT_CONFIG);
  });

  it('updates a config file without dropping unrelated keys', t => {
    const file = configPath(t);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ apiKey: 'secret', ui: { ascii: false }, custom: true }));

    const updated = updateConfig({ ui: { ...DEFAULT_CONFIG.ui, ascii: true } }, file);
    assert.equal(updated.ui.ascii, true);

    const persisted = JSON.parse(fs.readFileSync(file, 'utf-8'));
    assert.equal(persisted.apiKey, 'secret');
    assert.equal(persisted.custom, true);
    assert.equal(persisted.ui.ascii, true);
  });
});
