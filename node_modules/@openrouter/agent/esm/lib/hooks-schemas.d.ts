import * as z4 from 'zod/v4';
import type { $ZodType } from 'zod/v4/core';
export declare const HookName: {
    readonly PreToolUse: "PreToolUse";
    readonly PostToolUse: "PostToolUse";
    readonly PostToolUseFailure: "PostToolUseFailure";
    readonly UserPromptSubmit: "UserPromptSubmit";
    readonly Stop: "Stop";
    readonly PermissionRequest: "PermissionRequest";
    readonly SessionStart: "SessionStart";
    readonly SessionEnd: "SessionEnd";
    readonly PostModelCall: "PostModelCall";
    readonly DoomLoopDetected: "DoomLoopDetected";
};
export type HookName = (typeof HookName)[keyof typeof HookName];
/**
 * A hook definition is a pair of Zod schemas: one for the payload and one for the result.
 */
export interface HookDefinition {
    readonly payload: $ZodType;
    readonly result: $ZodType;
}
/**
 * A registry maps hook names to their definitions.
 */
export type HookRegistry = Record<string, HookDefinition>;
export declare const PreToolUsePayloadSchema: z4.ZodObject<{
    toolName: z4.ZodString;
    toolInput: z4.ZodRecord<z4.ZodString, z4.ZodUnknown>;
}, z4.z.core.$strip>;
export type PreToolUsePayload = Readonly<z4.infer<typeof PreToolUsePayloadSchema>>;
export declare const PostToolUsePayloadSchema: z4.ZodObject<{
    toolName: z4.ZodString;
    toolInput: z4.ZodRecord<z4.ZodString, z4.ZodUnknown>;
    toolOutput: z4.ZodUnknown;
    durationMs: z4.ZodNumber;
}, z4.z.core.$strip>;
export type PostToolUsePayload = Readonly<z4.infer<typeof PostToolUsePayloadSchema>>;
export declare const PostToolUseFailurePayloadSchema: z4.ZodObject<{
    toolName: z4.ZodString;
    toolInput: z4.ZodRecord<z4.ZodString, z4.ZodUnknown>;
    error: z4.ZodUnknown;
}, z4.z.core.$strip>;
/**
 * Fired when an entered tool lifecycle fails after PreToolUse, including a
 * mutated-input approval denial/rejection or schema-invalid mutation.
 * Initial approval denials and rejections do not enter the lifecycle.
 */
