#!/usr/bin/env node
import { type Message } from './session.js';
export type LogEvent = {
    type: 'reasoning';
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
};
export type Callbacks = {
    onLog: (event: LogEvent) => void;
    onConfirm: (description: string) => Promise<boolean>;
};
export declare function runAgent(sessionId: string, messages: Message[], callbacks: Callbacks): Promise<Message[]>;
//# sourceMappingURL=agent-cli.d.ts.map