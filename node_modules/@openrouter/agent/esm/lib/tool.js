import { agentToolBuilder } from './agent-tool.js';
import { TASK_TOOL_NAME } from './tool-check.js';
import { isClientTool, SHARED_CONTEXT_KEY, ToolType } from './tool-types.js';
// Implementation
export function tool(config) {
    if (config === undefined) {
        return tool;
    }
    // 'shared' is reserved for shared context — forbid it as a tool name
    if (config.name === SHARED_CONTEXT_KEY) {
        throw new Error(`Tool name "${SHARED_CONTEXT_KEY}" is reserved for shared context. Choose a different name.`);
    }
    // 'task' is reserved for the universal task-interaction tool the engine
    // registers alongside long-running tools.
    if (config.name === TASK_TOOL_NAME) {
        throw new Error(`Tool name "${TASK_TOOL_NAME}" is reserved for the built-in task-interaction tool. Choose a different name.`);
    }
    // Unified run tool (new kind). Checked before the legacy branches so a
    // config carrying `run` never routes through execute-keyed logic —
    // but AFTER the name guard, keeping every released path on its exact
    // current control flow.
    if ('run' in config && typeof config.run === 'function') {
        return buildUnifiedTool(config);
    }
    // Check for HITL tool (has onToolCalled hook)
    if ('onToolCalled' in config && typeof config.onToolCalled === 'function') {
        // outputSchema is required at the type level for HITL configs, but
        // defensively check at runtime too — JavaScript callers can bypass types.
        const hitlName = config.name;
        if (!('outputSchema' in config) || config.outputSchema === undefined) {
            throw new Error(`HITL tool "${hitlName}" must declare an outputSchema. HITL tools require a schema so caller-supplied responses can be validated before the model sees them.`);
        }
        const fn = {
            name: config.name,
            inputSchema: config.inputSchema,
            outputSchema: config.outputSchema,
            onToolCalled: config.onToolCalled,
        };
        if (config.description !== undefined) {
            fn.description = config.description;
        }
        if (config.contextSchema !== undefined) {
            // contextSchema is readonly on the type (covariance); assignment at
            // construction time is the one sanctioned write.
            fn.contextSchema = config.contextSchema;
        }
        if (config.nextTurnParams !== undefined) {
            fn.nextTurnParams = config.nextTurnParams;
        }
        if (config.requireApproval !== undefined) {
            fn.requireApproval = config.requireApproval;
        }
        if (config.loopKey !== undefined) {
            fn.loopKey = config.loopKey;
        }
        if (config.timeoutMs !== undefined) {
            fn.timeoutMs = config.timeoutMs;
        }
        if (config.maxConcurrency !== undefined) {
            fn.maxConcurrency = config.maxConcurrency;
        }
        if (config.strict !== undefined) {
            fn.strict = config.strict;
        }
        if (config.onResponseReceived !== undefined) {
            fn.onResponseReceived = config.onResponseReceived;
        }
        if (config.toModelOutput !== undefined) {
            fn.toModelOutput = config.toModelOutput;
        }
        return {
            type: ToolType.Function,
            function: fn,
        };
    }
    // Check for manual tool first (execute === false)
    if (config.execute === false) {
        const fn = {
            name: config.name,
            inputSchema: config.inputSchema,
        };
        if (config.description !== undefined) {
            fn.description = config.description;
        }
        if (config.contextSchema !== undefined) {
            // contextSchema is readonly on the type (covariance); assignment at
            // construction time is the one sanctioned write.
            fn.contextSchema = config.contextSchema;
        }
        if (config.nextTurnParams !== undefined) {
            fn.nextTurnParams = config.nextTurnParams;
        }
        if (config.requireApproval !== undefined) {
            fn.requireApproval = config.requireApproval;
        }
        if (config.loopKey !== undefined) {
            fn.loopKey = config.loopKey;
        }
        if (config.timeoutMs !== undefined) {
            fn.timeoutMs = config.timeoutMs;
        }
        if (config.maxConcurrency !== undefined) {
            fn.maxConcurrency = config.maxConcurrency;
        }
        if (config.strict !== undefined) {
            fn.strict = config.strict;
        }
        return {
            type: ToolType.Function,
            function: fn,
        };
    }
    // Check for generator tool (has eventSchema)
    if ('eventSchema' in config && config.eventSchema !== undefined) {
        const fn = {
            name: config.name,
            inputSchema: config.inputSchema,
            eventSchema: config.eventSchema,
            outputSchema: config.outputSchema,
            execute: config.execute,
        };
        if (config.description !== undefined) {
            fn.description = config.description;
        }
        if (config.contextSchema !== undefined) {
            // contextSchema is readonly on the type (covariance); assignment at
            // construction time is the one sanctioned write.
            fn.contextSchema = config.contextSchema;
        }
        if (config.nextTurnParams !== undefined) {
            fn.nextTurnParams = config.nextTurnParams;
        }
        if (config.requireApproval !== undefined) {
            fn.requireApproval = config.requireApproval;
        }
        if (config.loopKey !== undefined) {
            fn.loopKey = config.loopKey;
        }
        if (config.timeoutMs !== undefined) {
            fn.timeoutMs = config.timeoutMs;
        }
        if (config.maxConcurrency !== undefined) {
            fn.maxConcurrency = config.maxConcurrency;
        }
        if ('toModelOutput' in config && config.toModelOutput !== undefined) {
            fn.toModelOutput = config.toModelOutput;
        }
        if (config.strict !== undefined) {
            fn.strict = config.strict;
        }
        return {
            type: ToolType.Function,
            function: fn,
        };
    }
    // Regular tool (has execute function, no eventSchema)
    const functionObj = {
        name: config.name,
        inputSchema: config.inputSchema,
        execute: config.execute,
        ...(config.description !== undefined && {
            description: config.description,
        }),
        ...(config.outputSchema !== undefined && {
            outputSchema: config.outputSchema,
        }),
        ...(config.contextSchema !== undefined && {
            contextSchema: config.contextSchema,
        }),
        ...(config.nextTurnParams !== undefined && {
            nextTurnParams: config.nextTurnParams,
        }),
        ...(config.requireApproval !== undefined && {
            requireApproval: config.requireApproval,
        }),
        ...(config.loopKey !== undefined && {
            loopKey: config.loopKey,
        }),
        ...(config.timeoutMs !== undefined && {
            timeoutMs: config.timeoutMs,
        }),
        ...(config.maxConcurrency !== undefined && {
            maxConcurrency: config.maxConcurrency,
        }),
        ...(config.strict !== undefined && {
            strict: config.strict,
        }),
        ...('toModelOutput' in config &&
            config.toModelOutput !== undefined && {
            toModelOutput: config.toModelOutput,
        }),
    };
    return {
        type: ToolType.Function,
        function: functionObj,
    };
}
/** Copy shared config fields onto a function object when present. */
function assignCommonToolFields(fn, config) {
    const fields = [
        'description',
        'strict',
        'contextSchema',
        'nextTurnParams',
        'requireApproval',
        'loopKey',
        'timeoutMs',
        'maxConcurrency',
        'toModelOutput',
        'eventSchema',
        'ack',
        'graceMs',
        'pollAfterMs',
        'check',
        'logLimits',
    ];
    for (const field of fields) {
        if (config[field] !== undefined) {
            fn[field] = config[field];
        }
    }
}
/**
 * Bind one deferred completion method: resolve the entry shape, prepend the
 * tool itself to any `run` tools, and dispatch through `resumeToolResults`.
 * The resume module is imported lazily to avoid a static
 * tool.ts → call-model.ts → model-result.ts import cycle.
 */
