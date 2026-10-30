import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function commandWorks(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { stdio: 'ignore', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

export function hasGit(): boolean {
  return commandWorks('git', ['--version']);
}

export function hasRipgrep(): boolean {
  return commandWorks('rg', ['--version']);
}

export function hasBuiltCli(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'dist', 'cli', 'app.js'));
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}
