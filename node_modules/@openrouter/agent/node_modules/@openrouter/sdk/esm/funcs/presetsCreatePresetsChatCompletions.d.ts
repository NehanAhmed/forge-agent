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
 * Create a preset from a chat-completions request body
 *
 * @remarks
 * Creates a preset (or a new version of an existing one) from an inference request body. Only fields that overlap with the preset config are persisted; other fields (e.g. `messages`, `stream`, `prompt`) are silently ignored.
 *
 * If set, this operation will use {@link Security.apiKey} from the global security.
 */
export declare function presetsCreatePresetsChatCompletions(client: OpenRouterCore, request: operations.CreatePresetsChatCompletionsRequest, options?: RequestOptions): APIPromise<Result<models.CreatePresetFromInferenceResponse, errors.BadRequestResponseError | errors.UnauthorizedResponseError | errors.ForbiddenResponseError | errors.NotFoundResponseError | errors.ConflictResponseError | errors.InternalServerResponseError | OpenRouterError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=presetsCreatePresetsChatCompletions.d.ts.map