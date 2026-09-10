/**
 * Doom-loop detection for the tool-execution loop.
 *
 * A "doom loop" is a run that stops making progress while continuing to spend:
 * the model re-issues the same tool call with identical arguments (including
 * repeated *empty* calls and repeated unparseable calls), or emits the same
 * text tokens over and over. This module provides the deterministic detection
 * primitives; `ModelResult` wires them into the loop behind the `doomLoop`
 * option on `callModel`.
 *
 * Design principles:
 *
 * - **Deterministic.** Every verdict is a pure function of the recorded
 *   sequence of tool calls / assistant texts. The same scripted transcript
 *   produces the same verdicts at the same indices — no wall clocks, no
 *   randomness — so the feature is testable without a live model and
 *   portable across SDK ports via shared test vectors.
 * - **Cross-port fingerprints.** Key material is canonicalized per RFC 8785
 *   (JCS) and hashed with SHA-256 over the UTF-8 bytes. Ports (Python/Go)
 *   MUST use a JCS implementation (e.g. pip `jcs`,
 *   `cyberphone/json-canonicalization`), not their stdlib JSON serializer —
 *   the shared vector file `tests/vectors/doom-loop-fingerprints.json` is
 *   the conformance contract.
 * - **Tool-declared identity.** A tool opts into precise loop identity via
 *   `loopKey` on its definition: a function computing key material
 *   (e.g. `({ command, cwd }) => ({ command, cwd })`), a field-name array
 *   (`['command', 'cwd']` — data, not code, so it can ride MCP tool caches
 *   and the `_meta['openrouter/loopKey']` wire field), or `false` to exempt
 *   the tool. Tools declare *what identifies a call*; this module owns
 *   canonicalization and hashing so fingerprints are uniform across tools
 *   and ports.
 * - **Round-scoped streaks.** A streak measures the model *re-issuing a call
 *   after seeing its result*, which requires a model round trip. N identical
 *   calls fanned out in ONE round count once; the duplicates share that
 *   round's decision. A round's identity for one tool is the *set* of
 *   fingerprints it was called with, so a fan-out of distinct arguments
 *   (`read(a), read(b), read(c)`) reissued verbatim accumulates, and every
 *   call in the round reports the round's streak. Ports must declare a
 *   round's complete set before scoring any of its calls (see
 *   `declareRound`): scoring a set as it accumulates makes a superset round
 *   transiently match the previous one, which both fires on real progress
 *   and makes the outcome depend on emission order.
 * - **Graduated response.** Detection feeds a configurable action ladder
 *   (observe → steer → block → stop) rather than killing the run outright.
 * - **Never the cause of failure.** Detection may only affect a run through
 *   its defined actions. Any internal error (unhashable key material,
 *   throwing `loopKey`, corrupt persisted state) degrades to a fallback
 *   identity or skips detection for that call — it never rejects the call
 *   or crashes the run.
 */
/**
 * Escalation actions, weakest to strongest:
 *
 * - `observe`  — emit the `DoomLoopDetected` hook only.
 * - `steer`    — inject a corrective user message before the next model turn
 *   (same mechanism as the Stop hook's `appendPrompt`); the call still runs.
 * - `escalate` — recover by throwing more intelligence at the NEXT turn:
 *   temporarily swap to a stronger model and/or force an `openrouter:advisor`
 *   consult, per the `escalation` config. One-turn overrides; the run
 *   returns to its configured model afterward. Bounded by
 *   `escalation.maxEscalations`; exhausted or unconfigured escalations fall
 *   through to the weaker rungs. The call still runs.
 * - `block`    — refuse the tool call and synthesize an error
 *   `function_call_output` (same shape as a PreToolUse block); the error text
 *   is itself steering, delivered where the model looks.
 * - `stop`     — halt the run before the next model request
 *   (`SessionEnd.reason: 'doom_loop'`).
 */
export type DoomLoopAction = 'observe' | 'steer' | 'escalate' | 'block' | 'stop';
/** Which detector produced a verdict. */
export type DoomLoopDetectorKind = 'tool-fingerprint' | 'server-tool-fingerprint' | 'text-repetition' | 'text-streak';
/**
 * A doom-loop detection event.
 *
 * `streak` is the repetition count that crossed a ladder threshold: for
 * fingerprint detectors the number of consecutive rounds in which that tool
 * was called with the same fingerprint *set* (so a repeated fan-out counts,
 * and every call in the round reports the round's count); for
 * `text-repetition` the number of consecutive repeats of a token block within
 * one response; for `text-streak` the number of consecutive steps with
 * identical assistant text.
 */
