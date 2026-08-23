// session.ts
import fs from 'fs';

const SESSION_FILE = '.agent-session.json';

export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  reasoning?: string | null;
  toolCalls?: any[];
  toolCallId?: string;
};

export function loadSession(): Message[] {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
  } catch {
    console.log('Session file corrupted, starting fresh.');
  }
  return [];
}

export function saveSession(messages: Message[]) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(messages, null, 2));
}