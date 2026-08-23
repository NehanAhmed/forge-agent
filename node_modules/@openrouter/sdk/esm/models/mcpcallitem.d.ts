import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const McpCallItemType: {
    readonly McpCall: "mcp_call";
};
export type McpCallItemType = ClosedEnum<typeof McpCallItemType>;
/**
 * An MCP tool call with its output or error
 */
export type McpCallItem = {
    arguments: string;
    error?: string | null | undefined;
    id: string;
    name: string;
    output?: string | null | undefined;
    serverLabel: string;
    type: McpCallItemType;
};
/** @internal */
export declare const McpCallItemType$outboundSchema: z.ZodEnum<typeof McpCallItemType>;
/** @internal */
export type McpCallItem$Outbound = {
    arguments: string;
    error?: string | null | undefined;
    id: string;
    name: string;
    output?: string | null | undefined;
    server_label: string;
    type: string;
};
/** @internal */
export declare const McpCallItem$outboundSchema: z.ZodType<McpCallItem$Outbound, McpCallItem>;
export declare function mcpCallItemToJSON(mcpCallItem: McpCallItem): string;
//# sourceMappingURL=mcpcallitem.d.ts.map