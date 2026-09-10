import { OpenRouterCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import * as errors from "../models/errors/index.js";
import { OpenRouterError } from "../models/errors/openroutererror.js";
import { ResponseValidationError } from "../models/errors/responsevalidationerror.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import * as operations from "../models/operations/index.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
import { PageIterator } from "../types/operations.js";
/**
 * Top apps by token usage
 *
 * @remarks
 * Returns the top public apps on OpenRouter ranked by token usage inside the requested
 * date window, matching the public apps marketplace on openrouter.ai/apps. Token totals
 * are `prompt_tokens + completion_tokens`; hidden and private apps are excluded and
 * traffic from related app aliases is merged into the canonical visible app.
 *
 * `sort=popular` (default) ranks by total token volume inside the window.
 * `sort=trending` ranks by absolute excess token growth: window volume minus the average
 * volume of the three equal-length periods immediately preceding the window. Apps with
 * no excess growth are omitted, so `trending` may return fewer than `limit` rows.
 *
 * Filter with `category` (marketplace category group, e.g. `coding`) or `subcategory`
 * (e.g. `cli-agent`). Ranks are re-numbered 1..N after filtering. Page with `offset` —
 * `rank` stays absolute, so the first row of `offset=50` is `rank: 51`.
 *
 * Authenticate with any valid OpenRouter API key (same key used for inference).
 * Rate-limited to 30 requests/minute per key and 500 requests/day per account.
 *
 * When republishing or quoting this dataset, OpenRouter must be cited as:
 * "Source: OpenRouter (openrouter.ai/apps), as of {as_of}."
 *
 * Token counts come from each upstream provider's own tokenizer, so a token attributed
 * to one app is not directly comparable to a token attributed to another app whose
 * traffic flows through a different provider.
 */
export declare function datasetsGetAppRankings(client: OpenRouterCore, request?: operations.GetAppRankingsRequest | undefined, options?: RequestOptions): APIPromise<PageIterator<Result<operations.GetAppRankingsResponse, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.TooManyRequestsResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>, {
    offset: number;
}>>;
//# sourceMappingURL=datasetsGetAppRankings.d.ts.map