export interface DoomLoopVerdict {
    detector: DoomLoopDetectorKind;
    action: DoomLoopAction;
    streak: number;
    /** Deterministic fingerprint of the repeated unit (call identity or text). */
    fingerprint: string;
    /** Present for fingerprint verdicts. */
    toolName?: string;
    /** Human/model-readable explanation; used verbatim for block outputs and steer messages. */
    message: string;
}
/**
 * Result of recording one tool call with the monitor.
 *
 * `duplicateInRound` is true when the same `(toolName, fingerprint)` was
 * already recorded in this round — the streak did NOT increment and the
 * caller should reuse the decision it applied for the first occurrence
 * rather than re-emitting hooks.
 */
export interface DoomLoopCallRecord {
    fingerprint: string;
    streak: number;
    duplicateInRound: boolean;
    verdict?: DoomLoopVerdict;
}
/**
 * Streak thresholds for each action. A threshold of `false` disables that
 * rung. When several rungs are crossed the strongest wins
 * (stop > block > escalate > steer > observe). Thresholds compare with
 * `>=`, so a verdict fires on *every* record at or past a rung — escalating
 * as the streak grows.
 */
export interface DoomLoopLadder {
    observe?: number | false;
    steer?: number | false;
    escalate?: number | false;
    block?: number | false;
    stop?: number | false;
}
/**
 * Recovery configuration for the `escalate` ladder action: what "throw more
 * intelligence at the stuck turn" means for this run. At least one of
 * `model`/`advisor` must be set for the rung to do anything (enabling the
 * rung without a config warns and the rung is skipped).
 */
export interface DoomLoopEscalationConfig {
    /**
     * Model slug to run the NEXT turn on (e.g. a frontier model), replacing
     * the request's configured model for one request only. The following
     * turn reverts automatically.
     */
    model?: string;
    /**
     * Force an `openrouter:advisor` consult on the next turn: the advisor
     * server tool is added to the request with these parameters and
     * `toolChoice` pinned to it, so the stuck model must ask for guidance
     * before doing anything else. The advisor's transcript context defaults
     * to on (`forwardTranscript: true`) so it sees the loop it is diagnosing.
     *
     * `true` uses defaults (advisor model chosen by the platform, transcript
     * forwarded, instructions describing the detected loop); an object is
     * passed through as the advisor tool's `parameters` (missing
     * `instructions`/`forwardTranscript` filled with those defaults).
     */
    advisor?: boolean | Record<string, unknown>;
    /**
     * Escalations are real spend on a run already suspected of wasting it:
     * cap how many times this run may escalate. When exhausted, `escalate`
     * verdicts fall through to the weaker rungs (steer/observe). Default 2.
     */
    maxEscalations?: number;
}
/** Options for within-response text-repetition detection. */
export interface DoomLoopTextOptions {
    /** Master switch for both text detectors. Default true. */
    enabled?: boolean;
    /** Longest repeating token block to search for. Default 16. */
    maxPeriodTokens?: number;
    /** Minimum consecutive repeats of a block to count as repetition. Default 4. */
    minRepeats?: number;
    /** Minimum total tokens covered by the repetition. Default 12. */
    minCoveredTokens?: number;
    /** Only the trailing N tokens of a response are scanned. Default 400. */
    maxWindowTokens?: number;
}
/** Configuration for doom-loop detection. `doomLoop: true` uses all defaults. */
export interface DoomLoopConfig {
    ladder?: DoomLoopLadder;
    /** Text-loop detection. `false` disables; an object tunes it. Default on. */
    text?: boolean | DoomLoopTextOptions;
    /** Recovery behavior for the `escalate` rung. Off unless configured. */
    escalation?: DoomLoopEscalationConfig;
}
/** The `doomLoop` option on `callModel`: `true` for defaults, or a config object. */
export type DoomLoopOption = boolean | DoomLoopConfig;
/** Consecutive-repetition counter for one identity (a tool, or step text). */
export interface DoomLoopStreak {
    fingerprint: string;
    streak: number;
    /**
     * The full fingerprint set of the tool's last round, present only when that
     * round had more than one distinct call. `fingerprint`+`streak` alone cannot
     * say WHICH set earned a count, so without this a fan-out streak either
     * attached to one arbitrary member (refusing a lesser resumed call on first
     * appearance) or had to be discarded at every save — losing block-level
     * evidence across approval pauses and re-baselining on every per-turn
     * resume. Absent for single-call rounds and in pre-existing blobs, where
     * `fingerprint` fully describes the round. Never present on text streaks.
     */
    roundFingerprints?: readonly string[];
    /**
     * Per-call streaks for the tool's last round: fingerprint → number of
     * consecutive rounds that exact call has been issued in. This is the
     * evidence for the PER-CALL detector, which catches a call repeating inside
     * rounds whose other members keep changing (`[a,b]`, `[a,c]`, `[a,d]` — the
     * round set differs every time, but `a` is a 3-peat). Persisted so a repeat
     * spanning a save/resume boundary (approval pause, per-turn resume) keeps
     * counting. Bounded by the width of one round; absent in pre-existing
     * blobs, where per-call evidence simply restarts. Never present on text
     * streaks.
     */
    callStreaks?: Record<string, number>;
}
/**
 * Plain-JSON detector state, persisted inside `ConversationState.doomLoop`
 * so loop memory survives serialize → resume: a resumed doom loop is still
 * a doom loop (provided the resuming call passes `doomLoop` again).
 */
