#!/usr/bin/env node
/**
 * Demo script for the Forge Task Engine.
 * Runs several tasks against a scripted fake model and prints the event stream,
 * demonstrating queueing, concurrency, worktree isolation, approvals, and review.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { TaskManager } from '../src/core/task-manager.js';

function createTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-demo-repo-'));
  execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Demo User'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'demo@example.com'], { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Demo Project\n\nInitial repository state.\n');
  fs.writeFileSync(path.join(dir, 'app.js'), '// Main application\nconsole.log("Hello from app!");\n');
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

// Scripted fake model that answers differently per goal
function createScriptedModel() {
  return (params: { input: string; tools?: any[] }) => {
    const input = params.input.toLowerCase();
    let text = 'Task completed.';

    if (input.includes('read') || input.includes('analyze')) {
      text = 'Analyzed repository files: found README.md and app.js. Everything looks clean.';
    } else if (input.includes('feature') || input.includes('auth')) {
      text = 'Added authentication module in auth.js and updated app.js.';
    } else if (input.includes('test') || input.includes('lint')) {
      text = 'Ran test suite and linter: 0 errors found.';
    }

    return {
      async *getTextStream() {
        yield text;
      },
      async getText() {
        return text;
      },
      async getUsage() {
        return { inputTokens: 120, outputTokens: 60, cost: 0.0005 };
      },
      async *getReasoningStream() {},
      async *getToolCallsStream() {},
    };
  };
}

async function runDemo() {
  console.log('='.repeat(60));
  console.log(' Forge Task Engine — Multi-Task & Worktree Isolation Demo');
  console.log('='.repeat(60));

  const demoRepo = createTempGitRepo();
  console.log(`\n📁 Initialized demo git repository at: ${demoRepo}`);

  // Create TaskManager with concurrency cap of 2 and fake model
  const manager = new TaskManager({
    concurrency: 2,
    repoCwd: demoRepo,
    callModel: createScriptedModel(),
  });

  // Subscribe to live events
  manager.on('task:created', ({ taskId, task }: any) => {
    console.log(`\n[EVENT] task:created -> ID: ${taskId.slice(0, 16)}... | Goal: "${task.goal}" | Policy: ${task.policy} | Isolation: ${task.isolation}`);
  });

  manager.on('task:status', ({ taskId, oldStatus, newStatus }: any) => {
    console.log(`[EVENT] task:status  -> ID: ${taskId.slice(0, 16)}... | ${oldStatus ?? 'new'} -> ${newStatus}`);
  });

  manager.on('task:log', ({ taskId, entry }: any) => {
    console.log(`  [LOG] [${entry.type.toUpperCase()}] ${entry.content}`);
  });

  manager.on('task:review', ({ taskId, reviewState }: any) => {
    console.log(`[EVENT] task:review  -> ID: ${taskId.slice(0, 16)}... | Review state: ${reviewState}`);
  });

  manager.on('approval:requested', ({ approvalId, taskId, approval }: any) => {
    console.log(`[EVENT] approval:req -> ID: ${approvalId} for task ${taskId.slice(0, 16)}... | Tool: ${approval.tool}`);
    // Auto-approve after a brief pause
    setTimeout(() => {
      console.log(`[DEMO] Auto-approving request ${approvalId}...`);
      manager.resolveApproval(approvalId, 'approve');
    }, 100);
  });

  console.log('\n--- Creating 3 Tasks (Concurrency limit = 2) ---');

  const task1 = manager.create('Analyze repository structure', {
    readOnly: true,
  });

  const task2 = manager.create('Add user authentication feature', {
    isolation: 'worktree',
    policy: 'auto_in_worktree',
  });

  const task3 = manager.create('Run linter and tests', {
    isolation: 'worktree',
    policy: 'ask',
  });

  const demoTaskIds = [task1.id, task2.id, task3.id];

  // Wait for our 3 demo tasks to settle
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const pending = demoTaskIds
        .map(id => manager.get(id))
        .filter(t => t && (t.status === 'queued' || t.status === 'running' || t.status === 'waiting_approval'));
      if (pending.length === 0) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  console.log('\n' + '='.repeat(60));
  console.log(' Final Tasks Summary Table');
  console.log('='.repeat(60));
  console.table(
    demoTaskIds.map(id => manager.get(id)!).map(t => ({
      ID: t.id.slice(0, 16) + '...',
      Goal: t.goal.slice(0, 30),
      Status: t.status,
      Isolation: t.isolation,
      Policy: t.policy,
      Review: t.reviewState,
      Tokens: t.usage.inputTokens + t.usage.outputTokens,
    }))
  );

  console.log('\n--- Reviewing & Merging Task 2 Changes ---');
  try {
    const diff = await manager.getDiff(task2.id);
    console.log(`Task 2 diff files: ${diff.files.length} changed`);
    const mergeResult = await manager.merge(task2.id, { message: 'Merge task 2: auth feature' });
    console.log(`Task 2 merge result: ${mergeResult.success ? 'SUCCESS' : 'FAILED'}`);
  } catch (err: any) {
    console.log(`Task 2 review note: ${err.message}`);
  }

  // Cleanup
  await manager.shutdown();
  fs.rmSync(demoRepo, { recursive: true, force: true });
  console.log('\nDemo complete.');
}

runDemo().catch(console.error);
