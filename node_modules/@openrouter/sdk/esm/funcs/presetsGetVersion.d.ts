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
 * Get a specific version of a preset
 *
 * @remarks
 * Retrieves a specific version of a preset by its slug and version number.
 *
 * If set, this operation will use {@link Security.apiKey} from the global security.
 */
export declare function presetsGetVersion(client: OpenRouterCore, request: operations.GetPresetVersionRequest, options?: RequestOptions): APIPromise<Result<models.GetPresetVersionResponse, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.NotFoundResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=presetsGetVersion.d.ts.map