#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const UNIT_GLOB = 'tests/unit/**/*.test.ts';
const INTEGRATION_GLOB = 'tests/integration/**/*.test.ts';

const COVERAGE_THRESHOLDS = {
  lines: 85,
  branches: 75,
  functions: 75,
};

const args = process.argv.slice(2);
const options = {
  unit: args.includes('--unit'),
  integration: args.includes('--integration'),
  coverage: args.includes('--coverage'),
  watch: args.includes('--watch'),
  keepTemp: args.includes('--keep-temp'),
  filter: valueAfter('--filter'),
};

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

if (options.unit && options.integration) {
  console.error('Choose either --unit or --integration, not both.');
  process.exit(1);
}

const globs = options.unit
  ? [UNIT_GLOB]
  : options.integration
    ? [INTEGRATION_GLOB]
    : [UNIT_GLOB, INTEGRATION_GLOB];

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-tests-'));
const tempHome = path.join(tempRoot, 'home');
const tempTmp = path.join(tempRoot, 'tmp');
fs.mkdirSync(tempHome, { recursive: true });
fs.mkdirSync(tempTmp, { recursive: true });

const emptyEnvFile = path.join(tempRoot, 'empty.env');
fs.writeFileSync(emptyEnvFile, '');

const env = {
  ...process.env,
  HOME: tempHome,
  USERPROFILE: tempHome,
  TMP: tempTmp,
  TEMP: tempTmp,
  TMPDIR: tempTmp,
  XDG_CONFIG_HOME: path.join(tempHome, '.config'),
  FORGE_TEST: '1',
  NO_COLOR: '1',
  OPENROUTER_API_KEY: 'test-key',
  DOTENV_CONFIG_PATH: emptyEnvFile,
};

const nodeArgs = ['--import', 'tsx', '--test', '--test-timeout=30000', '--test-reporter=spec'];

if (options.coverage) {
  nodeArgs.push(
    '--experimental-test-coverage',
    '--test-coverage-include=src/**',
    '--test-coverage-exclude=src/cli/app.tsx',
    `--test-coverage-lines=${COVERAGE_THRESHOLDS.lines}`,
    `--test-coverage-branches=${COVERAGE_THRESHOLDS.branches}`,
    `--test-coverage-functions=${COVERAGE_THRESHOLDS.functions}`,
  );
}

if (options.watch) {
  // --watch-path is incompatible with --test; plain --watch watches the
  // entry point and all required/imported modules automatically.
  nodeArgs.push('--watch');
}

if (options.filter) {
  nodeArgs.push(`--test-name-pattern=${options.filter}`);
}

nodeArgs.push(...globs);

function cleanup() {
  if (options.keepTemp) {
    console.log(`\n[test] Kept temp root: ${tempRoot}`);
    return;
  }
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    console.warn(`[test] Could not clean temp root ${tempRoot}: ${error.message}`);
  }
}

function finish(code) {
  cleanup();
  process.exit(code ?? 0);
}

if (options.watch) {
  const child = spawn(process.execPath, nodeArgs, { env, stdio: 'inherit' });
  const stop = signal => {
    child.kill(signal);
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
  child.on('exit', (code, signal) => {
    if (signal) finish(1);
    else finish(code);
  });
} else {
  const result = spawnSync(process.execPath, nodeArgs, { env, stdio: 'inherit' });
  if (result.error) {
    console.error(result.error);
    finish(1);
  } else {
    finish(result.status);
  }
}
