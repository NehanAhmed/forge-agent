import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as models from "../models/index.js";
import * as operations from "../models/operations/index.js";
import { PageIterator } from "../types/operations.js";
export declare class Observability extends ClientSDK {
    /**
     * List observability destinations
     *
     * @remarks
     * List the observability destinations configured for the authenticated entity's default workspace. Use the `workspace_id` query parameter to scope the result to a different workspace. Only destinations with stable release status are surfaced — destinations of other types are excluded. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    list(request?: operations.ListObservabilityDestinationsRequest | undefined, options?: RequestOptions): Promise<PageIterator<operations.ListObservabilityDestinationsResponse, {
        offset: number;
    }>>;
    /**
     * Create an observability destination
     *
     * @remarks
     * Create a new observability destination. A maximum of 5 destinations per type is allowed. Defaults to the authenticated entity's default workspace; use the `workspace_id` body field to scope to a different workspace. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    create(request: operations.CreateObservabilityDestinationRequest, options?: RequestOptions): Promise<models.CreateObservabilityDestinationResponse>;
    /**
     * Delete an observability destination
     *
     * @remarks
     * Delete an existing observability destination. This performs a soft delete. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    delete(request: operations.DeleteObservabilityDestinationRequest, options?: RequestOptions): Promise<models.DeleteObservabilityDestinationResponse>;
    /**
     * Get an observability destination
     *
     * @remarks
     * Fetch a single observability destination by its UUID. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    get(request: operations.GetObservabilityDestinationRequest, options?: RequestOptions): Promise<models.GetObservabilityDestinationResponse>;
    /**
     * Update an observability destination
     *
     * @remarks
     * Update an existing observability destination. Only the fields provided in the request body are updated. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    update(request: operations.UpdateObservabilityDestinationRequest, options?: RequestOptions): Promise<models.UpdateObservabilityDestinationResponse>;
}
//# sourceMappingURL=observability.d.ts.map