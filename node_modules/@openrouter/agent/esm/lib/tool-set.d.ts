import { TOOL_SET_SNAPSHOT } from './async-params.js';
import type { ActivatePartition, ActivationInput, ActivationPredicate, ApplySituationPartition, ConditionalPartition, DeactivatePartition, EmptySituations, InferSituationMap, InitialPartition, Partition, ResolvedToolSnapshot, SituationConfig, SituationMap, SituationNames, StatusByToolMap, ToolIdsOfTuple, WidenedPartition, WidenedSituationMap } from './tool-set-types.js';
import type { Tool } from './tool-types.js';
/**
 * Selects the return type of a mutator call.
 *
 * A mutable `ToolSet` mutates one shared runtime object in place, and any
 * number of aliases can reference that object. If a mutator refined `P`/`Sit`
 * on a mutable instance the way the immutable path does, two aliases of the
 * *same* live object could statically claim different, contradictory exact
 * types the instant either one mutated — unsound, since both aliases still
 * point at the one object whose actual state matches only the latest call.
 *
 * When `TMutable extends true`, mutators therefore return the receiver's own
 * unchanged type (`ToolSet<TTools, TShared, P, Sit, true>`) instead of a
 * refined `NextP`/`NextSit` — every alias of a mutable instance keeps the
 * exact same (already maximally conservative) static type for its whole
 * lifetime, so no alias can ever contradict another. Immutable instances
 * (`TMutable extends false`) are unaffected: each mutation still returns a
 * brand-new object with the precisely refined `NextP`/`NextSit`, exactly as
 * before.
 */
