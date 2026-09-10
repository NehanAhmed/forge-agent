import type { ElicitRequest, ElicitResult } from '@modelcontextprotocol/client';
import type { ElicitationHandler } from './types.js';
/**
 * Build the `elicitation/create` request handler registered on the MCP client.
 * Delegates to the caller's {@link ElicitationHandler}; when none is supplied,
 * auto-declines so a tool call awaiting input fails gracefully instead of
 * hanging. The MCP spec forbids eliciting sensitive/PII data — that contract is
 * the server's responsibility; callers should treat requested fields as such.
 */
export declare function makeElicitationRequestHandler(handler: ElicitationHandler | undefined): (request: ElicitRequest) => Promise<ElicitResult>;
//# sourceMappingURL=elicitation.d.ts.map