export interface DoomLoopSerializedState {
    /** Per-tool streaks keyed by tool name. Interleaved calls to other tools do not reset a tool's streak. */
    tools: Record<string, DoomLoopStreak>;
    /** Cross-step assistant-text streak. */
    text?: DoomLoopStreak;
    /**
     * The verdict that condemned this run, when a `stop` action armed. Kept
     * across decision-only resumes (`approveToolCalls`/`rejectToolCalls`) so a
     * condemned run stays halted; cleared by a fresh conversational turn
     * (operator intervention = new information). Streaks are kept either way.
     */
    stopVerdict?: DoomLoopVerdict;
    /**
     * Steer guidance queued but not yet injected when the run paused. Flushed
     * into the conversation on resume.
     */
    pendingSteer?: string[];
    /**
     * How many escalation recoveries this conversation has consumed, counted
     * against `escalation.maxEscalations`. Persisted so a resumed run cannot
     * reset its escalation budget by resuming.
     */
    escalationsUsed?: number;
}
/**
 * The result of resolving a tool's `loopKey` declaration against one call's
 * validated arguments. See {@link resolveLoopKeyMaterial}.
 */
export type LoopKeyResolution = {
    kind: 'exempt';
} | {
    kind: 'key';
    keyMaterial: unknown;
} | {
    kind: 'fallback';
    keyMaterial: unknown;
    warning: string;
};
/**
 * Default ladder: observe at 2 consecutive identical rounds, block at 3,
 * stop at 6. Steer is off by default (blocking already delivers feedback in
 * the tool output, where the model looks first).
 */
export declare const DEFAULT_DOOM_LOOP_LADDER: Readonly<Required<DoomLoopLadder>>;
/** Default escalation budget when the rung is enabled without a cap. */
export declare const DEFAULT_MAX_ESCALATIONS = 2;
/** Escalation config with the budget resolved. */
export interface ResolvedEscalationConfig {
    model?: string;
    advisor?: boolean | Record<string, unknown>;
    maxEscalations: number;
}
/** Fully-resolved config used by the monitor. */
export interface ResolvedDoomLoopConfig {
    ladder: Required<DoomLoopLadder>;
    text: Required<DoomLoopTextOptions>;
    escalation: ResolvedEscalationConfig | null;
}
/**
 * Normalize the `doomLoop` option. `undefined` / `false` → null (detection
 * off — the SDK's default posture: explicit control over implicit magic).
 *
 * Overloaded so the direct-construction pattern compiles without a null
 * check: `true` or a config object always yields a resolved config, so
 * `new DoomLoopMonitor(resolveDoomLoopOption(true))` is well-typed. Only the
 * engine's pass-through of a caller's raw option can produce `null`.
 */
