import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const McpApprovalRequestItemType: {
    readonly McpApprovalRequest: "mcp_approval_request";
};
export type McpApprovalRequestItemType = ClosedEnum<typeof McpApprovalRequestItemType>;
/**
 * Request for approval to execute an MCP tool
 */
export type McpApprovalRequestItem = {
    arguments: string;
    id: string;
    name: string;
    serverLabel: string;
    type: McpApprovalRequestItemType;
};
/** @internal */
export declare const McpApprovalRequestItemType$outboundSchema: z.ZodEnum<typeof McpApprovalRequestItemType>;
/** @internal */
export type McpApprovalRequestItem$Outbound = {
    arguments: string;
    id: string;
    name: string;
    server_label: string;
    type: string;
};
/** @internal */
export declare const McpApprovalRequestItem$outboundSchema: z.ZodType<McpApprovalRequestItem$Outbound, McpApprovalRequestItem>;
export declare function mcpApprovalRequestItemToJSON(mcpApprovalRequestItem: McpApprovalRequestItem): string;
//# sourceMappingURL=mcpapprovalrequestitem.d.ts.map