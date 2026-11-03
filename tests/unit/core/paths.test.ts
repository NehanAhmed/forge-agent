import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalizePath,
  ensureProjectPaths,
  getDefaultMetaDir,
  getDefaultTasksDir,
  getDefaultWorktreesDir,
  getForgeHome,
  getProjectKey,
  getProjectPaths,
} from '../../../src/core/paths.js';
import { tempDir } from '../../helpers/temp.js';

describe('project storage paths', () => {
  it('derives a stable, filesystem-safe key from a directory', t => {
    const dir = tempDir(t, 'forge-paths-');
    const key = getProjectKey(dir);

    assert.equal(getProjectKey(dir), key);
    assert.match(key, /^[a-z0-9-]+-[a-f0-9]{12}$/);
  });

  it('maps different directories to different keys', t => {
    const first = tempDir(t, 'forge-paths-a-');
    const second = tempDir(t, 'forge-paths-b-');

    assert.notEqual(getProjectKey(first), getProjectKey(second));
  });

  it('canonicalizes relative spellings of the same directory', t => {
    const dir = tempDir(t, 'forge-paths-canonical-');
    fs.mkdirSync(path.join(dir, 'nested'));
    const alias = path.join(dir, 'nested', '..', '.');

    assert.equal(canonicalizePath(alias), canonicalizePath(dir));
    assert.equal(getProjectKey(alias), getProjectKey(dir));
  });

  it('sanitizes readable directory names', t => {
    const root = tempDir(t, 'forge-paths-slug-');
    const dir = path.join(root, 'My Project!');
    fs.mkdirSync(dir);

    const key = getProjectKey(dir);
    assert.equal(key.startsWith('my-project-'), true);
    assert.match(key, /^[a-z0-9-]+-[a-f0-9]{12}$/);
  });

  it('nests every project store under ~/.forge/projects', t => {
    const dir = tempDir(t, 'forge-paths-layout-');
    const paths = getProjectPaths(dir);
    const key = getProjectKey(dir);

    assert.equal(paths.key, key);
    assert.equal(paths.dir, path.join(getForgeHome(), 'projects', key));
    assert.equal(paths.tasksDir, path.join(paths.dir, 'tasks'));
    assert.equal(paths.worktreesDir, path.join(paths.dir, 'worktrees'));
    assert.equal(paths.metaDir, path.join(paths.dir, 'meta'));
    assert.equal(paths.metaFile, path.join(paths.metaDir, 'meta.json'));
    assert.equal(getDefaultTasksDir(dir), paths.tasksDir);
    assert.equal(getDefaultWorktreesDir(dir), paths.worktreesDir);
    assert.equal(getDefaultMetaDir(dir), paths.metaDir);
  });

  it('creates the project folder and records the exact path', t => {
    const dir = tempDir(t, 'forge-paths-manifest-');
    const paths = ensureProjectPaths(dir);

    assert.equal(fs.existsSync(paths.dir), true);
    const manifest = JSON.parse(fs.readFileSync(paths.manifestFile, 'utf-8')) as {
      version: number;
      path: string;
      createdAt: number;
    };
    assert.equal(manifest.version, 1);
    assert.equal(manifest.path, canonicalizePath(dir));
    assert.equal(typeof manifest.createdAt, 'number');
    assert.equal(fs.existsSync(paths.tasksDir), false);
    assert.equal(fs.existsSync(paths.metaDir), false);
  });

  it('keeps an existing manifest untouched', t => {
    const dir = tempDir(t, 'forge-paths-existing-');
    const paths = ensureProjectPaths(dir);
    const original = fs.readFileSync(paths.manifestFile, 'utf-8');

    ensureProjectPaths(dir);
    assert.equal(fs.readFileSync(paths.manifestFile, 'utf-8'), original);
  });
});
