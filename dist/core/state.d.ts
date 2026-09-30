import type { StateAccessor, ConversationState } from '@openrouter/agent';
import type { Message } from '../types/index.js';
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
//# sourceMappingURL=state.d.ts.map