export declare function resolveDoomLoopOption(option: DoomLoopConfig | true): ResolvedDoomLoopConfig;
export declare function resolveDoomLoopOption(option: DoomLoopOption | undefined): ResolvedDoomLoopConfig | null;
/**
 * Resolve a tool's `loopKey` declaration (function, `false`, or absent)
 * against one call's validated arguments.
 *
 * - absent (`undefined` declaration) → the full arguments object.
 * - `false` → the tool is statically exempt.
 * - function → called with the arguments, like every other tool hook.
 *   `null` exempts THIS call; `undefined` falls back to the full arguments
 *   (with a warning — a bare `return;` is almost always a bug, and treating
 *   it as key material would collide every call of the tool onto one
 *   fingerprint); a throw falls back to the full arguments (detection must
 *   never take down a run).
 */
export declare function resolveLoopKeyMaterial(loopKey: unknown, args: Record<string, unknown>): LoopKeyResolution;
/**
 * Maximum nesting depth accepted by {@link canonicalizeKeyMaterial}. Real
 * tool arguments come from parsed JSON and stay shallow; anything deeper is
 * hostile or buggy key material and must fail fast (with a catchable error)
 * instead of overflowing the stack.
 */
export declare const MAX_CANONICALIZE_DEPTH = 64;
/**
 * RFC 8785 (JCS) canonical JSON: object keys sorted by UTF-16 code units
 * (recursively), arrays in order, strings and finite numbers serialized per
 * ECMAScript `JSON.stringify` (which IS the JCS serialization — e.g. `-0`
 * canonicalizes to `0`, `1e21` to `1e+21`, lone surrogates to `\udXXX`
 * escapes). Insensitive to key insertion order, so `{a:1,b:2}` and
 * `{b:2,a:1}` canonicalize identically.
 *
 * This is the cross-port contract: Python and Go ports must produce
 * byte-identical canonical strings for the same key material, which means
 * they MUST use an RFC 8785 implementation (pip `jcs`,
 * `cyberphone/json-canonicalization`), not their stdlib JSON serializer
 * (Python's `json.dumps(-0.0)` is `-0.0`, which is NOT JCS).
 *
 * JSON-data-model semantics for JS-only values:
 * - `undefined` / function / symbol object entries are dropped (as
 *   `JSON.stringify` does); in arrays they serialize as `null`.
 *
 * @throws Error on values RFC 8785 cannot represent — non-finite numbers,
 * bigint — plus circular references and nesting deeper than
 * {@link MAX_CANONICALIZE_DEPTH}. Real tool arguments (parsed JSON) can
 * never trigger these; only computed `loopKey` material can, and the engine
 * catches the error and falls back to the full-arguments identity.
 */
export declare function canonicalizeKeyMaterial(value: unknown): string;
/**
 * Fingerprint arbitrary key material: `sha256(utf8(jcs(keyMaterial)))`,
 * lowercase hex (64 chars).
 */
export declare function fingerprintKeyMaterial(keyMaterial: unknown): Promise<string>;
/**
 * Fingerprint a tool call: `sha256(utf8(toolName + '\n' + jcs(keyMaterial)))`,
 * lowercase hex. The tool name participates so `search({q})` and
 * `fetch({q})` with equal arguments never share a fingerprint. This exact
 * construction is the cross-port contract — see
 * `tests/vectors/doom-loop-fingerprints.json`.
 */
export declare function fingerprintToolCall(toolName: string, keyMaterial: unknown): Promise<string>;
/** A detected repeating token block at the tail of a response. */
export interface TextRepetitionResult {
    /** Consecutive repeats of the block (feeds the ladder as the streak). */
    repeats: number;
    /** Block length in whitespace-delimited tokens. */
    periodTokens: number;
    /** repeats × periodTokens. */
    coveredTokens: number;
    /** The repeating block itself. */
    sample: string;
}
/**
 * Detect a period-p token block repeating at the *tail* of `text` — the
 * canonical shape of an in-response token doom loop ("I am stuck. I am
 * stuck. I am stuck. …"). Pure and deterministic: whitespace tokenization,
 * suffix comparison, no heuristics beyond the thresholds.
 *
 * Only the trailing region of the text is examined: a fixed character
 * budget (64 chars per window token) is sliced off the tail before
 * tokenization, so multi-megabyte responses do not pay a full-text token
 * split. The budget is part of the deterministic contract (same text ⇒
 * same slice ⇒ same result).
 *
 * Ties on covered tokens prefer the smallest period (the most repeats), so
 * "no no no no no no" reports p=1 × 6, not p=2 × 3 — the repeat count is
 * what feeds the ladder.
 *
 * Returns null when no block meets `minRepeats` and `minCoveredTokens`
 * within `maxPeriodTokens` / `maxWindowTokens`.
 *
 * KNOWN LIMIT: token blocks must repeat *exactly*. Paraphrased loops ("I am
 * stuck" / "I appear to be stuck" / …) do not trip this detector.
 */
