import fs from 'node:fs';
import path from 'node:path';
import { createTask, type Task } from '../../src/core/task.js';

export function taskFixture(overrides: Partial<Task> = {}): Task {
  const base = createTask(overrides.id ?? 'task_fixture', overrides.goal ?? 'fixture goal');
  return { ...base, ...overrides };
}

export function writeTreeFile(root: string, relativePath: string, content: string): string {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}
