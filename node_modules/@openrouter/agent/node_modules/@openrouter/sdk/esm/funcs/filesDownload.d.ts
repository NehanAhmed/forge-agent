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
/**
 * Download file content
 *
 * @remarks
 * Downloads the raw bytes of a file. Only files created server-side are downloadable; uploaded files return 400.
 */
export declare function filesDownload(client: OpenRouterCore, request: operations.DownloadFileContentRequest, options?: RequestOptions): APIPromise<Result<ReadableStream<Uint8Array>, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.NotFoundResponseError | errors.TooManyRequestsResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=filesDownload.d.ts.map