import { z } from 'zod';
export type OnConfirm = (description: string) => Promise<boolean>;
export declare function createTools(onConfirm: OnConfirm): (import("@openrouter/agent").ToolWithExecute<z.ZodObject<{
    command: z.ZodString;
}, z.core.$strip>, z.core.$ZodType<{
    error: string;
    output?: undefined;
} | {
    error?: undefined;
    output: string;
}, unknown, z.core.$ZodTypeInternals<{
    error: string;
    output?: undefined;
} | {
    error?: undefined;
    output: string;
}, unknown>>, Record<string, unknown>, z.core.$ZodObject<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, z.core.$ZodObjectConfig>, "run_bash"> | import("@openrouter/agent").ToolWithExecute<z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>, z.core.$ZodType<{
    content: string;
}, unknown, z.core.$ZodTypeInternals<{
    content: string;
}, unknown>>, Record<string, unknown>, z.core.$ZodObject<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, z.core.$ZodObjectConfig>, "read_file"> | import("@openrouter/agent").ToolWithExecute<z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>, z.core.$ZodType<{
    error: string;
    result?: undefined;
} | {
    error?: undefined;
    result: string;
}, unknown, z.core.$ZodTypeInternals<{
    error: string;
    result?: undefined;
} | {
    error?: undefined;
    result: string;
}, unknown>>, Record<string, unknown>, z.core.$ZodObject<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, z.core.$ZodObjectConfig>, "write_file"> | import("@openrouter/agent").ToolWithExecute<z.ZodObject<{
    path: z.ZodString;
    stringToReplace: z.ZodString;
    newString: z.ZodString;
}, z.core.$strip>, z.core.$ZodType<{
    result?: undefined;
    error: string;
} | {
    error?: undefined;
    result: string;
}, unknown, z.core.$ZodTypeInternals<{
    result?: undefined;
    error: string;
} | {
    error?: undefined;
    result: string;
}, unknown>>, Record<string, unknown>, z.core.$ZodObject<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, z.core.$ZodObjectConfig>, "replace_string_in_file"> | import("@openrouter/agent").ToolWithExecute<z.ZodObject<{
    task: z.ZodString;
}, z.core.$strip>, z.core.$ZodType<{
    result: string;
}, unknown, z.core.$ZodTypeInternals<{
    result: string;
}, unknown>>, Record<string, unknown>, z.core.$ZodObject<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, z.core.$ZodObjectConfig>, "spawn_sub_agent"> | import("@openrouter/agent").ToolWithExecute<z.ZodObject<{
    pattern: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.core.$ZodType<{
    result: string;
}, unknown, z.core.$ZodTypeInternals<{
    result: string;
}, unknown>>, Record<string, unknown>, z.core.$ZodObject<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, z.core.$ZodObjectConfig>, "search_code">)[];
//# sourceMappingURL=definitions.d.ts.map