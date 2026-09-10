var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ToolSet_instances, _a, _ToolSet_index, _ToolSet_activation, _ToolSet_situations, _ToolSet_mutable, _ToolSet_assertKnown, _ToolSet_withPartitionMutation, _ToolSet_normalizePredicateArg, _ToolSet_resolveWithActivation, _ToolSet_evaluate, _ToolSet_toStatusEntry;
import { TOOL_SET_SNAPSHOT } from './async-params.js';
import { isServerTool } from './tool-types.js';
function toIdArray(names) {
    return typeof names === 'string'
        ? [
            names,
        ]
        : names;
}
function isPredicateMap(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function defaultServerId(tool) {
    return typeof tool.id === 'string' && tool.id.length > 0 ? tool.id : `server:${tool.config.type}`;
}
function toolId(tool) {
    if (isServerTool(tool)) {
        return defaultServerId(tool);
    }
    // After the ServerToolBase narrow, remaining tools are client tools with function.name.
    return tool.function.name;
}
function indexTools(tools) {
    const toolById = new Map();
    const orderedIds = [];
    const clientNames = new Set();
    const serverIds = new Set();
    for (const t of tools) {
        const id = toolId(t);
        if (toolById.has(id)) {
            throw new Error(`Duplicate tool ID: "${id}"`);
        }
        toolById.set(id, t);
        orderedIds.push(id);
        if (isServerTool(t)) {
            serverIds.add(id);
        }
        else {
            clientNames.add(id);
        }
    }
    return {
        orderedTools: tools,
        orderedIds: orderedIds,
        toolById,
        clientNames,
        serverIds,
    };
}
function cloneActivationMap(activation) {
    return new Map(activation);
}
function cloneSituationsMap(situations) {
    return new Map(situations);
}
function normalizeConditionalRule(situation, toolId, rule) {
    if (typeof rule === 'function') {
        return {
            mode: 'activateWhen',
            predicate: rule,
        };
    }
    if (typeof rule !== 'object' ||
        rule === null ||
        !('predicate' in rule) ||
        typeof rule.predicate !== 'function' ||
        ('mode' in rule &&
            rule.mode !== undefined &&
            rule.mode !== 'activateWhen' &&
            rule.mode !== 'deactivateWhen')) {
        throw new Error(`Situation "${situation}": conditional rule for tool "${toolId}" must be a function or { mode, predicate } object`);
    }
    const mode = 'mode' in rule ? rule.mode : undefined;
    return {
        mode: (mode ?? 'activateWhen'),
        predicate: rule.predicate,
    };
}
/**
 * Immutable-by-default stateful set of tools with a three-way static
 * partition (enabled / disabled / conditional) and optional named situations.
 *
 * @typeParam TTools - Concrete ordered tools tuple
 * @typeParam TShared - Shared context shape for predicates
 * @typeParam P - Compile-time partition of tool-set IDs
 * @typeParam Sit - Named situation registry
 * @typeParam TMutable - Whether this instance mutates in place. Mutable
 *   instances deliberately carry a single widened `P`/`Sit` for their entire
 *   lifetime (see {@link Mutated}) so that every alias stays sound; immutable
 *   instances keep the exact, precisely-refined `P`/`Sit` per instance.
 */
export class ToolSet {
    constructor(index, activation, situations, mutable) {
        _ToolSet_instances.add(this);
        _ToolSet_index.set(this, void 0);
        _ToolSet_activation.set(this, void 0);
        _ToolSet_situations.set(this, void 0);
        _ToolSet_mutable.set(this, void 0);
        __classPrivateFieldSet(this, _ToolSet_index, index, "f");
        __classPrivateFieldSet(this, _ToolSet_activation, activation, "f");
        __classPrivateFieldSet(this, _ToolSet_situations, situations, "f");
        __classPrivateFieldSet(this, _ToolSet_mutable, mutable, "f");
    }
    static create(opts) {
        const mutable = opts.mutable ?? false;
        if (mutable) {
            return new _a(indexTools(opts.tools), new Map(), new Map(), true);
        }
        return new _a(indexTools(opts.tools), new Map(), new Map(), false);
    }
    /** All tools in construction order, regardless of activation state. */
    get tools() {
        return __classPrivateFieldGet(this, _ToolSet_index, "f").orderedTools;
    }
    activate(names) {
        const list = toIdArray(names);
        for (const n of list) {
            __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_assertKnown).call(this, n);
        }
        return __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_withPartitionMutation).call(this, (activation) => {
            for (const n of list) {
                activation.set(n, {
                    kind: 'static',
                    active: true,
                    source: 'activate',
                });
            }
        });
    }
    deactivate(names) {
        const list = toIdArray(names);
        for (const n of list) {
            __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_assertKnown).call(this, n);
        }
        return __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_withPartitionMutation).call(this, (activation) => {
            for (const n of list) {
                activation.set(n, {
                    kind: 'static',
                    active: false,
                    source: 'deactivate',
                });
            }
        });
    }
    activateWhen(nameOrMap, predicate) {
        const entries = __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_normalizePredicateArg).call(this, nameOrMap, predicate);
        return __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_withPartitionMutation).call(this, (activation) => {
            for (const [n, p] of entries) {
                activation.set(n, {
                    kind: 'activateWhen',
                    predicate: p,
                    source: 'activateWhen',
                });
            }
        });
    }
    deactivateWhen(nameOrMap, predicate) {
        const entries = __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_normalizePredicateArg).call(this, nameOrMap, predicate);
        return __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_withPartitionMutation).call(this, (activation) => {
            for (const [n, p] of entries) {
                activation.set(n, {
                    kind: 'deactivateWhen',
                    predicate: p,
                    source: 'deactivateWhen',
                });
            }
        });
    }
    /**
     * Register named declarative situations. Each situation overlays the base
     * partition — ids it does not mention keep whatever the base set declares.
     *
     * Replaces any previously defined situations (last-call-wins at the registry level).
     */
    defineSituations(situations) {
        const next = new Map();
        for (const [name, config] of Object.entries(situations)) {
            const enabled = config.enabled ?? [];
            const disabled = config.disabled ?? [];
            const conditionalEntries = Object.entries(config.conditional ?? {}).filter((entry) => entry[1] !== undefined);
            const seen = new Set();
            const record = (id, bucket) => {
                __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_assertKnown).call(this, id);
                if (seen.has(id)) {
                    throw new Error(`Situation "${name}" lists tool "${id}" more than once (across enabled/disabled/conditional)`);
                }
                seen.add(id);
                void bucket;
            };
            for (const id of enabled) {
                record(id, 'enabled');
            }
            for (const id of disabled) {
                record(id, 'disabled');
            }
            for (const [id] of conditionalEntries) {
                record(id, 'conditional');
            }
            next.set(name, {
                enabled: [
                    ...enabled,
                ],
                disabled: [
                    ...disabled,
                ],
                conditional: conditionalEntries.map(([id, rule]) => {
                    const normalized = normalizeConditionalRule(name, id, rule);
                    return {
                        id,
                        mode: normalized.mode,
                        predicate: normalized.predicate,
                    };
                }),
            });
        }
        if (__classPrivateFieldGet(this, _ToolSet_mutable, "f")) {
            // Same rationale as #withPartitionMutation: `this` keeps its existing
            // (already widened) static type instead of claiming a freshly refined
            // `InferSituationMap<M>`, so every alias stays statically consistent.
            __classPrivateFieldGet(this, _ToolSet_situations, "f").clear();
            for (const [k, v] of next) {
                __classPrivateFieldGet(this, _ToolSet_situations, "f").set(k, v);
            }
            return this;
        }
        return new _a(__classPrivateFieldGet(this, _ToolSet_index, "f"), cloneActivationMap(__classPrivateFieldGet(this, _ToolSet_activation, "f")), next, false);
    }
    /**
     * Resolve against the base partition (no situation overlay).
     * When the partition is purely static, the active tool tuple is exact at
     * compile time. Conditional ids expand the compile-time upper bound.
     */
    resolve(input) {
        return __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_resolveWithActivation).call(this, __classPrivateFieldGet(this, _ToolSet_activation, "f"), input);
    }
    /**
     * Back-compat alias for {@link resolve}. Prefer `resolve` for new code.
     *
     * Returns the full snapshot, including metadata (`enabled`, `disabled`,
     * `statusByTool`) that is not a valid `callModel` input. Only `tools` and
     * `activeTools` are meant to reach `callModel` — spread those two fields
     * (or use `resolve(...).callModel`, which contains exactly them),
     * not the whole return value of this method:
     *
     * ```ts
     * const { tools, activeTools } = toolSet.inferTools();
     * callModel(client, { model, input, tools, activeTools });
     * ```
     *
     * This result carries an internal marker so `callModel` can strip its
     * metadata when the whole object is spread. Identically named request fields
     * on ordinary, unmarked inputs are preserved.
     */
    inferTools(input) {
        const snapshot = this.resolve(input);
        return {
            tools: [
                ...snapshot.tools,
            ],
            activeTools: [
                ...snapshot.activeTools,
            ],
            enabled: snapshot.enabled,
            disabled: snapshot.disabled,
            statusByTool: snapshot.statusByTool,
            [TOOL_SET_SNAPSHOT]: true,
        };
    }
    /**
     * Resolve a previously-defined named situation. Static situations return
     * exact filtered tool / name tuples at compile time; situations with
     * conditional rules return the sound upper bound, while runtime arrays and
     * `statusByTool` remain exact.
     */
    resolveSituation(name, input) {
        const situation = __classPrivateFieldGet(this, _ToolSet_situations, "f").get(name);
        if (!situation) {
            throw new Error(`Unknown situation: "${String(name)}"`);
        }
        const activation = cloneActivationMap(__classPrivateFieldGet(this, _ToolSet_activation, "f"));
        for (const id of situation.enabled) {
            activation.set(id, {
                kind: 'static',
                active: true,
                source: 'situation',
            });
        }
        for (const id of situation.disabled) {
            activation.set(id, {
                kind: 'static',
                active: false,
                source: 'situation',
            });
        }
        for (const entry of situation.conditional) {
            activation.set(entry.id, {
                kind: entry.mode,
                predicate: entry.predicate,
                source: 'situation',
            });
        }
        return __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_resolveWithActivation).call(this, activation, input);
    }
    clone(opts) {
        const mutable = opts?.mutable ?? __classPrivateFieldGet(this, _ToolSet_mutable, "f");
        if (opts?.mutable === true && !__classPrivateFieldGet(this, _ToolSet_mutable, "f")) {
            return new _a(__classPrivateFieldGet(this, _ToolSet_index, "f"), cloneActivationMap(__classPrivateFieldGet(this, _ToolSet_activation, "f")), cloneSituationsMap(__classPrivateFieldGet(this, _ToolSet_situations, "f")), true);
        }
        return new _a(__classPrivateFieldGet(this, _ToolSet_index, "f"), cloneActivationMap(__classPrivateFieldGet(this, _ToolSet_activation, "f")), cloneSituationsMap(__classPrivateFieldGet(this, _ToolSet_situations, "f")), mutable);
    }
}
_a = ToolSet, _ToolSet_index = new WeakMap(), _ToolSet_activation = new WeakMap(), _ToolSet_situations = new WeakMap(), _ToolSet_mutable = new WeakMap(), _ToolSet_instances = new WeakSet(), _ToolSet_assertKnown = function _ToolSet_assertKnown(id) {
    if (!__classPrivateFieldGet(this, _ToolSet_index, "f").toolById.has(id)) {
        throw new Error(`Unknown tool: "${id}"`);
    }
}, _ToolSet_withPartitionMutation = function _ToolSet_withPartitionMutation(mutate) {
    if (__classPrivateFieldGet(this, _ToolSet_mutable, "f")) {
        // Mutable mode mutates the shared runtime object in place and returns
        // `this` unchanged: every alias of a mutable instance already carries
        // the same widened `P`/`Sit`, so returning that same (unrefined) type
        // here — instead of a freshly refined `NextP` — keeps all aliases
        // statically consistent with the one object they actually reference.
        mutate(__classPrivateFieldGet(this, _ToolSet_activation, "f"));
        return this;
    }
    const nextActivation = cloneActivationMap(__classPrivateFieldGet(this, _ToolSet_activation, "f"));
    mutate(nextActivation);
    return new _a(__classPrivateFieldGet(this, _ToolSet_index, "f"), nextActivation, __classPrivateFieldGet(this, _ToolSet_situations, "f"), false);
}, _ToolSet_normalizePredicateArg = function _ToolSet_normalizePredicateArg(nameOrMap, predicate) {
    if (typeof nameOrMap === 'string') {
        if (!predicate) {
            throw new Error('activateWhen/deactivateWhen requires a predicate when called with a name');
        }
        __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_assertKnown).call(this, nameOrMap);
        return [
            [
                nameOrMap,
                predicate,
            ],
        ];
    }
    if (!isPredicateMap(nameOrMap)) {
        throw new Error('activateWhen/deactivateWhen requires a name+predicate or predicate map');
    }
    const entries = Object.entries(nameOrMap).filter((entry) => typeof entry[1] === 'function');
    for (const [n] of entries) {
        __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_assertKnown).call(this, n);
    }
    return entries;
}, _ToolSet_resolveWithActivation = function _ToolSet_resolveWithActivation(activation, input) {
    const resolvedInput = input ?? {};
    const tools = [];
    const activeTools = [];
    const enabled = [];
    const disabled = [];
    // Object.create(null), not `{}`: tool IDs are caller-supplied strings
    // (serverTool only rejects the empty string), so `__proto__` is a valid
    // ID. Assigning `statusByTool['__proto__'] = ...` on a `{}` object would
    // invoke the inherited setter and reassign the object's prototype
    // instead of creating an own property, silently dropping that ID from
    // the exhaustive map. Same reasoning as extractServerToolIdentity in
    // packages/agent/src/lib/model-result.ts and the subset builder in
    // packages/agent/src/lib/doom-loop.ts.
    const statusByTool = Object.create(null);
    for (const id of __classPrivateFieldGet(this, _ToolSet_index, "f").orderedIds) {
        const tool = __classPrivateFieldGet(this, _ToolSet_index, "f").toolById.get(id);
        if (!tool) {
            continue;
        }
        const { active, entry } = __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_evaluate).call(this, id, activation, resolvedInput);
        const status = __classPrivateFieldGet(this, _ToolSet_instances, "m", _ToolSet_toStatusEntry).call(this, active, entry);
        statusByTool[id] = status;
        if (active) {
            tools.push(tool);
            enabled.push(id);
            if (!isServerTool(tool)) {
                activeTools.push(id);
            }
        }
        else {
            disabled.push(id);
        }
    }
    return {
        tools,
        activeTools,
        callModel: {
            tools,
            activeTools,
        },
        enabled,
        disabled,
        statusByTool,
        [TOOL_SET_SNAPSHOT]: true,
    };
}, _ToolSet_evaluate = function _ToolSet_evaluate(id, activation, input) {
    const entry = activation.get(id);
    if (!entry) {
        return {
            active: true,
            entry: undefined,
        };
    }
    if (entry.kind === 'static') {
        return {
            active: entry.active,
            entry,
        };
    }
    if (entry.kind === 'activateWhen') {
        return {
            active: entry.predicate(input) === true,
            entry,
        };
    }
    return {
        active: entry.predicate(input) !== true,
        entry,
    };
}, _ToolSet_toStatusEntry = function _ToolSet_toStatusEntry(active, entry) {
    if (!entry) {
        return {
            enabled: active,
            reason: 'default',
        };
    }
    if (entry.kind === 'static') {
        const directive = entry.active ? 'activate' : 'deactivate';
        const reason = entry.source === 'situation'
            ? 'situation'
            : entry.source === 'default'
                ? 'default'
                : directive;
        return {
            enabled: active,
            reason,
            directive,
        };
    }
    const directive = entry.kind;
    const reason = entry.source === 'situation' ? 'situation' : directive;
    return {
        enabled: active,
        reason,
        directive,
        predicate: true,
    };
};
export function createToolSet(opts) {
    if (opts.mutable) {
        return ToolSet.create({
            tools: opts.tools,
            mutable: true,
        });
    }
    return ToolSet.create({
        tools: opts.tools,
        mutable: false,
    });
}
//# sourceMappingURL=tool-set.js.map