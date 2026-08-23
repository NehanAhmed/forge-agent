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
 * List presets
 *
 * @remarks
 * Lists all presets for the authenticated user, ordered by most recently updated first.
 *
 * If set, this operation will use {@link Security.apiKey} from the global security.
 */
export declare function presetsList(client: OpenRouterCore, request?: operations.ListPresetsRequest | undefined, options?: RequestOptions): APIPromise<PageIterator<Result<operations.ListPresetsResponse, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>, {
    offset: number;
}>>;
//# sourceMappingURL=presetsList.d.ts.map