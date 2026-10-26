import fs from 'node:fs';

const target = './dist/cli/app.js';
const shebang = '#!/usr/bin/env node\n';

if (!fs.existsSync(target)) {
  throw new Error(`Expected build output at ${target}`);
}

const content = fs.readFileSync(target, 'utf-8');

if (!content.startsWith(shebang)) {
  fs.writeFileSync(target, shebang + content);
}