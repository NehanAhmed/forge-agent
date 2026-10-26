export interface StreamCoalescerOptions {
  maxChars?: number;
  maxDelayMs?: number;
  now?: () => number;
  onFlush: (text: string) => void;
}

/**
 * Coalesces streaming model deltas into larger chunks before they become log
 * entries. Without this, every token triggers a log write and a UI event.
 */
export class StreamCoalescer {
  private readonly maxChars: number;
  private readonly maxDelayMs: number;
  private readonly now: () => number;
  private readonly onFlush: (text: string) => void;
  private buffer = '';
  private lastFlushAt: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: StreamCoalescerOptions) {
    this.maxChars = Math.max(1, options.maxChars ?? 512);
    this.maxDelayMs = Math.max(0, options.maxDelayMs ?? 120);
    this.now = options.now ?? Date.now;
    this.onFlush = options.onFlush;
    this.lastFlushAt = this.now();
  }

  push(text: string): void {
    if (!text) return;
    this.buffer += text;

    const elapsed = this.now() - this.lastFlushAt;
    if (this.buffer.length >= this.maxChars || elapsed >= this.maxDelayMs) {
      this.flush();
      return;
    }

    // Trailing flush: without another push, buffered text would otherwise sit
    // in memory until the stream ends.
    if (!this.flushTimer) {
      const timer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, this.maxDelayMs);
      timer.unref?.();
      this.flushTimer = timer;
    }
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0) return;
    const text = this.buffer;
    this.buffer = '';
    this.lastFlushAt = this.now();
    this.onFlush(text);
  }

  pending(): string {
    return this.buffer;
  }
}
