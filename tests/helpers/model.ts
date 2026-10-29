export interface FakeUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface FakeModelOptions {
  text?: string;
  chunks?: string[];
  usage?: FakeUsage;
  error?: unknown;
  streamError?: unknown;
}

const DEFAULT_USAGE: FakeUsage = { inputTokens: 10, outputTokens: 5, cost: 0.001 };

/** Build the object shape returned by the OpenRouter agent client. */
export function fakeModel(options: FakeModelOptions = {}) {
  const text = options.text ?? 'Task completed successfully';
  const chunks = options.chunks ?? [text];
  const usage = options.usage ?? DEFAULT_USAGE;

  return () => ({
    async *getTextStream() {
      if (options.error) throw options.error;
      for (const chunk of chunks) {
        if (options.streamError) throw options.streamError;
        yield chunk;
      }
    },
    async getText() {
      if (options.error) throw options.error;
      return text;
    },
    async getUsage() {
      return usage;
    },
    async *getReasoningStream() {
      yield* [] as string[];
    },
    async *getToolCallsStream() {
      yield* [] as string[];
    },
  });
}

/** A model factory that runs a custom script per request. */
export function scriptedModel(handler: (request: unknown) => ReturnType<ReturnType<typeof fakeModel>>) {
  return (request: unknown) => handler(request);
}

/** A model call that always fails with the given error. */
export function failingModel(error: unknown) {
  return () => ({
    async *getTextStream() {
      yield* [] as string[];
      throw error;
    },
    async getText() {
      throw error;
    },
    async getUsage() {
      return DEFAULT_USAGE;
    },
    async *getReasoningStream() {
      yield* [] as string[];
    },
    async *getToolCallsStream() {
      yield* [] as string[];
    },
  });
}