export type PostToolUseFailurePayload = Readonly<z4.infer<typeof PostToolUseFailurePayloadSchema>>;
export declare const StopPayloadSchema: z4.ZodObject<{
    reason: z4.ZodEnum<{
        max_turns: "max_turns";
    }>;
}, z4.z.core.$strip>;
export type StopPayload = Readonly<z4.infer<typeof StopPayloadSchema>>;
export declare const PermissionRequestPayloadSchema: z4.ZodObject<{
    toolName: z4.ZodString;
    toolInput: z4.ZodRecord<z4.ZodString, z4.ZodUnknown>;
    riskLevel: z4.ZodEnum<{
        low: "low";
        high: "high";
        medium: "medium";
    }>;
}, z4.z.core.$strip>;
export type PermissionRequestPayload = Readonly<z4.infer<typeof PermissionRequestPayloadSchema>>;
export declare const UserPromptSubmitPayloadSchema: z4.ZodObject<{
    prompt: z4.ZodString;
}, z4.z.core.$strip>;
export type UserPromptSubmitPayload = Readonly<z4.infer<typeof UserPromptSubmitPayloadSchema>>;
export declare const SessionStartPayloadSchema: z4.ZodObject<{
    config: z4.ZodOptional<z4.ZodRecord<z4.ZodString, z4.ZodUnknown>>;
}, z4.z.core.$strip>;
declare const ModelCallUsageSchema: z4.ZodObject<{
    inputTokens: z4.ZodNumber;
    outputTokens: z4.ZodNumber;
    totalTokens: z4.ZodNumber;
    cachedTokens: z4.ZodNumber;
    reasoningTokens: z4.ZodNumber;
    cost: z4.ZodOptional<z4.ZodNumber>;
}, z4.z.core.$strip>;
export type ModelCallUsage = Readonly<z4.infer<typeof ModelCallUsageSchema>>;
export type SessionStartPayload = Readonly<z4.infer<typeof SessionStartPayloadSchema>>;
declare const SessionUsageTotalsSchema: z4.ZodObject<{
    inputTokens: z4.ZodNumber;
    outputTokens: z4.ZodNumber;
    totalTokens: z4.ZodNumber;
    cachedTokens: z4.ZodNumber;
    reasoningTokens: z4.ZodNumber;
    cost: z4.ZodOptional<z4.ZodNumber>;
    modelCalls: z4.ZodNumber;
}, z4.z.core.$strip>;
export declare const SessionEndPayloadSchema: z4.ZodObject<{
    reason: z4.ZodEnum<{
        error: "error";
        complete: "complete";
        user: "user";
        max_turns: "max_turns";
        doom_loop: "doom_loop";
    }>;
    totalUsage: z4.ZodOptional<z4.ZodObject<{
        inputTokens: z4.ZodNumber;
        outputTokens: z4.ZodNumber;
        totalTokens: z4.ZodNumber;
        cachedTokens: z4.ZodNumber;
        reasoningTokens: z4.ZodNumber;
        cost: z4.ZodOptional<z4.ZodNumber>;
        modelCalls: z4.ZodNumber;
    }, z4.z.core.$strip>>;
}, z4.z.core.$strip>;
export declare const PostModelCallPayloadSchema: z4.ZodObject<{
    sessionId: z4.ZodString;
    responseId: z4.ZodString;
    model: z4.ZodString;
    durationMs: z4.ZodNumber;
    turnType: z4.ZodEnum<{
        initial: "initial";
        resume: "resume";
        tool_round: "tool_round";
        final: "final";
        retry: "retry";
    }>;
    turnNumber: z4.ZodNumber;
    usage: z4.ZodOptional<z4.ZodObject<{
        inputTokens: z4.ZodNumber;
        outputTokens: z4.ZodNumber;
        totalTokens: z4.ZodNumber;
        cachedTokens: z4.ZodNumber;
        reasoningTokens: z4.ZodNumber;
        cost: z4.ZodOptional<z4.ZodNumber>;
    }, z4.z.core.$strip>>;
}, z4.z.core.$strip>;
export declare const DoomLoopDetectedPayloadSchema: z4.ZodObject<{
    detector: z4.ZodEnum<{
        "tool-fingerprint": "tool-fingerprint";
        "server-tool-fingerprint": "server-tool-fingerprint";
        "text-repetition": "text-repetition";
        "text-streak": "text-streak";
    }>;
    action: z4.ZodEnum<{
        observe: "observe";
        steer: "steer";
        escalate: "escalate";
        block: "block";
        stop: "stop";
    }>;
    streak: z4.ZodNumber;
    fingerprint: z4.ZodString;
    toolName: z4.ZodOptional<z4.ZodString>;
    toolInput: z4.ZodOptional<z4.ZodRecord<z4.ZodString, z4.ZodUnknown>>;
    message: z4.ZodString;
}, z4.z.core.$strip>;
export type DoomLoopDetectedPayload = Readonly<z4.infer<typeof DoomLoopDetectedPayloadSchema>>;
export type SessionEndPayload = Readonly<z4.infer<typeof SessionEndPayloadSchema>>;
export type PostModelCallPayload = Readonly<z4.infer<typeof PostModelCallPayloadSchema>>;
export type SessionUsageTotals = Readonly<z4.infer<typeof SessionUsageTotalsSchema>>;
export declare const PreToolUseResultSchema: z4.ZodObject<{
    mutatedInput: z4.ZodOptional<z4.ZodRecord<z4.ZodString, z4.ZodUnknown>>;
    block: z4.ZodOptional<z4.ZodUnion<readonly [z4.ZodBoolean, z4.ZodString]>>;
}, z4.z.core.$strip>;
export type PreToolUseResult = Readonly<z4.infer<typeof PreToolUseResultSchema>>;
export declare const StopResultSchema: z4.ZodObject<{
    forceResume: z4.ZodOptional<z4.ZodBoolean>;
    appendPrompt: z4.ZodOptional<z4.ZodString>;
}, z4.z.core.$strip>;
/**
 * Result of a Stop hook handler.
 *
 * `forceResume: true` alone does NOT change any state: the stop condition
 * (e.g. `stepCountIs`) will typically fire again immediately on the next
 * iteration, so a bare forceResume burns through the consecutive-override
 * cap (3) in rapid succession and then stops. To make resumption useful,
 * pair it with `appendPrompt` (which injects a user message, advancing the
 * conversation) or use a stop condition whose predicate can change between
 * iterations. This is by design: the engine caps rather than blocks bare
 * forceResume so a handler that coordinates external state (e.g. waiting on
 * an async gate that flips the stop condition) still has a few iterations
 * to do so.
 *
 * `appendPrompt` is honored independently of `forceResume` — a handler can
 * nudge the next turn without forcing a resume. Multiple handlers'
 * appendPrompts are concatenated with newlines.
 *
 * The override counter resets when a tool round produces outputs or a fresh
 * model response lands. Note that hook-blocked and rejected tool outputs
 * count as progress: the model receives the block/denial feedback and can
 * change course, which is observable forward motion even though no tool
 * body executed.
 */
export type StopResult = Readonly<z4.infer<typeof StopResultSchema>>;
export declare const PermissionRequestResultSchema: z4.ZodObject<{
    decision: z4.ZodEnum<{
        allow: "allow";
        deny: "deny";
        ask_user: "ask_user";
    }>;
    reason: z4.ZodOptional<z4.ZodString>;
}, z4.z.core.$strip>;
export type PermissionRequestResult = Readonly<z4.infer<typeof PermissionRequestResultSchema>>;
export declare const UserPromptSubmitResultSchema: z4.ZodObject<{
    mutatedPrompt: z4.ZodOptional<z4.ZodString>;
    reject: z4.ZodOptional<z4.ZodUnion<readonly [z4.ZodBoolean, z4.ZodString]>>;
}, z4.z.core.$strip>;
export type UserPromptSubmitResult = Readonly<z4.infer<typeof UserPromptSubmitResultSchema>>;
export declare const DoomLoopDetectedResultSchema: z4.ZodObject<{
    overrideAction: z4.ZodOptional<z4.ZodEnum<{
        observe: "observe";
        steer: "steer";
        escalate: "escalate";
        block: "block";
        stop: "stop";
    }>>;
}, z4.z.core.$strip>;
export type DoomLoopDetectedResult = Readonly<z4.infer<typeof DoomLoopDetectedResultSchema>>;
export declare const BUILT_IN_HOOKS: Record<HookName, HookDefinition>;
export declare const BUILT_IN_HOOK_NAMES: Set<string>;
export {};
//# sourceMappingURL=hooks-schemas.d.ts.map