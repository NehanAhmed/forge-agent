/**
 * A reusable readable stream that allows multiple consumers to read from the same source stream
 * concurrently while it's actively streaming, without forcing consumers to wait for full buffering.
 *
 * Key features:
 * - Multiple concurrent consumers with independent read positions
 * - New consumers can attach while streaming is active
 * - Full replay for delayed and sequential consumers by default
 * - Opt-in active-consumer replay compaction for bounded memory
 * - Each consumer can read at their own pace
 */
export type StreamReplay = 'full' | 'active-consumers';
export interface ReusableReadableStreamOptions<T> {
    streamReplay?: StreamReplay;
    onValue?: (value: T) => void;
    isTerminalValue?: (value: T) => boolean;
}
export declare class ReusableReadableStream<T> {
    private sourceStream;
    private buffer;
    private bufferHead;
    private trimOffset;
    private consumers;
    private nextConsumerId;
    private sourceReader;
    private sourceComplete;
    private sourceError;
    private pumpStarted;
    private sourceCancelPromise;
    private readonly streamReplay;
    private readonly onValue;
    private readonly isTerminalValue;
    constructor(sourceStream: ReadableStream<T>, options?: ReusableReadableStreamOptions<T>);
    /**
     * True once the source stream has been fully read into the buffer.
     * A fresh consumer created after this point replays the retained buffer
     * without waiting on the source.
     */
    get isComplete(): boolean;
    /**
     * Synchronously scan the retained buffer from the end, returning the
     * last item matching `predicate`. Sees only what has been buffered so
     * far — call once `isComplete` to cover the whole stream. Unlike a
     * consumer replay, this costs no per-item microtask hop, so teardown
     * paths can locate the completion event without re-walking a large
     * buffer asynchronously.
     */
    findLastBuffered(predicate: (item: T) => boolean): T | undefined;
    /**
     * Create a new consumer that can independently iterate over the stream.
     * Full-replay consumers start at position 0. Active-consumer replay starts
     * at the current trim watermark. Multiple attached consumers advance
     * independently in either mode.
     */
    createConsumer(): AsyncIterableIterator<T>;
    private trimConsumed;
    /**
     * Drop the retained backlog once no consumer can ever read it again.
     * Before the first consumer joins, the backlog IS the catch-up history late
     * joiners replay — retain it. Once at least one consumer has existed and
     * none remain, any future consumer starts at the watermark anyway, so the
     * retained bytes would stay pinned until GC for nothing. `findLastBuffered`
     * callers that must observe terminal events after teardown should capture
     * them via `onValue` instead of relying on the backlog surviving.
     */
    private dropUnreadBacklog;
    /**
     * Start pumping data from the source stream into the buffer
     */
    private startPump;
    private cancelSourceReader;
    /**
     * Notify all waiting consumers that new data is available
     */
    private notifyAllConsumers;
    /**
     * Cancel the source stream and all consumers
     */
    cancel(): Promise<void>;
}
//# sourceMappingURL=reusable-stream.d.ts.map