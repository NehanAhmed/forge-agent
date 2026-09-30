#!/usr/bin/env node
import { type ConversationState } from '@openrouter/agent';
export type LogEvent = {
    type: 'reasoning_delta';
    content: string;
} | {
    type: 'tool_call';
    name: string;
    args: any;
} | {
    type: 'tool_result';
    content: string;
} | {
    type: 'assistant_delta';
    content: string;
} | {
    type: 'info';
    content: string;
} | {
    type: 'sub_agent';
    content: string;
};
export type Callbacks = {
    onLog: (event: LogEvent) => void;
    onConfirm: (description: string) => Promise<boolean>;
    onUsage: (inputTokens: number, outputTokens: number, cost: number | undefined) => void;
};
export declare function runAgent(sessionId: string, userMessage: string, callbacks: Callbacks): Promise<ConversationState>;
//# sourceMappingURL=agent-cli.d.ts.map