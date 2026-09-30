import fs from 'fs';

const target = './dist/cli/App.js';
const shebang = '#!/usr/bin/env node\n';
const content = fs.readFileSync(target, 'utf-8');

if (!content.startsWith(shebang)) {
  fs.writeFileSync(target, shebang + content);
}