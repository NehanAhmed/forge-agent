export type Message = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    reasoning?: string;
    toolCalls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
    toolCallId?: string;
};
export type DisplayEntry = {
    id: number;
    kind: 'user' | 'reasoning' | 'tool_call' | 'tool_result' | 'assistant' | 'info';
    text: string;
};
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
};
export type SessionSummary = {
    id: string;
    updatedAt: number;
    createdAt: number;
    status: string;
};
export type OnConfirm = (description: string) => Promise<boolean>;
//# sourceMappingURL=index.d.ts.map