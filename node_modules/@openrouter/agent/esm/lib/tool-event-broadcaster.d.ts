import type { StreamReplay } from './reusable-stream.js';
/**
 * A push-based event broadcaster that supports multiple concurrent consumers.
 * Similar to ReusableReadableStream but for push-based events from tool execution.
 *
 * Each consumer gets their own position in the buffer. Full replay is the
 * default, and active-consumer replay can compact consumed events.
 *
 * @template T - The event type being broadcast
 */
export declare class ToolEventBroadcaster<T> {
    private readonly streamReplay;
    private buffer;
    private bufferHead;
    private trimOffset;
    private consumers;
    private nextConsumerId;
    private isComplete;
    private completionError;
    constructor(streamReplay?: StreamReplay);
    /**
     * Push a new event to all consumers.
     * Events are buffered so late-joining consumers can catch up.
     */
    push(event: T): void;
    /**
     * Mark the broadcaster as complete - no more events will be pushed.
     * Optionally pass an error to signal failure to all consumers.
     * Cleans up buffer and consumers after completion.
     */
    complete(error?: Error): void;
    /**
     * Clean up resources after all consumers have finished.
     * Called automatically after complete(), but can be called manually.
     */
    private cleanup;
    /**
     * Create a new consumer that can independently iterate over events.
     * Full-replay consumers start at position 0. Active-consumer replay starts
     * at the current trim watermark.
     */
    createConsumer(): AsyncIterableIterator<T>;
    private trimConsumed;
    /**
     * Drop the retained backlog once no consumer can ever read it again.
     * Before the first consumer joins, the buffer IS the catch-up history late
     * joiners replay — retain it. Once at least one consumer has existed and
     * none remain, any future consumer starts at the watermark anyway, so the
     * retained events would stay pinned until GC for nothing.
     */
    private dropUnreadBacklog;
    /**
     * Notify all waiting consumers that new data is available or stream completed
     */
    private notifyWaitingConsumers;
}
//# sourceMappingURL=tool-event-broadcaster.d.ts.map