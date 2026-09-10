import * as z from "zod/v4";
export type UpdateBYOKKeyRequest = {
    /**
     * Optional allowlist of model slugs this credential may be used for. `null` means no restriction.
     */
    allowedModels?: Array<string> | null | undefined;
    /**
     * Optional allowlist of user IDs that may use this credential. `null` means no restriction.
     */
    allowedUserIds?: Array<string> | null | undefined;
    /**
     * Whether this credential is disabled.
     */
    disabled?: boolean | undefined;
    /**
     * Whether this credential is treated as a fallback — used only after non-fallback keys for the same provider have been tried.
     */
    isFallback?: boolean | undefined;
    /**
     * A new raw provider API key to rotate the credential in-place. The previous key material is overwritten and the masked label is regenerated. Encrypted at rest and never returned in API responses.
     */
    key?: string | undefined;
    /**
     * Optional human-readable name for the credential.
     */
    name?: string | null | undefined;
};
/** @internal */
export type UpdateBYOKKeyRequest$Outbound = {
    allowed_models?: Array<string> | null | undefined;
    allowed_user_ids?: Array<string> | null | undefined;
    disabled?: boolean | undefined;
    is_fallback?: boolean | undefined;
    key?: string | undefined;
    name?: string | null | undefined;
};
/** @internal */
export declare const UpdateBYOKKeyRequest$outboundSchema: z.ZodType<UpdateBYOKKeyRequest$Outbound, UpdateBYOKKeyRequest>;
export declare function updateBYOKKeyRequestToJSON(updateBYOKKeyRequest: UpdateBYOKKeyRequest): string;
//# sourceMappingURL=updatebyokkeyrequest.d.ts.map