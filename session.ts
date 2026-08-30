// session.ts
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const SESSION_FILE = '.agent-session.json';

export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  reasoning?: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

export type SessionMeta = {
  id: string;
  cwd: string;
  createdAt: string;
  lastActive: string;
};

const SESSIONS_DIR = path.join(process.cwd(), '.agent-sessions');
const INDEX_FILE = path.join(SESSIONS_DIR, 'index.json');

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}
export function listSessions(): SessionMeta[] {
  ensureDir();
  if (!fs.existsSync(INDEX_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    return [];
  }
}
export function getLatestSessionId(): string | null {
  const sessions = listSessions();
  if (sessions.length === 0) return null;
  sessions.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  if(!sessions || sessions.length === 0) {
    console.log(`No Sessions found, creating a new one.`);
    return null;
  }
  return sessions[0].id;
}

export function loadSession(sessionId: string): Message[] {
  ensureDir();
  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(sessionPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  } catch {
    return [];
  }
}

export function saveSession(sessionId: string, messages: Message[]) {
  ensureDir();
  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  fs.writeFileSync(sessionPath, JSON.stringify(messages, null, 2));

  // Update Index
  const sessions = listSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  const now = new Date().toISOString();

  if (idx >= 0) {
    sessions[idx].lastActive = now;
  } else {
    sessions.push({
      id: sessionId,
      cwd: process.cwd(),
      createdAt: now,
      lastActive: now,
    });
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(sessions, null, 2));
}
export function createNewSessionId(): string {
  return randomUUID();
}