import fs from 'fs';
import path from 'path';
import type { ConversationState } from '@openrouter/agent';

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
}

export interface TodoList {
  version: number;
  items: TodoItem[];
  updatedAt: number;
}

const TODO_STORAGE_VERSION = 1;
const MAX_TODOS = 50;
const MAX_CONTENT_LENGTH = 200;

function getTodoPath(sessionId: string): string {
  const sessionsDir = path.join(process.cwd(), '.agent-sessions');
  return path.join(sessionsDir, `${sessionId}.todos.json`);
}

export function createEmptyTodoList(): TodoList {
  return {
    version: TODO_STORAGE_VERSION,
    items: [],
    updatedAt: Date.now(),
  };
}

function validateTodoList(todos: TodoItem[]): { valid: boolean; error?: string } {
  if (todos.length > MAX_TODOS) {
    return { valid: false, error: `Too many todos: ${todos.length} (max ${MAX_TODOS})` };
  }

  const ids = new Set<string>();
  let inProgressCount = 0;
  const inProgressIds: string[] = [];

  for (const todo of todos) {
    // Check ID uniqueness
    if (ids.has(todo.id)) {
      return { valid: false, error: `Duplicate todo id: ${todo.id}` };
    }
    ids.add(todo.id);

    // Check status
    if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
      return { valid: false, error: `Invalid status "${todo.status}" for todo ${todo.id}. Must be pending, in_progress, or completed.` };
    }

    if (todo.status === 'in_progress') {
      inProgressCount++;
      inProgressIds.push(todo.id);
    }

    // Check content
    const trimmed = todo.content.trim();
    if (!trimmed) {
      return { valid: false, error: `Todo ${todo.id} has empty content` };
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      return { valid: false, error: `Todo ${todo.id} content exceeds ${MAX_CONTENT_LENGTH} characters` };
    }
  }

  if (inProgressCount > 1) {
    return { valid: false, error: `Only one todo can be in_progress; found ${inProgressCount}: ${inProgressIds.join(', ')}` };
  }

  return { valid: true };
}

export function loadTodos(sessionId: string): TodoList {
  const todoPath = getTodoPath(sessionId);
  if (!fs.existsSync(todoPath)) {
    return createEmptyTodoList();
  }
  try {
    const data = fs.readFileSync(todoPath, 'utf-8');
    const parsed = JSON.parse(data) as TodoList;
    // Validate structure and version
    if (parsed.version !== TODO_STORAGE_VERSION || !Array.isArray(parsed.items)) {
      console.warn(`[todos] Invalid or outdated todo data for session ${sessionId}, starting fresh`);
      return createEmptyTodoList();
    }
    const validation = validateTodoList(parsed.items);
    if (!validation.valid) {
      console.warn(`[todos] Corrupted todo data for session ${sessionId}: ${validation.error}, starting fresh`);
      return createEmptyTodoList();
    }
    return parsed;
  } catch (err) {
    console.warn(`[todos] Failed to load todos for session ${sessionId}: ${err}, starting fresh`);
    return createEmptyTodoList();
  }
}

export function saveTodos(sessionId: string, todos: TodoItem[]): TodoList {
  const validation = validateTodoList(todos);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const todoList: TodoList = {
    version: TODO_STORAGE_VERSION,
    items: todos,
    updatedAt: Date.now(),
  };

  const todoPath = getTodoPath(sessionId);
  const tempPath = `${todoPath}.tmp`;

  // Atomic write: write to temp file then rename
  fs.writeFileSync(tempPath, JSON.stringify(todoList, null, 2), 'utf-8');
  fs.renameSync(tempPath, todoPath);

  return todoList;
}

export function getTodoCounts(todos: TodoItem[]): { total: number; completed: number; inProgress: number; pending: number } {
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  for (const todo of todos) {
    if (todo.status === 'completed') completed++;
    else if (todo.status === 'in_progress') inProgress++;
    else pending++;
  }
  return { total: todos.length, completed, inProgress, pending };
}

export function formatTodoListOutput(todos: TodoItem[]): string {
  if (todos.length === 0) {
    return 'No todos.';
  }
  const counts = getTodoCounts(todos);
  const lines = [`Todos (${counts.completed}/${counts.total} completed)`];
  for (const todo of todos) {
    const marker = todo.status === 'completed' ? '✓' : todo.status === 'in_progress' ? '◐' : '○';
    lines.push(`  ${marker} ${todo.content}`);
  }
  return lines.join('\n');
}

// Integration with ConversationState for persistence alongside agent state
export function extractTodosFromState(state: ConversationState | null): TodoList {
  if (!state) return createEmptyTodoList();
  const stateAny = state as any;
  if (stateAny.todos && typeof stateAny.todos === 'object' && Array.isArray(stateAny.todos.items)) {
    const validation = validateTodoList(stateAny.todos.items);
    if (validation.valid) {
      return stateAny.todos as TodoList;
    }
  }
  return createEmptyTodoList();
}

export function mergeTodosIntoState(state: ConversationState, todos: TodoList): ConversationState {
  return {
    ...state,
    todos,
    updatedAt: Date.now(),
  } as ConversationState & { todos: TodoList };
}