type Mutated<TTools extends readonly Tool[], TShared extends Record<string, unknown>, P extends Partition, Sit extends SituationMap, TMutable extends boolean, NextP extends Partition, NextSit extends SituationMap = Sit> = TMutable extends true ? ToolSet<TTools, TShared, P, Sit, true> : ToolSet<TTools, TShared, NextP, NextSit, false>;
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
export declare class ToolSet<TTools extends readonly Tool[] = readonly Tool[], TShared extends Record<string, unknown> = Record<string, unknown>, P extends Partition = InitialPartition<TTools>, Sit extends SituationMap = EmptySituations, TMutable extends boolean = false> {
    #private;
    /**
     * Phantom carriers so inference utilities can recover partition/situation
     * generics from a concrete instance type.
     */
    readonly _partition?: P;
    readonly _situations?: Sit;
    readonly _shared?: TShared;
    private constructor();
    /** Internal factory. Prefer `createToolSet` for the public API. */
    static create<T extends readonly Tool[], S extends Record<string, unknown> = Record<string, unknown>>(opts: {
        tools: T;
        mutable: true;
    }): ToolSet<T, S, WidenedPartition<T>, WidenedSituationMap, true>;
    static create<T extends readonly Tool[], S extends Record<string, unknown> = Record<string, unknown>>(opts: {
        tools: T;
        mutable?: false;
    }): ToolSet<T, S, InitialPartition<T>, EmptySituations, false>;
    /** All tools in construction order, regardless of activation state. */
    get tools(): TTools;
    activate<const N extends ToolIdsOfTuple<TTools>>(names: N | readonly N[]): Mutated<TTools, TShared, P, Sit, TMutable, ActivatePartition<P, N>>;
    deactivate<const N extends ToolIdsOfTuple<TTools>>(names: N | readonly N[]): Mutated<TTools, TShared, P, Sit, TMutable, DeactivatePartition<P, N>>;
    activateWhen<const N extends ToolIdsOfTuple<TTools>>(name: N, predicate: ActivationPredicate<TShared>): Mutated<TTools, TShared, P, Sit, TMutable, ConditionalPartition<P, N>>;
    activateWhen<const N extends ToolIdsOfTuple<TTools>>(map: {
        readonly [K in N]?: ActivationPredicate<TShared>;
    }): Mutated<TTools, TShared, P, Sit, TMutable, ConditionalPartition<P, N>>;
    deactivateWhen<const N extends ToolIdsOfTuple<TTools>>(name: N, predicate: ActivationPredicate<TShared>): Mutated<TTools, TShared, P, Sit, TMutable, ConditionalPartition<P, N>>;
    deactivateWhen<const N extends ToolIdsOfTuple<TTools>>(map: {
        readonly [K in N]?: ActivationPredicate<TShared>;
    }): Mutated<TTools, TShared, P, Sit, TMutable, ConditionalPartition<P, N>>;
    /**
     * Register named declarative situations. Each situation overlays the base
     * partition — ids it does not mention keep whatever the base set declares.
     *
     * Replaces any previously defined situations (last-call-wins at the registry level).
     */
    defineSituations<const M extends {
        readonly [K in string]: SituationConfig<ToolIdsOfTuple<TTools>, TShared>;
    }>(situations: M): Mutated<TTools, TShared, P, Sit, TMutable, P, InferSituationMap<M>>;
    /**
     * Resolve against the base partition (no situation overlay).
     * When the partition is purely static, the active tool tuple is exact at
     * compile time. Conditional ids expand the compile-time upper bound.
     */
    resolve(input?: ActivationInput<TShared>): ResolvedToolSnapshot<TTools, P, P['conditional']>;
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
    inferTools(input?: ActivationInput<TShared>): {
        tools: Tool[];
        activeTools: string[];
        enabled: readonly string[];
        disabled: readonly string[];
        statusByTool: StatusByToolMap<string>;
        [TOOL_SET_SNAPSHOT]: true;
    };
    /**
     * Resolve a previously-defined named situation. Static situations return
     * exact filtered tool / name tuples at compile time; situations with
     * conditional rules return the sound upper bound, while runtime arrays and
     * `statusByTool` remain exact.
     */
    resolveSituation<Name extends SituationNames<Sit>>(name: Name, input?: ActivationInput<TShared>): ResolvedToolSnapshot<TTools, ApplySituationPartition<P, Sit[Name]>, ApplySituationPartition<P, Sit[Name]>['conditional']>;
    /**
     * Copy state into a fresh, independent instance.
     *
     * Flipping to `mutable: true` starts a *new* mutation lifetime, so — like
     * `ToolSet.create({ mutable: true })` — the clone's partition/situations
     * widen to {@link WidenedPartition}/{@link WidenedSituationMap} rather than
     * inheriting the source's exact `P`/`Sit`: an exact type could otherwise be
     * invalidated the moment the clone is mutated, while other clones or the
     * original remain unaffected. Cloning without flipping mode (mode
     * inherited, including an already-mutable source) or flipping to `false`
     * keeps the source's `P`/`Sit` unchanged.
     */
    clone(opts?: {
        mutable?: undefined;
    }): ToolSet<TTools, TShared, P, Sit, TMutable>;
    clone(opts: {
        mutable: true;
    }): ToolSet<TTools, TShared, WidenedPartition<TTools>, WidenedSituationMap, true>;
    clone(opts: {
        mutable: false;
    }): ToolSet<TTools, TShared, P, Sit, false>;
}
/**
 * Construct a {@link ToolSet}.
 *
 * `mutable: true` deliberately returns a widened partition/situations type
 * (`WidenedPartition`/`WidenedSituationMap`) rather than the exact
 * `InitialPartition`/`EmptySituations` used by the default immutable mode —
 * see {@link Mutated} for why mutable instances need this from construction
 * onward. Omitting `mutable` (or passing `false`) keeps today's exact,
 * precisely-refined immutable partition tracking unchanged.
 */
export declare function createToolSet<const T extends readonly Tool[], TShared extends Record<string, unknown> = Record<string, unknown>>(opts: {
    tools: T;
    mutable: true;
}): ToolSet<T, TShared, WidenedPartition<T>, WidenedSituationMap, true>;
export declare function createToolSet<const T extends readonly Tool[], TShared extends Record<string, unknown> = Record<string, unknown>>(opts: {
    tools: T;
    mutable?: false;
}): ToolSet<T, TShared, InitialPartition<T>, EmptySituations, false>;
export type { ActivatePartition, ActivationInput, ActivationPredicate, ApplySituationPartition, ClientToolName, ClientToolNamesOfTuple, ConditionalPartition, DeactivatePartition, EmptyPartition, EmptySituations, FilterToolsByIds, InferAllIds, InferConditionalIds, InferDisabledIds, InferEnabledIds, InferSituationEntry, InferSituationMap, InferToolSet, InitialPartition, Partition, ResolvedToolSnapshot, ResolvedTools, ServerToolIdOf, ServerToolIdsOfTuple, SituationConditionalRule, SituationConfig, SituationMap, SituationNames, StatusByToolMap, StatusReason, ToolById, ToolIdOf, ToolIdsOfTuple, ToolSetLike, ToolStatusEntry, WidenedPartition, WidenedSituationMap, } from './tool-set-types.js';
//# sourceMappingURL=tool-set.d.ts.map