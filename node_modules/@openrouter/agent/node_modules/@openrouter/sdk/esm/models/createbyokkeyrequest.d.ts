import * as z from "zod/v4";
import { BYOKProviderSlug } from "./byokproviderslug.js";
export type CreateBYOKKeyRequest = {
    /**
     * Optional allowlist of model slugs this credential may be used for. `null` means no restriction.
     */
    allowedModels?: Array<string> | null | undefined;
    /**
     * Optional allowlist of user IDs that may use this credential. `null` means no restriction.
     */
    allowedUserIds?: Array<string> | null | undefined;
    /**
     * Whether this credential should be created in a disabled state.
     */
    disabled?: boolean | undefined;
    /**
     * Whether this credential is treated as a fallback — used only after non-fallback keys for the same provider have been tried.
     */
    isFallback?: boolean | undefined;
    /**
     * The raw provider API key or credential. This value is encrypted at rest and never returned in API responses.
     */
    key: string;
    /**
     * Optional human-readable name for the credential.
     */
    name?: string | null | undefined;
    /**
     * The upstream provider this credential authenticates against, as a lowercase slug (e.g. `openai`, `anthropic`, `amazon-bedrock`).
     */
    provider: BYOKProviderSlug;
    /**
     * Optional workspace ID. Defaults to the authenticated entity's default workspace.
     */
    workspaceId?: string | undefined;
};
/** @internal */
export type CreateBYOKKeyRequest$Outbound = {
    allowed_models?: Array<string> | null | undefined;
    allowed_user_ids?: Array<string> | null | undefined;
    disabled?: boolean | undefined;
    is_fallback?: boolean | undefined;
    key: string;
    name?: string | null | undefined;
    provider: string;
    workspace_id?: string | undefined;
};
/** @internal */
export declare const CreateBYOKKeyRequest$outboundSchema: z.ZodType<CreateBYOKKeyRequest$Outbound, CreateBYOKKeyRequest>;
export declare function createBYOKKeyRequestToJSON(createBYOKKeyRequest: CreateBYOKKeyRequest): string;
//# sourceMappingURL=createbyokkeyrequest.d.ts.map