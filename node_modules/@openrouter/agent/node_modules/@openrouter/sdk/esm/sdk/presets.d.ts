import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as models from "../models/index.js";
import * as operations from "../models/operations/index.js";
import { PageIterator } from "../types/operations.js";
export declare class Presets extends ClientSDK {
    /**
     * List presets
     *
     * @remarks
     * Lists all presets for the authenticated user, ordered by most recently updated first.
     */
    list(request?: operations.ListPresetsRequest | undefined, options?: RequestOptions): Promise<PageIterator<operations.ListPresetsResponse, {
        offset: number;
    }>>;
    /**
     * Get a preset
     *
     * @remarks
     * Retrieves a preset by its slug with its currently designated version inline.
     */
    get(request: operations.GetPresetRequest, options?: RequestOptions): Promise<models.GetPresetResponse>;
    /**
     * Create a preset from a chat-completions request body
     *
     * @remarks
     * Creates a preset (or a new version of an existing one) from an inference request body. Only fields that overlap with the preset config are persisted; other fields (e.g. `messages`, `stream`, `prompt`) are silently ignored.
     */
    createPresetsChatCompletions(request: operations.CreatePresetsChatCompletionsRequest, options?: RequestOptions): Promise<models.CreatePresetFromInferenceResponse>;
    /**
     * Create a preset from a messages request body
     *
     * @remarks
     * Creates a preset (or a new version of an existing one) from an inference request body. Only fields that overlap with the preset config are persisted; other fields (e.g. `messages`, `stream`, `prompt`) are silently ignored.
     */
    createPresetsMessages(request: operations.CreatePresetsMessagesRequest, options?: RequestOptions): Promise<models.CreatePresetFromInferenceResponse>;
    /**
     * Create a preset from a responses request body
     *
     * @remarks
     * Creates a preset (or a new version of an existing one) from an inference request body. Only fields that overlap with the preset config are persisted; other fields (e.g. `messages`, `stream`, `prompt`) are silently ignored.
     */
    createPresetsResponses(request: operations.CreatePresetsResponsesRequest, options?: RequestOptions): Promise<models.CreatePresetFromInferenceResponse>;
    /**
     * List versions of a preset
     *
     * @remarks
     * Lists all versions of a preset, ordered by version number ascending (oldest first).
     */
    listVersions(request: operations.ListPresetVersionsRequest, options?: RequestOptions): Promise<PageIterator<operations.ListPresetVersionsResponse, {
        offset: number;
    }>>;
    /**
     * Get a specific version of a preset
     *
     * @remarks
     * Retrieves a specific version of a preset by its slug and version number.
     */
    getVersion(request: operations.GetPresetVersionRequest, options?: RequestOptions): Promise<models.GetPresetVersionResponse>;
}
//# sourceMappingURL=presets.d.ts.map