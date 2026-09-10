import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as operations from "../models/operations/index.js";
export declare class BetaAnalytics extends ClientSDK {
    /**
     * Get available analytics metrics and dimensions
     *
     * @remarks
     * Returns the available metrics, dimensions, filter operators, and granularities for the analytics query endpoint. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    getAnalyticsMeta(request?: operations.GetAnalyticsMetaRequest | undefined, options?: RequestOptions): Promise<operations.GetAnalyticsMetaResponse>;
    /**
     * Query analytics data
     *
     * @remarks
     * Execute an analytics query with specified metrics, dimensions, filters, and time range. [Management key](/docs/guides/overview/auth/management-api-keys) required.
     */
    queryAnalytics(request: operations.QueryAnalyticsRequest, options?: RequestOptions): Promise<operations.QueryAnalyticsResponse>;
}
//# sourceMappingURL=betaanalytics.d.ts.map