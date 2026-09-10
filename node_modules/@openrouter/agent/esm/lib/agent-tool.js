import { extractTextFromResponse } from './conversation-state.js';
import { TASK_TOOL_NAME } from './tool-check.js';
import { truncateTranscriptTail } from './tool-task.js';
import { SHARED_CONTEXT_KEY, ToolType } from './tool-types.js';
const TEXT_PREVIEW_CHARS = 200;
const ARGS_PREVIEW_CHARS = 80;
function preview(value, maxChars) {
    const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
    return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
/**
 * Live transcript over an agent child's conversation, rendered from the
 * child's (internal, in-memory) conversation state — the actual message
 * history, robust regardless of streaming vs non-streaming transport.
 */
export class AgentTranscriptSource {
    constructor(readState) {
        this.readState = readState;
        this.turnsStarted = 0;
        this.turnsEnded = 0;
        this.currentActivity = 'starting';
    }
    noteTurnStart() {
        this.turnsStarted++;
        this.currentActivity = `turn ${this.turnsStarted} in progress`;
    }
    noteTurnEnd(lastText) {
        this.turnsEnded++;
        this.currentActivity = lastText ? `responded: ${preview(lastText, 80)}` : 'thinking';
    }
    setActivity(activity) {
        this.currentActivity = activity;
    }
    statusExtras() {
        return {
            // Ended turns only — an in-flight turn shows up in turnsStarted and
            // currentActivity, but is not counted as completed.
            turnsCompleted: this.turnsEnded,
            turnsStarted: this.turnsStarted,
            currentActivity: this.currentActivity,
        };
    }
    render(maxChars) {
        const state = this.readState();
        if (!state || !Array.isArray(state.messages)) {
            return '';
        }
        const lines = [];
        for (const item of state.messages) {
            const type = item['type'];
            const role = item['role'];
            if (role === 'user' && typeof item['content'] === 'string') {
                lines.push(`user: ${preview(item['content'], TEXT_PREVIEW_CHARS)}`);
            }
            else if (type === 'message' && role === 'assistant') {
                const content = item['content'];
                const text = Array.isArray(content)
                    ? content
                        .map((c) => c.text ?? '')
                        .join('')
                        .trim()
                    : '';
                if (text) {
                    lines.push(`assistant: ${preview(text, TEXT_PREVIEW_CHARS)}`);
                }
            }
            else if (type === 'function_call') {
                lines.push(`→ ${String(item['name'])}(${preview(item['arguments'], ARGS_PREVIEW_CHARS)})`);
            }
            else if (type === 'function_call_output') {
                lines.push(`  ⇒ ${preview(item['output'], ARGS_PREVIEW_CHARS)}`);
            }
        }
        const full = lines.join('\n');
        return truncateTranscriptTail(full, maxChars);
    }
}
/** Paused child statuses that an in-memory agent child cannot recover from. */
const CHILD_PAUSE_STATUSES = new Set([
    'awaiting_approval',
    'awaiting_hitl',
    'awaiting_client_tools',
    'awaiting_async_tools',
]);
/**
 * Create an agent tool: a long-running tool whose work IS a child
 * `callModel` conversation. The child runs as a background task — the
 * parent loop keeps going, its per-turn activity feeds the task log (one
 * entry per child turn), its conversation is the check-in transcript, and
 * its final answer (via the `result` mapper) is delivered like any
 * background result. Steering messages (`sendToTask`, or a check call's
 * `task.send`) are injected into the child as user messages at its next
 * turn boundary. `cancelTask` / parent abort cancel the child run.
 */
export function agentToolBuilder(config) {
    // Same reserved-name guards as tool() — a subagent named 'shared' would
    // collide with the shared-context store key, one named 'task' would
    // disable the built-in task-interaction tool.
    if (config.name === SHARED_CONTEXT_KEY) {
        throw new Error(`Tool name "${SHARED_CONTEXT_KEY}" is reserved for shared context. Choose a different name.`);
    }
    if (config.name === TASK_TOOL_NAME) {
        throw new Error(`Tool name "${TASK_TOOL_NAME}" is reserved for the built-in task-interaction tool. Choose a different name.`);
    }
    if (config.outputSchema === undefined) {
        throw new Error(`Agent tool "${config.name}" must declare an outputSchema. The child's mapped result is validated when it settles.`);
    }
    const defaultResult = async (child) => ({
        text: await child.getText(),
    });
    const mapResult = config.result ?? defaultResult;
    // The synthesized run: a plain async fn driving the child to completion.
    // Turn activity surfaces through ctx.log (task log + preliminary events);
    // the transcript reads the child's live in-memory conversation state.
    async function run(params, ctx) {
        const client = ctx?.client;
        if (!client) {
            throw new Error(`Agent tool "${config.name}": no client available on the run context. Agent tools must execute inside a callModel run.`);
        }
        const spec = await config.agent(params, ctx);
        // Internal in-memory accessor: the child's message history IS the
        // transcript, and getState() enables the pause-detection below. Never
        // the caller's accessor — a child persisting there would clobber the
        // parent conversation.
        let childState = null;
        const childAccessor = {
            load: async () => childState,
            save: async (state) => {
                childState = state;
            },
        };
        const transcript = new AgentTranscriptSource(() => childState);
        if (ctx?.taskTranscript) {
            ctx.taskTranscript.transcriptSource = transcript;
        }
        // Lazy import: agent-tool → call-model → model-result would otherwise
        // be a static cycle (same pattern as bindDeferredCompletion).
        const { callModel } = await import('../inner-loop/call-model.js');
        const userOnTurnStart = spec.onTurnStart;
        const userOnTurnEnd = spec.onTurnEnd;
        const child = callModel(client, {
            ...spec,
            state: childAccessor,
            ...(ctx?.signal !== undefined && {
                signal: ctx.signal,
            }),
            onTurnStart: async (turnContext) => {
                transcript.noteTurnStart();
                await userOnTurnStart?.(turnContext);
            },
            onTurnEnd: async (turnContext, response) => {
                const text = extractTextFromResponse(response);
                transcript.noteTurnEnd(text);
                // One log entry per child turn — feeds tailLogs and preliminary
                // results on the parent stream.
                ctx?.log?.({
                    turn: turnContext.numberOfTurns,
                    textPreview: preview(text.trim(), TEXT_PREVIEW_CHARS),
                });
                await userOnTurnEnd?.(turnContext, response);
            },
        });
        // Steering: forward inbound task messages into the child conversation
        // as user messages at its next safe turn boundary.
        ctx?.onMessage?.((message) => {
            child.queueUserMessage(typeof message === 'string' ? message : JSON.stringify(message));
        });
        // Drive the child to completion.
        await child.getResponse();
        transcript.setActivity('finished');
        // In-memory children cannot pause durably: a paused child means a tool
        // inside it awaits input that will never arrive. Fail loudly instead of
        // silently returning a partial answer.
        const finalStatus = childState !== null ? childState.status : undefined;
        if (finalStatus !== undefined && CHILD_PAUSE_STATUSES.has(finalStatus)) {
            throw new Error(`Agent tool "${config.name}": the child run paused with status '${finalStatus}'. Agent children run in-memory and cannot pause — avoid HITL/manual/deferred/approval tools inside agents (use lifecycle: 'deferred' on the parent tool instead).`);
        }
        return await mapResult(child);
    }
    const fn = {
        lifecycle: 'background',
        kind: 'agent',
        name: config.name,
        inputSchema: config.inputSchema,
        outputSchema: config.outputSchema,
        run,
    };
    const optionalFields = [
        'description',
        'strict',
        'contextSchema',
        'nextTurnParams',
        'requireApproval',
        'loopKey',
        'timeoutMs',
        'maxConcurrency',
        'ack',
        'graceMs',
        'check',
    ];
    for (const field of optionalFields) {
        if (config[field] !== undefined) {
            fn[field] = config[field];
        }
    }
    return {
        type: ToolType.Function,
        function: fn,
    };
}
//# sourceMappingURL=agent-tool.js.map