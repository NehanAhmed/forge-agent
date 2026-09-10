import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as models from "../models/index.js";
import * as operations from "../models/operations/index.js";
import { PageIterator } from "../types/operations.js";
export declare class Byok extends ClientSDK {
    /**
     * List BYOK provider credentials
     *
     * @remarks
     * List the bring-your-own-key (BYOK) provider credentials for the authenticated entity's default workspace. Use the `workspace_id` query parameter to scope the result to a different workspace, or the `provider` query parameter to filter by upstream provider. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    list(request?: operations.ListBYOKKeysRequest | undefined, options?: RequestOptions): Promise<PageIterator<operations.ListBYOKKeysResponse, {
        offset: number;
    }>>;
    /**
     * Create a BYOK provider credential
     *
     * @remarks
     * Create a new bring-your-own-key (BYOK) provider credential. The raw key is encrypted at rest and never returned in API responses. Defaults to the authenticated entity's default workspace; use the `workspace_id` body field to scope to a different workspace. Treat the raw key as write-only; it is never returned after creation. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    create(request: operations.CreateBYOKKeyRequest, options?: RequestOptions): Promise<models.CreateBYOKKeyResponse>;
    /**
     * Delete a BYOK provider credential
     *
     * @remarks
     * Delete (soft-delete) a bring-your-own-key (BYOK) provider credential by its `id`. The encrypted key material is wiped and the record is marked as deleted. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    delete(request: operations.DeleteBYOKKeyRequest, options?: RequestOptions): Promise<models.DeleteBYOKKeyResponse>;
    /**
     * Get a BYOK provider credential
     *
     * @remarks
     * Get a single bring-your-own-key (BYOK) provider credential by its `id`. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    get(request: operations.GetBYOKKeyRequest, options?: RequestOptions): Promise<models.GetBYOKKeyResponse>;
    /**
     * Update a BYOK provider credential
     *
     * @remarks
     * Update an existing bring-your-own-key (BYOK) provider credential by its `id`. Include the `key` field to rotate the raw provider API key in-place (the previous key material is overwritten). [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    update(request: operations.UpdateBYOKKeyRequest, options?: RequestOptions): Promise<models.UpdateBYOKKeyResponse>;
}
//# sourceMappingURL=byok.d.ts.map