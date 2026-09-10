import { OpenRouterCore } from '@openrouter/sdk/core';
import { SDKHooks } from '@openrouter/sdk/hooks/hooks';
import type { AfterErrorHook, AfterSuccessHook, BeforeCreateRequestHook, BeforeRequestHook, SDKInitHook } from '@openrouter/sdk/hooks/types';
import type { SDKOptions } from '@openrouter/sdk/lib/config';
import type { RequestOptions } from '@openrouter/sdk/lib/sdks';
import type { $ZodObject, $ZodShape, infer as zodInfer } from 'zod/v4/core';
import type { CallModelInput } from './lib/async-params.js';
import type { ModelResult } from './lib/model-result.js';
import type { Tool } from './lib/tool-types.js';
export type { SDKOptions } from '@openrouter/sdk/lib/config';
/** Any single hook interface supported by the underlying SDK. */
export type Hook = SDKInitHook | BeforeCreateRequestHook | BeforeRequestHook | AfterSuccessHook | AfterErrorHook;
/**
 * SDK options extended with optional hooks for request/response interception.
 * `hooks` accepts an `SDKHooks` instance, a single hook object, or an array of
 * hook objects; the constructor normalizes shorthand input into an `SDKHooks`
 * instance before passing it to the underlying SDK, which only recognizes
 * `hooks` when it is an `SDKHooks` instance.
 */
export type OpenRouterOptions = SDKOptions & {
    hooks?: SDKHooks | Hook | readonly Hook[];
};
export declare class OpenRouter extends OpenRouterCore {
    constructor(options?: OpenRouterOptions);
    callModel: <TTools extends readonly Tool[], TSharedSchema extends $ZodObject<$ZodShape> | undefined = undefined, TShared extends Record<string, unknown> = TSharedSchema extends $ZodObject<$ZodShape> ? zodInfer<TSharedSchema> : Record<string, never>>(request: CallModelInput<TTools, TShared> & {
        sharedContextSchema?: TSharedSchema;
    }, options?: RequestOptions) => ModelResult<TTools, TShared>;
}
//# sourceMappingURL=openrouter.d.ts.map