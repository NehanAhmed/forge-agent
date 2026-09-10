// session.ts
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
export type SessionSummary = {
  id: string;
  updatedAt: number;
  createdAt: number;
  status: string;
};

const SESSIONS_DIR = path.join(process.cwd(), '.agent-sessions');
const INDEX_FILE = path.join(SESSIONS_DIR, 'index.json');

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}
export function listStateSessions(): SessionSummary[] {
  ensureDir();
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.state.json'));
  const summaries: SessionSummary[] = [];
  for (const file of files) {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8'));
      summaries.push({
        id: state.id,
        updatedAt: state.updatedAt,
        createdAt: state.createdAt,
        status: state.status,
      });
    } catch {
      continue; 
    }
  }

  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);

}
export function getLatestStateSessionId(): string | null {
  const sessions = listStateSessions();
  return sessions.length > 0 ? sessions[0].id : null;
}