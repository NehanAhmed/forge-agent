import * as z from 'zod';
import { markMcp, tool } from '../lib/tool.js';
import { mapCallToolResult } from './result-mapper.js';
import { isJsonSchemaObject } from './schema/json-schema-guards.js';
import { convertMcpInputSchema } from './schema/json-schema-to-zod.js';
/** Event yielded by a progress-emitting generator tool. */
const progressEventSchema = z.object({
    type: z.literal('progress'),
    progress: z.number(),
    total: z.optional(z.number()),
    message: z.optional(z.string()),
});
function callToolResultIsRaw(value) {
    return isJsonSchemaObject(value);
}
async function invokeTool(invokeArgs) {
    const { options, mcpName, args, onprogress } = invokeArgs;
    // SDK v2 signature is `callTool(params, options)` — v1's middle result-schema
    // argument is gone. Passing three args here would silently drop `signal` and
    // `onprogress` into an unread slot, killing cancellation and progress.
    const result = await options.client.callTool({
        name: mcpName,
        arguments: args,
    }, {
        ...(options.signal !== undefined && {
            signal: options.signal,
        }),
        ...(onprogress !== undefined && {
            onprogress,
        }),
    });
    if (!callToolResultIsRaw(result)) {
        return '';
    }
    return mapCallToolResult(mcpName, result);
}
/**
 * Wrap one discovered MCP tool as an `@openrouter/agent` tool. Emits a
 * generator tool (streaming progress events) when `emitProgress` is on,
 * otherwise a regular tool. The input schema (and output schema, when declared)
 * are converted to Zod so the model sees faithful parameters. The abort signal,
 * if supplied, is threaded into the underlying `callTool`.
 */
export function wrapMcpTool(def, options) {
    const name = `${options.namePrefix ?? ''}${def.name}`;
    const inputSchema = convertMcpInputSchema(def.inputSchema, options.schemaMode);
    const outputSchema = def.outputSchema !== undefined
        ? convertMcpInputSchema(def.outputSchema, options.schemaMode)
        : undefined;
    // Client-side config wins over the server-advertised declaration; both
    // ride markMcp's injection point so every tool kind gets the same wiring.
    const loopKey = options.loopKeys !== undefined && Object.hasOwn(options.loopKeys, def.name)
        ? options.loopKeys[def.name]
        : def.loopKey;
    const markOptions = loopKey !== undefined
        ? {
            loopKey,
        }
        : undefined;
    if (options.emitProgress === true) {
        return markMcp(tool({
            name,
            ...(def.description !== undefined && {
                description: def.description,
            }),
            inputSchema,
            eventSchema: progressEventSchema,
            outputSchema: outputSchema ?? z.unknown(),
            execute: async function* (args) {
                const queue = [];
                let notify;
                const onprogress = (p) => {
                    queue.push({
                        type: 'progress',
                        progress: p.progress,
                        ...(p.total !== undefined && {
                            total: p.total,
                        }),
                        ...(typeof p.message === 'string' && {
                            message: p.message,
                        }),
                    });
                    notify?.();
                };
                const resultPromise = invokeTool({
                    options,
                    mcpName: def.name,
                    args,
                    onprogress,
                });
                let done = false;
                const finalize = resultPromise.finally(() => {
                    done = true;
                    notify?.();
                });
                while (!done || queue.length > 0) {
                    while (queue.length > 0) {
                        const event = queue.shift();
                        if (event !== undefined) {
                            yield event;
                        }
                    }
                    if (done) {
                        break;
                    }
                    await new Promise((resolve) => {
                        notify = resolve;
                    });
                    notify = undefined;
                }
                return await finalize;
            },
        }), markOptions);
    }
    return markMcp(tool({
        name,
        ...(def.description !== undefined && {
            description: def.description,
        }),
        inputSchema,
        ...(outputSchema !== undefined && {
            outputSchema,
        }),
        execute: (args) => invokeTool({
            options,
            mcpName: def.name,
            args,
        }),
    }), markOptions);
}
//# sourceMappingURL=tool-wrapper.js.map