import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`Package verification failed: ${message}`);
  process.exit(1);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) {
  fail(`package version is not valid semver: ${pkg.version}`);
}
if (pkg.version === '0.1.3') fail('0.1.3 is already published and cannot be reused');
if (pkg.main) fail('CLI-only package must not declare "main"');
if (pkg.engines?.node !== '>=22') fail('expected engines.node to be ">=22"');
if (pkg.publishConfig?.access !== 'public') fail('expected publishConfig.access to be "public"');
if (pkg.packageManager !== 'pnpm@12.6.0') fail('expected packageManager pnpm@12.6.0');
if (pkg.dependencies?.typescript) fail('typescript must be a devDependency');
if (pkg.dependencies?.tsx) fail('tsx must be a devDependency');
if (!pkg.devDependencies?.typescript) fail('typescript is missing from devDependencies');
if (!pkg.devDependencies?.tsx) fail('tsx is missing from devDependencies');
if (!pkg.bin?.forge) fail('bin.forge is missing');
if (!pkg.files?.includes('dist')) fail('files must include dist');

if (fs.existsSync('package-lock.json')) fail('package-lock.json must not be committed');
if (fs.existsSync('src/index.ts')) fail('src/index.ts must not exist for a CLI-only package');
if (!fs.existsSync('dist/cli/app.js')) fail('dist/cli/app.js is missing');

const cliFiles = fs.readdirSync('dist/cli');
if (!cliFiles.includes('app.js')) fail('dist/cli/app.js is missing');
if (cliFiles.includes('App.js')) fail('dist/cli/App.js must not exist');
if (fs.existsSync('dist/index.js')) fail('dist/index.js must not be published');
if (fs.existsSync('dist/index.d.ts')) fail('dist/index.d.ts must not be published');

const shebang = fs.readFileSync('dist/cli/app.js', 'utf8').split(/\r?\n/, 1)[0];
if (shebang !== '#!/usr/bin/env node') fail('dist/cli/app.js must start with a node shebang');

const dashboardDir = path.join('dist', 'cli', 'components', 'dashboard');
if (fs.existsSync(dashboardDir)) {
  const stale = ['ApprovalsInbox.js', 'DashboardInput.js', 'StatusFooter.js', 'TaskTree.js'];
  const files = fs.readdirSync(dashboardDir);
  const found = stale.filter(file => files.includes(file));
  if (found.length > 0) fail(`stale dashboard files present: ${found.join(', ')}`);
}

const maps = walk('dist').filter(file => file.endsWith('.map'));
if (maps.length > 0) fail(`source/declaration maps must not be shipped: ${maps.slice(0, 3).join(', ')}`);

const zod = JSON.parse(fs.readFileSync('node_modules/zod/package.json', 'utf8'));
const [major, minor, patch] = zod.version.split('.').map(Number);
if (major < 4 || (major === 4 && minor < 6) || (major === 4 && minor === 6 && patch < 6)) {
  fail(`zod must be >=4.6.6, found ${zod.version}`);
}

console.log('Package verification passed.');
