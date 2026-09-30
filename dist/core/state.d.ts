import type { StateAccessor, ConversationState } from '@openrouter/agent';
import type { Message } from '../types/index.js';
type SessionMetaEntry = {
    id: string;
    title: string;
    createdAt: number;
};
export type SessionSummary = {
    id: string;
    updatedAt: number;
    createdAt: number;
    status: string;
};
export declare function createStateAccessor(sessionId: string, compactionConfig?: import("./compaction.js").CompactionConfig): StateAccessor;
export declare function listSessions(): SessionSummary[];
export declare function getLatestSessionId(): string | null;
export declare function stateToMessages(state: ConversationState): Message[];
export { compactIfNeeded, DEFAULT_COMPACTION_CONFIG, type CompactionConfig } from './compaction.js';
export declare function saveSessionTitle(sessionId: string, title: string): void;
export declare function getSessionTitle(sessionId: string): string | null;
export declare function listSessionMeta(): SessionMetaEntry[];
//# sourceMappingURL=state.d.ts.map