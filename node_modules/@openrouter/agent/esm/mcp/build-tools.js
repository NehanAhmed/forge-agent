import { MCPError } from './errors.js';
import { buildResourceTools } from './resource-tools.js';
import { wrapMcpTool } from './tool-wrapper.js';
function resourcesEnabled(option) {
    if (option === undefined) {
        return true;
    }
    return option === true || (typeof option === 'object' && option !== null);
}
/** Apply allow/deny filters to discovered MCP tool definitions. */
export function filterToolDefs(defs, includeTools, excludeTools) {
    const include = includeTools !== undefined ? new Set(includeTools) : undefined;
    const exclude = new Set(excludeTools ?? []);
    return defs.filter((def) => {
        if (include !== undefined && !include.has(def.name)) {
            return false;
        }
        return !exclude.has(def.name);
    });
}
/**
 * Build the full ordered tool list for a handle: filtered + wrapped MCP tools,
 * plus synthetic resource tools when enabled. Throws on a name collision so two
 * tools never silently shadow each other in `callModel`.
 */
export function buildTools(options) {
    const filtered = filterToolDefs(options.toolDefs, options.includeTools, options.excludeTools);
    const wrapOptions = {
        client: options.client,
        ...(options.namePrefix !== undefined && {
            namePrefix: options.namePrefix,
        }),
        ...(options.schemaMode !== undefined && {
            schemaMode: options.schemaMode,
        }),
        ...(options.emitProgress !== undefined && {
            emitProgress: options.emitProgress,
        }),
        ...(options.loopKeys !== undefined && {
            loopKeys: options.loopKeys,
        }),
        ...(options.signal !== undefined && {
            signal: options.signal,
        }),
    };
    const tools = filtered.map((def) => wrapMcpTool(def, wrapOptions));
    if (options.serverHasResources && resourcesEnabled(options.resources)) {
        tools.push(...buildResourceTools({
            client: options.client,
            ...(options.namePrefix !== undefined && {
                namePrefix: options.namePrefix,
            }),
            ...(options.signal !== undefined && {
                signal: options.signal,
            }),
        }));
    }
    assertNoDuplicateNames(tools);
    return tools;
}
function toolName(tool) {
    if ('function' in tool && typeof tool.function.name === 'string') {
        return tool.function.name;
    }
    return undefined;
}
function assertNoDuplicateNames(tools) {
    const seen = new Set();
    for (const tool of tools) {
        const name = toolName(tool);
        if (name === undefined) {
            continue;
        }
        if (seen.has(name)) {
            throw new MCPError(`Duplicate tool name "${name}". Use toolNamePrefix or excludeTools to disambiguate.`);
        }
        seen.add(name);
    }
}
//# sourceMappingURL=build-tools.js.map