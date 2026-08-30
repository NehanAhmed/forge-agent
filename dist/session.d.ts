export type Message = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    reasoning?: string;
    toolCallId?: string;
    toolCalls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
};
export type SessionMeta = {
    id: string;
    cwd: string;
    createdAt: string;
    lastActive: string;
};
export declare function listSessions(): SessionMeta[];
export declare function getLatestSessionId(): string | null;
export declare function loadSession(sessionId: string): Message[];
export declare function saveSession(sessionId: string, messages: Message[]): void;
export declare function createNewSessionId(): string;
//# sourceMappingURL=session.d.ts.map