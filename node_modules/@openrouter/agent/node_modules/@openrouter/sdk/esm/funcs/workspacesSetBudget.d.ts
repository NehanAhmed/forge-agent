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
 * Create or update a workspace budget
 *
 * @remarks
 * Create or update the budget for a given interval. Budget limits must strictly decrease as the interval narrows (lifetime > monthly > weekly > daily). [Management key](/docs/guides/overview/auth/management-api-keys) required.
 */
export declare function workspacesSetBudget(client: OpenRouterCore, request: operations.UpsertWorkspaceBudgetRequest, options?: RequestOptions): APIPromise<Result<models.UpsertWorkspaceBudgetResponse, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.NotFoundResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=workspacesSetBudget.d.ts.map