export declare function detectTextRepetition(text: string, options?: Partial<DoomLoopTextOptions>): TextRepetitionResult | null;
/**
 * Map a streak onto the strongest crossed ladder rung.
 *
 * `allowBlock: false` is used for text and server-tool verdicts: the tokens
 * are already emitted / the tool already ran server-side, so there is
 * nothing to block — a block-level streak falls through to escalate/steer
 * (when enabled) or observe, while stop still stops.
 *
 * `allowEscalate: false` disables the escalate rung for this resolution —
 * used when no escalation mechanism is configured or the run's escalation
 * budget is exhausted; the streak falls through to the weaker rungs.
 * Escalation applies to the NEXT model request, so it is available to every
 * detector kind (tool, server-tool, and text verdicts alike).
 */
export declare function resolveLadderAction(ladder: Required<DoomLoopLadder>, streak: number, options: {
    allowBlock: boolean;
    allowEscalate?: boolean;
}): DoomLoopAction | undefined;
/**
 * Pure state machine over the recorded transcript: feed it tool calls and
 * assistant texts, get verdicts back. Holds no engine concerns (hook
 * emission, blocking, steering, stopping live in `ModelResult`), so its
 * behavior is fully exercisable in unit tests and portable as a spec.
 *
 * State is bounded, plain JSON (one streak entry per distinct tool name +
 * one text streak) and round-trips through `ConversationState`.
 */