function bindDeferredCompletion(toolValue, toEntry) {
    return async (client, request, options) => {
        const { resumeToolResults } = await import('../inner-loop/resume-tool-results.js');
        const run = request.run;
        return resumeToolResults(client, {
            state: request.state,
            tools: [
                toolValue,
            ],
            // Ownership guard: a taskId handed to an external system must not
            // settle a DIFFERENT tool's task through this tool's methods.
            ...(isClientTool(toolValue) && {
                expectToolName: toolValue.function.name,
            }),
            results: [
                {
                    taskId: request.taskId,
                    ...toEntry(request),
                },
            ],
            ...(request.ifSettled !== undefined && {
                ifSettled: request.ifSettled,
            }),
            ...(run !== undefined && {
                run: {
                    ...run,
                    tools: [
                        toolValue,
                        ...(run.tools ?? []).filter((t) => t !== toolValue),
                    ],
                },
            }),
        }, options);
    };
}
/**
 * Build a unified `run` tool from a config. Deferred tools additionally get
 * the typed `.resolve()/.fail()/.cancel()` completion methods.
 */
function buildUnifiedTool(config) {
    const lifecycle = ('lifecycle' in config ? config.lifecycle : undefined) ?? 'sync';
    // Long-running lifecycles require an outputSchema: the result settles
    // after the round (possibly in another process) and must be validatable
    // without the run's return-type inference. Type level enforces this too;
    // JavaScript callers can bypass types.
    if (lifecycle !== 'sync' && config.outputSchema === undefined) {
        throw new Error(`Tool "${config.name}" (lifecycle: '${lifecycle}') must declare an outputSchema. Long-running results are validated when they settle — possibly long after the round that started them.`);
    }
    const fn = {
        lifecycle,
        name: config.name,
        inputSchema: config.inputSchema,
        run: config.run,
    };
    if (config.outputSchema !== undefined) {
        fn['outputSchema'] = config.outputSchema;
    }
    assignCommonToolFields(fn, config);
    const toolValue = {
        type: ToolType.Function,
        function: fn,
    };
    if (lifecycle !== 'deferred') {
        return toolValue;
    }
    return Object.assign(toolValue, {
        resolve: bindDeferredCompletion(toolValue, (request) => ({
            output: request['output'],
        })),
        fail: bindDeferredCompletion(toolValue, (request) => ({
            error: request['error'] instanceof Error
                ? request['error'].message
                : String(request['error'] ?? 'Task failed'),
        })),
        cancel: bindDeferredCompletion(toolValue, (request) => ({
            error: typeof request['reason'] === 'string' ? request['reason'] : 'Task cancelled',
            status: 'cancelled',
        })),
    });
}
// Attach the agent builder as a namespaced property (expando properties on a
// function declaration merge into its type). `tool.agent()` keeps a
// dedicated builder because its config shape genuinely differs (an `agent`
// run-spec factory + `result` mapper instead of `run`).
tool.agent = agentToolBuilder;
/**
 * Creates an OpenRouter server-executed tool. OpenRouter runs the tool (web
 * search, datetime, image generation, etc.) and returns the output item in
 * the response — no client-side execute function is needed.
 *
 * The config shape is derived directly from the SDK's request-tool union
 * (`models.ResponsesRequestToolUnion`) via `Exclude` + `Extract`, so new
 * server-tool variants added upstream become valid here with zero changes
 * in this SDK. Provide the `type` literal and the remaining fields narrow
 * to match the chosen tool.
 *
 * Each server tool carries a stable tool-set `id` (default `server:${type}`)
 * so activation APIs can address it. Override via the optional second argument.
 *
 * @example
 * ```typescript
 * const tools = [
 *   serverTool({ type: 'web_search_2025_08_26', engine: 'exa', maxResults: 10 }),
 *   serverTool({ type: 'openrouter:datetime', parameters: { timezone: 'UTC' } }),
 *   serverTool({ type: 'image_generation', size: '1024x1024', quality: 'high' }),
 *   serverTool({ type: 'web_search_2025_08_26' }, { id: 'server:public_search' }),
 * ];
 * ```
 */
export function serverTool(config, options) {
    if (options?.id === '') {
        throw new Error('Server tool ID must not be empty');
    }
    const id = (options?.id ?? `server:${config.type}`);
    return {
        _brand: 'server-tool',
        config,
        id,
    };
}
/**
 * Add the additive MCP brand to an already-built client tool (see
 * {@link McpBranded}). Non-mutating: returns a shallow copy carrying `_mcp`, so
 * the tool's runtime behavior and wire shape are unchanged — only its type (and
 * the runtime {@link isMcpTool} check) now identify it as MCP-originated. Used
 * by `@openrouter/mcp` to mark wrapped remote tools.
 *
 * `options.loopKey` attaches a doom-loop identity to the wrapped tool —
 * the only injection point for MCP tools, whose remote definitions cannot
 * carry client-side functions. Like every other tool hook it is a computed
 * function over the call's arguments (or `false` to exempt).
 */
export function markMcp(toolToMark, options) {
    const marked = {
        ...toolToMark,
        _mcp: true,
    };
    if (options?.loopKey !== undefined && isClientTool(marked)) {
        marked.function = {
            ...marked.function,
            loopKey: options.loopKey,
        };
    }
    return marked;
}
//#endregion
//# sourceMappingURL=tool.js.map