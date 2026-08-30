export declare function runBash(command: string): string;
export declare function readFile(path: string): string;
export declare function writeFile(path: string, content: string): string;
export declare function editFile(path: string, oldContent: string, newContent: string): string;
export declare const toolExecutors: Record<string, (args: any) => string>;
//# sourceMappingURL=toolHelper.d.ts.map