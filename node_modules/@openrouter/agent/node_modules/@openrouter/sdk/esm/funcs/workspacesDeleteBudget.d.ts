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
 * Delete a workspace budget
 *
 * @remarks
 * Remove the budget for a given interval. [Management key](/docs/guides/overview/auth/management-api-keys) required.
 */
export declare function workspacesDeleteBudget(client: OpenRouterCore, request: operations.DeleteWorkspaceBudgetRequest, options?: RequestOptions): APIPromise<Result<models.DeleteWorkspaceBudgetResponse, errors.UnauthorizedResponseError | errors.NotFoundResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=workspacesDeleteBudget.d.ts.map