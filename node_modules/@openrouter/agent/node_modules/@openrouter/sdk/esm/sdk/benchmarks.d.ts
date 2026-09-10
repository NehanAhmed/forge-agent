import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as models from "../models/index.js";
import * as operations from "../models/operations/index.js";
export declare class Benchmarks extends ClientSDK {
    /**
     * List Benchmarks
     *
     * @remarks
     * Unified benchmark endpoint that aggregates scores from multiple benchmark sources (Artificial Analysis, Design Arena). Filter by source to reproduce the exact shapes from the legacy per-source endpoints, or use task_type to find models suited for specific workloads. Authenticate with any valid OpenRouter API key. Rate-limited to 30 requests/minute per key and 500 requests/day per account.
     */
    getBenchmarks(request?: operations.GetBenchmarksRequest | undefined, options?: RequestOptions): Promise<models.UnifiedBenchmarksResponse>;
}
//# sourceMappingURL=benchmarks.d.ts.map