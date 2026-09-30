import fs from 'fs';
import path from 'path';
import { compactIfNeeded, DEFAULT_COMPACTION_CONFIG } from './compaction.js';
const META_SESSION_DIR = path.join(process.cwd(), '.forge', 'meta');
const ensureMetaDir = () => {
    if (!fs.existsSync(META_SESSION_DIR)) {
        fs.mkdirSync(META_SESSION_DIR, { recursive: true });
    }
};
ensureMetaDir();
const META_FILE = path.join(META_SESSION_DIR, 'meta.json');
const SESSIONS_DIR = path.join(process.cwd(), '.agent-sessions');
function ensureDir() {
    if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
}
function getStatePath(sessionId) {
    return path.join(SESSIONS_DIR, `${sessionId}.state.json`);
}
export function createStateAccessor(sessionId, compactionConfig = DEFAULT_COMPACTION_CONFIG) {
    ensureDir();
    const statePath = getStatePath(sessionId);
    return {
        load: async () => {
            if (!fs.existsSync(statePath))
                return null;
            try {
                const data = fs.readFileSync(statePath, 'utf-8');
                return JSON.parse(data);
            }
            catch {
                return null;
            }
        },
        save: async (state) => {
            const compacted = await compactIfNeeded(state, compactionConfig);
            fs.writeFileSync(statePath, JSON.stringify(compacted, null, 2));
        },
    };
}
export function listSessions() {
    ensureDir();
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.state.json'));
    const summaries = [];
    for (const file of files) {
        try {
            const state = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8'));
            summaries.push({
                id: state.id,
                updatedAt: state.updatedAt,
                createdAt: state.createdAt,
                status: state.status,
            });
        }
        catch {
            continue;
        }
    }
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}
export function getLatestSessionId() {
    const sessions = listSessions();
    return sessions[0]?.id ?? null;
}
function extractTextContent(content) {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content.map(c => extractTextContent(c)).join('');
    }
    if (content && typeof content === 'object' && 'text' in content) {
        return String(content.text);
    }
    return '';
}
function messageItemToLegacy(msg) {
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
            type: 'function',
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
export function stateToMessages(state) {
    const messages = [];
    const stateAny = state;
    if (stateAny.messages) {
        for (const msg of stateAny.messages) {
            const legacy = messageItemToLegacy(msg);
            if (legacy) {
                messages.push(legacy);
            }
        }
    }
    return messages;
}
export { compactIfNeeded, DEFAULT_COMPACTION_CONFIG } from './compaction.js';
function readMeta() {
    if (!fs.existsSync(META_FILE))
        return [];
    try {
        return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
    }
    catch {
        return [];
    }
}
export function saveSessionTitle(sessionId, title) {
    const meta = readMeta();
    if (!meta.some(m => m.id === sessionId)) {
        meta.push({ id: sessionId, title, createdAt: Date.now() });
        fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
    }
}
export function getSessionTitle(sessionId) {
    return readMeta().find(m => m.id === sessionId)?.title ?? null;
}
export function listSessionMeta() {
    return readMeta();
}
//# sourceMappingURL=state.js.map