export declare class DoomLoopMonitor {
    private readonly config;
    private tools;
    private text;
    private escalationsUsed;
    private declaredRound;
    constructor(config: ResolvedDoomLoopConfig, initialState?: unknown);
    /**
     * Declare the complete set of calls a round will make, before any of them
     * is recorded. Each entry is one call's `(toolName, keyMaterial)`; the
     * monitor groups them per tool into that tool's round set.
     *
     * A round's identity is the *set* of fingerprints a tool was called with,
     * so that set has to be known up front. Accumulating it call by call meant
     * a round that is a strict superset of the previous one transiently equaled
     * it while filling — `[a,b]`, `[a,b]`, `[a,b,c]` scored a verdict on the `b`
     * of the third round and refused a call that represented real progress. It
     * was also emission-order dependent: `[c,a,b]` never formed the matching
     * prefix and scored nothing. Declaring the whole set removes both.
     *
     * Idempotent per round, and safe to skip: PER-CALL detection needs no
     * declaration — every repeated `(tool, arguments)` identity accumulates its
     * own consecutive-round count regardless, so an undeclared repeating
     * fan-out still flags each repeated member (server-tool records take that
     * path). What the declaration adds is round-set evidence: the fan-out
     * scored as one unit, with a shared verdict and one steer message, instead
     * of member-by-member. Unhashable key material is skipped here with a
     * warning; the caller's own fallback chain handles it at record time.
     * Never serialized.
     */
    declareRound(round: number, calls: readonly {
        toolName: string;
        keyMaterial: unknown;
    }[]): Promise<void>;
    /**
     * Fingerprint with a per-object memo. The engine hands the SAME key-material
     * object to `declareRound` and then to `recordToolCall` (the resolved
     * `loopKey` output is cached per call id), so without this every checked
     * call is canonicalized and SHA-256'd twice per round. WeakMap keeps the
     * memo from retaining arguments beyond their natural lifetime; primitive
     * key material (raw-string malformed args) skips the memo — it cannot key a
     * WeakMap, and such calls are rare and small. Callers that mutate key
     * material between declare and record get the declare-time identity, which
     * is the identity the round was declared with — the consistent choice.
     */
    private readonly fingerprintMemo;
    private fingerprintOnce;
    /**
     * True when the escalate rung can still fire: a mechanism is configured
     * and the budget is not exhausted.
     */
    canEscalate(): boolean;
    /**
     * Consume one escalation from the budget. The ENGINE calls this when it
     * actually applies the recovery (model swap / advisor forcing) — not at
     * verdict time, so a verdict the engine ends up not honoring (e.g. a hook
     * override) does not burn budget.
     */
    consumeEscalation(): void;
    /**
     * Snapshot the serializable detector state (deep copy). Round markers are
     * deliberately dropped: rounds are meaningful only within one run.
     * `stopVerdict`/`pendingSteer` are owned by the engine, which merges them
     * into the persisted blob alongside this snapshot.
     */
    getState(): DoomLoopSerializedState;
    /**
     * Restore persisted state (from `ConversationState.doomLoop`). Invalid
     * blobs are ignored with a warning — a corrupt detector state must never
     * take down a resumed run. Engine-owned fields (`stopVerdict`,
     * `pendingSteer`) are ignored here; the engine restores them itself.
     */
    restore(state: unknown): void;
    /**
     * Record one tool call and return the streak record plus any verdict.
     *
     * Streak semantics:
     * - Per tool: interleaved calls to *other* tools do not reset a tool's
     *   streak (so `search X, read file, search X, read file` still trips).
     * - Per round: the same `(tool, fingerprint)` recorded again in the SAME
     *   `round` is a duplicate — the streak does not increment
     *   (`duplicateInRound: true`) and the caller should reuse the decision it
     *   applied for the first occurrence. A streak measures the model
     *   re-issuing a call *after seeing its result*, which requires a round
     *   trip; N parallel identical calls in one turn are one piece of
     *   evidence, not N.
     * - A round's identity is the *set* of fingerprints the tool was called
     *   with, not its last call, so a fan-out of distinct arguments reissued
     *   verbatim accumulates. A round whose set differs from the previous
     *   round's — in either direction, including a superset — resets to 1.
     *   Every call in a round reports that round's streak, so the ladder
     *   applies to the round as a unit. See {@link declareRound}: the set must
     *   be declared before the round's first call for this to hold for
     *   multi-call rounds.
     *
     * Blocked calls are recorded like any other — a model re-issuing a
     * blocked call in a later round is stronger loop evidence, not progress.
     *
     * @throws Whatever {@link canonicalizeKeyMaterial} throws for unhashable
     * key material. Callers (the engine) must catch and fall back — see
     * `resolveLoopKeyMaterial` and the engine's fallback chain.
     */
    recordToolCall(toolName: string, keyMaterial: unknown, round: number, options?: {
        /** False for post-execution records (server tools): block is meaningless. */
        allowBlock?: boolean;
        /** Verdict detector label; default 'tool-fingerprint'. */
        detector?: Extract<DoomLoopDetectorKind, 'tool-fingerprint' | 'server-tool-fingerprint'>;
    }): Promise<DoomLoopCallRecord>;
    /**
     * Clear the cross-step text streak. Called by the engine when a late
     * async-tool result is injected into the conversation: the run made
     * observable forward progress, so a model that said "still waiting…"
     * between deliveries must not accumulate a repetition streak toward a
     * false-positive stop. Tool streaks are deliberately kept — re-issuing an
     * identical tool call after a delivery is still loop evidence.
     */
    resetTextStreak(): void;
    /**
     * Record one step's assistant text and return the strongest verdict from
     * the two text detectors:
     *
     * - `text-repetition`: a token block repeating within THIS response; the
     *   repeat count feeds the ladder directly, so a single response spinning
     *   "I am stuck." dozens of times can stop the run immediately.
     * - `text-streak`: byte-identical (whitespace-normalized) text across
     *   consecutive steps. KNOWN LIMIT: paraphrased repetition does not trip.
     *
     * Empty/whitespace-only text (typical for tool-only turns) is a no-op:
     * it neither counts nor resets the cross-step streak, mirroring how
     * interleaved other-tool calls don't reset a tool streak.
     */
    recordAssistantText(text: string): Promise<DoomLoopVerdict | undefined>;
}
//# sourceMappingURL=doom-loop.d.ts.map