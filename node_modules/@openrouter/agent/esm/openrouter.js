import { OpenRouterCore } from '@openrouter/sdk/core';
import { SDKHooks } from '@openrouter/sdk/hooks/hooks';
import { callModel } from './inner-loop/call-model.js';
function buildSDKHooks(input) {
    if (input === undefined) {
        return undefined;
    }
    if (input instanceof SDKHooks) {
        return input;
    }
    const hooks = new SDKHooks();
    const list = Array.isArray(input)
        ? input
        : [
            input,
        ];
    for (const hook of list) {
        if ('sdkInit' in hook) {
            hooks.registerSDKInitHook(hook);
        }
        if ('beforeCreateRequest' in hook) {
            hooks.registerBeforeCreateRequestHook(hook);
        }
        if ('beforeRequest' in hook) {
            hooks.registerBeforeRequestHook(hook);
        }
        if ('afterSuccess' in hook) {
            hooks.registerAfterSuccessHook(hook);
        }
        if ('afterError' in hook) {
            hooks.registerAfterErrorHook(hook);
        }
    }
    return hooks;
}
export class OpenRouter extends OpenRouterCore {
    constructor(options) {
        const { hooks: hooksInput, ...rest } = options ?? {};
        const hooks = buildSDKHooks(hooksInput);
        super(hooks === undefined
            ? rest
            : Object.assign({}, rest, {
                hooks,
            }));
        this.callModel = (request, options) => {
            return callModel(this, request, options);
        };
    }
}
//# sourceMappingURL=openrouter.js.map