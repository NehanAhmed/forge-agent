import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TestContext } from 'node:test';

export function makeTempDir(prefix = 'forge-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeTempDir(dir: string): void {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // Windows can briefly hold handles from git. The OS temp directory is
    // disposable; never fail a test because cleanup raced a process exit.
  }
}

/** Create a temp directory and remove it after the current test. */
export function tempDir(t: TestContext, prefix = 'forge-test-'): string {
  const dir = makeTempDir(prefix);
  t.after(() => removeTempDir(dir));
  return dir;
}
