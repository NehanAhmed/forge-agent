import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { BYOKProviderSlug } from "./byokproviderslug.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type BYOKKey = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) that may use this credential. `null` means no restriction.
     */
    allowedApiKeyHashes: Array<string> | null;
    /**
     * Optional allowlist of model slugs this credential may be used for. `null` means no restriction.
     */
    allowedModels: Array<string> | null;
    /**
     * Optional allowlist of user IDs that may use this credential. `null` means no restriction.
     */
    allowedUserIds: Array<string> | null;
    /**
     * ISO timestamp of when the credential was created.
     */
    createdAt: string;
    /**
     * Whether this credential is currently disabled.
     */
    disabled: boolean;
    /**
     * Stable public identifier for this BYOK credential.
     */
    id: string;
    /**
     * Whether this credential is treated as a fallback — used only after non-fallback keys for the same provider have been tried.
     */
    isFallback: boolean;
    /**
     * Short masked snippet of the key (e.g. the first/last few characters) used to identify it in the UI.
     */
    label: string;
    /**
     * Optional human-readable name for the credential.
     */
    name?: string | null | undefined;
    /**
     * The upstream provider this credential authenticates against, as a lowercase slug (e.g. `openai`, `anthropic`, `amazon-bedrock`).
     */
    provider: BYOKProviderSlug;
    /**
     * Position within the provider — credentials are tried in ascending sort order.
     */
    sortOrder: number;
    /**
     * ID of the workspace this credential belongs to.
     */
    workspaceId: string;
};
/** @internal */
export declare const BYOKKey$inboundSchema: z.ZodType<BYOKKey, unknown>;
export declare function byokKeyFromJSON(jsonString: string): SafeParseResult<BYOKKey, SDKValidationError>;
//# sourceMappingURL=byokkey.d.ts.map