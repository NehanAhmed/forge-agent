import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PROJECTS_DIRNAME = 'projects';
const MANIFEST_FILENAME = 'project.json';
const MANIFEST_VERSION = 1;
const KEY_HASH_LENGTH = 12;
const MAX_SLUG_LENGTH = 40;

export interface ProjectManifest {
  version: number;
  path: string;
  createdAt: number;
}

export interface ProjectPaths {
  key: string;
  dir: string;
  manifestFile: string;
  tasksDir: string;
  worktreesDir: string;
  metaDir: string;
  metaFile: string;
}

/** Forge's global data directory. Config and the API key live here too. */
export function getForgeHome(): string {
  return path.join(os.homedir(), '.forge');
}

/**
 * Resolve a directory to its canonical form so different spellings of the same
 * location map to one project folder: 8.3 short names (`RUNNER~1`), junctions,
 * symlinks, relative paths, and drive-letter case on Windows.
 */
export function canonicalizePath(target: string): string {
  const resolved = path.resolve(target);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    try {
      return fs.realpathSync(resolved);
    } catch {
      // The path may not exist yet (or may have been deleted). Fall back to the
      // resolved spelling; this is still stable for normal usage.
      return resolved;
    }
  }
}

function pathKey(pathValue: string): string {
  // Windows volumes are case-insensitive, so `C:\Repo` and `c:\repo` must hash
  // to the same key. POSIX paths are case-sensitive and must stay distinct.
  return process.platform === 'win32' ? pathValue.toLowerCase() : pathValue;
}

function slugFor(canonicalPath: string): string {
  const base = path.basename(canonicalPath);
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');
  if (cleaned) return cleaned;

  // Filesystem roots have no basename: `C:\` -> `c`, `/` -> `root`.
  const root = path
    .parse(canonicalPath)
    .root.replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
  return root || 'root';
}

function buildKey(canonicalPath: string): string {
  const hash = createHash('sha256').update(pathKey(canonicalPath)).digest('hex').slice(0, KEY_HASH_LENGTH);
  return `${slugFor(canonicalPath)}-${hash}`;
}

/** Deterministic, filesystem-safe folder name for a project directory. */
export function getProjectKey(cwd: string = process.cwd()): string {
  return buildKey(canonicalizePath(cwd));
}

function buildProjectPaths(canonicalPath: string): ProjectPaths {
  const key = buildKey(canonicalPath);
  const dir = path.join(getForgeHome(), PROJECTS_DIRNAME, key);
  const metaDir = path.join(dir, 'meta');
  return {
    key,
    dir,
    manifestFile: path.join(dir, MANIFEST_FILENAME),
    tasksDir: path.join(dir, 'tasks'),
    worktreesDir: path.join(dir, 'worktrees'),
    metaDir,
    metaFile: path.join(metaDir, 'meta.json'),
  };
}

function samePath(a: string, b: string): boolean {
  return pathKey(a) === pathKey(b);
}

function writeManifestIfMissing(manifestFile: string, canonicalPath: string): void {
  if (fs.existsSync(manifestFile)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) as ProjectManifest;
      if (manifest.path && !samePath(manifest.path, canonicalPath)) {
        console.warn(
          `[paths] Project manifest mismatch: ${manifestFile} records ${manifest.path}, opening ${canonicalPath}`,
        );
      }
    } catch {
      console.warn(`[paths] Ignoring unreadable project manifest: ${manifestFile}`);
    }
    return;
  }

  const manifest: ProjectManifest = {
    version: MANIFEST_VERSION,
    path: canonicalPath,
    createdAt: Date.now(),
  };
  const tempPath = `${manifestFile}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2), 'utf-8');
    fs.renameSync(tempPath, manifestFile);
  } catch (err) {
    // A concurrent Forge process may have written the manifest first. That is
    // fine; never overwrite an existing manifest, because it records the exact
    // path the project folder belongs to.
    if (!fs.existsSync(manifestFile)) throw err;
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Pure path computation for a project directory. Does not touch the filesystem.
 * Use `ensureProjectPaths` before writing.
 */
export function getProjectPaths(cwd: string = process.cwd()): ProjectPaths {
  return buildProjectPaths(canonicalizePath(cwd));
}

/**
 * Create the project folder (if needed) and record its exact path in
 * `project.json`. Safe to call repeatedly; an existing manifest is never
 * overwritten.
 */
export function ensureProjectPaths(cwd: string = process.cwd()): ProjectPaths {
  const canonicalPath = canonicalizePath(cwd);
  const paths = buildProjectPaths(canonicalPath);
  fs.mkdirSync(paths.dir, { recursive: true });
  writeManifestIfMissing(paths.manifestFile, canonicalPath);
  return paths;
}

export function getDefaultTasksDir(cwd: string = process.cwd()): string {
  return getProjectPaths(cwd).tasksDir;
}

export function getDefaultWorktreesDir(cwd: string = process.cwd()): string {
  return getProjectPaths(cwd).worktreesDir;
}

export function getDefaultMetaDir(cwd: string = process.cwd()): string {
  return getProjectPaths(cwd).metaDir;
}
