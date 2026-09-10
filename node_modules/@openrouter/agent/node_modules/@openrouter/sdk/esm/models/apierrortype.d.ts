import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Canonical OpenRouter error type, stable across all API formats
 */
export declare const ApiErrorType: {
    readonly ContextLengthExceeded: "context_length_exceeded";
    readonly MaxTokensExceeded: "max_tokens_exceeded";
    readonly TokenLimitExceeded: "token_limit_exceeded";
    readonly StringTooLong: "string_too_long";
    readonly Authentication: "authentication";
    readonly PermissionDenied: "permission_denied";
    readonly PaymentRequired: "payment_required";
    readonly RateLimitExceeded: "rate_limit_exceeded";
    readonly ProviderOverloaded: "provider_overloaded";
    readonly ProviderUnavailable: "provider_unavailable";
    readonly InvalidRequest: "invalid_request";
    readonly InvalidPrompt: "invalid_prompt";
    readonly NotFound: "not_found";
    readonly PreconditionFailed: "precondition_failed";
    readonly PayloadTooLarge: "payload_too_large";
    readonly Unprocessable: "unprocessable";
    readonly ContentPolicyViolation: "content_policy_violation";
    readonly Refusal: "refusal";
    readonly InvalidImage: "invalid_image";
    readonly ImageTooLarge: "image_too_large";
    readonly ImageTooSmall: "image_too_small";
    readonly UnsupportedImageFormat: "unsupported_image_format";
    readonly ImageNotFound: "image_not_found";
    readonly ImageDownloadFailed: "image_download_failed";
    readonly Server: "server";
    readonly Timeout: "timeout";
    readonly Unmapped: "unmapped";
};
/**
 * Canonical OpenRouter error type, stable across all API formats
 */
export type ApiErrorType = OpenEnum<typeof ApiErrorType>;
/** @internal */
export declare const ApiErrorType$inboundSchema: z.ZodType<ApiErrorType, unknown>;
//# sourceMappingURL=apierrortype.d.ts.map