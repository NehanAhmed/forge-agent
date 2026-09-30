export declare function runBash(command: string): string;
export declare function readFile(path: string): string;
export declare function writeFile(path: string, content: string): string;
export declare function editFile(path: string, oldContent: string, newContent: string): string;
export declare function spawnSubAgent(task: string): Promise<string>;
export declare function searchCodebase(pattern: string, path?: string, maxResults?: number): string;
export declare const toolExecutors: Record<string, (args: any) => string | Promise<string>>;
//# sourceMappingURL=implementations.d.ts.map