import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { BashServerToolConfig, BashServerToolConfig$Outbound } from "./bashservertoolconfig.js";
export declare const BashServerToolType: {
    readonly OpenrouterBash: "openrouter:bash";
};
export type BashServerToolType = ClosedEnum<typeof BashServerToolType>;
/**
 * OpenRouter built-in server tool: runs shell commands server-side in a sandboxed container
 */
export type BashServerTool = {
    /**
     * Configuration for the openrouter:bash server tool
     */
    parameters?: BashServerToolConfig | undefined;
    type: BashServerToolType;
};
/** @internal */
export declare const BashServerToolType$outboundSchema: z.ZodEnum<typeof BashServerToolType>;
/** @internal */
export type BashServerTool$Outbound = {
    parameters?: BashServerToolConfig$Outbound | undefined;
    type: string;
};
/** @internal */
export declare const BashServerTool$outboundSchema: z.ZodType<BashServerTool$Outbound, BashServerTool>;
export declare function bashServerToolToJSON(bashServerTool: BashServerTool): string;
//# sourceMappingURL=bashservertool.d.ts.map