import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const McpApprovalResponseItemType: {
    readonly McpApprovalResponse: "mcp_approval_response";
};
export type McpApprovalResponseItemType = ClosedEnum<typeof McpApprovalResponseItemType>;
/**
 * User response to an MCP tool approval request
 */
export type McpApprovalResponseItem = {
    approvalRequestId: string;
    approve: boolean;
    id?: string | null | undefined;
    reason?: string | null | undefined;
    type: McpApprovalResponseItemType;
};
/** @internal */
export declare const McpApprovalResponseItemType$outboundSchema: z.ZodEnum<typeof McpApprovalResponseItemType>;
/** @internal */
export type McpApprovalResponseItem$Outbound = {
    approval_request_id: string;
    approve: boolean;
    id?: string | null | undefined;
    reason?: string | null | undefined;
    type: string;
};
/** @internal */
export declare const McpApprovalResponseItem$outboundSchema: z.ZodType<McpApprovalResponseItem$Outbound, McpApprovalResponseItem>;
export declare function mcpApprovalResponseItemToJSON(mcpApprovalResponseItem: McpApprovalResponseItem): string;
//# sourceMappingURL=mcpapprovalresponseitem.d.ts.map