/**
 * Minimal FIFO semaphore used to bound tool-execution concurrency.
 *
 * Three gates exist per run:
 * - the round gate (`toolConcurrency.round`) — bounds simultaneous tool
 *   executions within a round;
 * - per-tool gates (`maxConcurrency` on a tool) — bound simultaneous
 *   executions of one tool across the run;
 * - the background pool (`toolConcurrency.background`) — bounds detached
 *   background-tool work that escaped the round barrier.
 *
 * Waiters are released strictly FIFO so a burst of calls cannot starve an
 * earlier one. Zero dependencies; ~60 lines.
 */
/** Release function returned by {@link Semaphore.acquire}. Idempotent. */
export type SemaphoreRelease = () => void;
/**
 * A counting semaphore with FIFO waiters.
 */
export declare class Semaphore {
    private available;
    private readonly waiters;
    /**
     * @param limit - Maximum concurrent holders. Must be a positive integer.
     */
    constructor(limit: number);
    /**
     * Acquire one slot. Resolves immediately when a slot is free, otherwise
     * queues FIFO. The returned release function is idempotent — releasing
     * twice does not free two slots.
     */
    acquire(): Promise<SemaphoreRelease>;
    private makeRelease;
}
/**
 * Acquire multiple gates in the given (fixed) order and return a single
 * release that frees them in reverse order. Callers MUST pass gates in a
 * globally consistent order (round gate before per-tool gate) — fixed
 * ordering is what makes multi-gate acquisition deadlock-free.
 */
export declare function acquireAll(gates: ReadonlyArray<Semaphore | undefined>): Promise<SemaphoreRelease>;
//# sourceMappingURL=tool-concurrency.d.ts.map