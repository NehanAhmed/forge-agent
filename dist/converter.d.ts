import type { Message } from './session.js';
export type DisplayEntry = {
    id: number;
    kind: 'user' | 'reasoning' | 'tool_call' | 'tool_result' | 'assistant' | 'info';
    text: string;
};
export declare function messagesToEntries(messages: Message[], startId?: number): DisplayEntry[];
//# sourceMappingURL=converter.d.ts.map