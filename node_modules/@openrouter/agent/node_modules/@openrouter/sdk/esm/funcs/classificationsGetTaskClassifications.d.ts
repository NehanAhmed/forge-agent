import { OpenRouterCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import * as errors from "../models/errors/index.js";
import { OpenRouterError } from "../models/errors/openroutererror.js";
import { ResponseValidationError } from "../models/errors/responsevalidationerror.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import * as models from "../models/index.js";
import * as operations from "../models/operations/index.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Task classification market share
 *
 * @remarks
 * Returns the market-share breakdown of OpenRouter traffic by task classification
 * (e.g. code generation, web search, summarization) over a trailing time window.
 *
 * Each classification reports its share of classified sampled requests (`usage_share`)
 * and classified sampled token volume (`token_share`) as fractions between 0 and 1.
 * The unclassified `other` bucket is excluded. Absolute volumes are not exposed
 * because the underlying data is sampled.
 *
 * Each classification also includes a `models` array listing the top models by
 * request volume within that classification, with their within-tag usage and token shares.
 *
 * Classifications are grouped into macro-categories (Code, Data, Agent, General)
 * with aggregate shares provided for each.
 *
 * Authenticate with any valid OpenRouter API key (same key used for inference).
 * Rate-limited to 30 requests/minute per key and 500 requests/day per account.
 *
 * When republishing or quoting this data, cite as:
 * "Source: OpenRouter (openrouter.ai/rankings), as of {as_of}."
 */
export declare function classificationsGetTaskClassifications(client: OpenRouterCore, request?: operations.GetTaskClassificationsRequest | undefined, options?: RequestOptions): APIPromise<Result<models.TaskClassificationResponse, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.TooManyRequestsResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=classificationsGetTaskClassifications.d.ts.map