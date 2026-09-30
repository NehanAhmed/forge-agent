import fs from 'fs';
import path from 'path';
import type { StateAccessor, ConversationState } from '@openrouter/agent';
import type { Message } from '../types/index.js';
import { compactIfNeeded, DEFAULT_COMPACTION_CONFIG } from './compaction.js';
type SessionMetaEntry = { id: string; title: string; createdAt: number };

const META_SESSION_DIR = path.join(process.cwd(), '.forge', 'meta');
const ensureMetaDir = () => {
  if (!fs.existsSync(META_SESSION_DIR)) {
    fs.mkdirSync(META_SESSION_DIR, { recursive: true });
  }
};
ensureMetaDir();
const META_FILE = path.join(META_SESSION_DIR, 'meta.json');
export type SessionSummary = {
  id: string;
  updatedAt: number;
  createdAt: number;
  status: string;
};

const SESSIONS_DIR = path.join(process.cwd(), '.agent-sessions');

function ensureDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function getStatePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.state.json`);
}

export function createStateAccessor(
  sessionId: string,
  compactionConfig = DEFAULT_COMPACTION_CONFIG
): StateAccessor {
  ensureDir();
  const statePath = getStatePath(sessionId);

  return {
    load: async (): Promise<ConversationState | null> => {
      if (!fs.existsSync(statePath)) return null;
      try {
        const data = fs.readFileSync(statePath, 'utf-8');
        return JSON.parse(data) as ConversationState;
      } catch {
        return null;
      }
    },
    save: async (state: ConversationState): Promise<void> => {
      const compacted = await compactIfNeeded(state, compactionConfig);
      fs.writeFileSync(statePath, JSON.stringify(compacted, null, 2));
    },
  };
}

export function listSessions(): SessionSummary[] {
  ensureDir();
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.state.json'));
  const summaries: SessionSummary[] = [];

  for (const file of files) {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8')) as ConversationState;
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

export function getLatestSessionId(): string | null {
  const sessions = listSessions();
  return sessions[0]?.id ?? null;
}

type SDKMessage = {
  role?: string;
  content?: string | unknown[];
  reasoning?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  callId?: string;
  output?: string | unknown[];
  type?: string;
};

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => extractTextContent(c)).join('');
  }
  if (content && typeof content === 'object' && 'text' in content) {
    return String((content as { text: unknown }).text);
  }
  return '';
}

function messageItemToLegacy(msg: SDKMessage): Message | null {
  const role = msg.role;
  if (role === 'user') {
    return {
      role: 'user',
      content: extractTextContent(msg.content ?? ''),
    };
  }
  if (role === 'assistant') {
    const toolCalls = msg.toolCalls?.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.arguments },
    }));
    return {
      role: 'assistant',
      content: msg.content ? extractTextContent(msg.content) : null,
      reasoning: msg.reasoning,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
    };
  }
  if (role === 'tool') {
    return {
      role: 'tool',
      toolCallId: msg.callId ?? '',
      content: extractTextContent(msg.output ?? ''),
    };
  }
  if (role === 'system' || role === 'developer') {
    return {
      role: 'system',
      content: extractTextContent(msg.content ?? ''),
    };
  }
  if (msg.type === 'reasoning') {
    return null;
  }
  return null;
}

export function stateToMessages(state: ConversationState): Message[] {
  const messages: Message[] = [];

  const stateAny = state as { messages?: unknown[] };
  if (stateAny.messages) {
    for (const msg of stateAny.messages) {
      const legacy = messageItemToLegacy(msg as SDKMessage);
      if (legacy) {
        messages.push(legacy);
      }
    }
  }

  return messages;
}

export { compactIfNeeded, DEFAULT_COMPACTION_CONFIG, type CompactionConfig } from './compaction.js';



function readMeta(): SessionMetaEntry[] {
  if (!fs.existsSync(META_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveSessionTitle(sessionId: string, title: string) {
  const meta = readMeta();
  if (!meta.some(m => m.id === sessionId)) {
    meta.push({ id: sessionId, title, createdAt: Date.now() });
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  }
}

export function getSessionTitle(sessionId: string): string | null {
  return readMeta().find(m => m.id === sessionId)?.title ?? null;
}

export function listSessionMeta(): SessionMetaEntry[] {
  return readMeta();
}