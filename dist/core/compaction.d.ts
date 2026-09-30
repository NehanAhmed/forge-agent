import type { ConversationState } from '@openrouter/agent';
export interface CompactionConfig {
    thresholdTokens: number;
    keepRecentTurns: number;
    model: string;
}
export declare const DEFAULT_COMPACTION_CONFIG: CompactionConfig;
export declare function compactIfNeeded(state: ConversationState, config?: CompactionConfig): Promise<ConversationState>;
//# sourceMappingURL=compaction.d.ts.map