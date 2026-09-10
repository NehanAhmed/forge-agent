import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * A single Design Arena benchmark entry for a specific arena+category
 */
export type DABenchmarkEntry = {
    /**
     * Arena type (e.g. models, builders, agents)
     */
    arena: string;
    /**
     * Category within the arena (e.g. website, gamedev, uicomponent)
     */
    category: string;
    /**
     * ELO rating from head-to-head arena battles
     */
    elo: number;
    /**
     * Rank position within this arena+category among models available on OpenRouter (1 = highest ELO)
     */
    rank: number;
    /**
     * Win rate percentage in arena battles
     */
    winRate: number;
};
/** @internal */
export declare const DABenchmarkEntry$inboundSchema: z.ZodType<DABenchmarkEntry, unknown>;
export declare function daBenchmarkEntryFromJSON(jsonString: string): SafeParseResult<DABenchmarkEntry, SDKValidationError>;
//# sourceMappingURL=dabenchmarkentry.d.ts.map