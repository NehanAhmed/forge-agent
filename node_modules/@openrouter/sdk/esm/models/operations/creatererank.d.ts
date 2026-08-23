import * as z from "zod/v4";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import * as models from "../index.js";
export type CreateRerankGlobals = {
    /**
     * The app identifier should be your app's URL and is used as the primary identifier for rankings.
     *
     * @remarks
     * This is used to track API usage per application.
     */
    httpReferer?: string | undefined;
    /**
     * The app display name allows you to customize how your app appears in OpenRouter's dashboard.
     *
     * @remarks
     */
    appTitle?: string | undefined;
    /**
     * Comma-separated list of app categories (e.g. "cli-agent,cloud-agent"). Used for marketplace rankings.
     *
     * @remarks
     */
    appCategories?: string | undefined;
};
/**
 * A structured document with optional text and/or image content. At least one of `text` or `image` must be provided.
 */
export type DocumentRequest = {
    /**
     * An image associated with the document, as a remote URL (http/https) or a base64-encoded data URI (data:image/...).
     */
    image?: string | undefined;
    /**
     * The document text
     */
    text?: string | undefined;
};
/**
 * A document to rerank. Either a plain string, or a structured object with optional `text` and/or `image`.
 */
export type Document = string | DocumentRequest;
/**
 * Rerank request input
 */
export type CreateRerankRequestBody = {
    /**
     * The list of documents to rerank. Documents may be plain strings, or structured objects with `text` and/or `image` for multimodal models.
     */
    documents: Array<string | DocumentRequest>;
    /**
     * The rerank model to use
     */
    model: string;
    provider?: models.ProviderPreferences | null | undefined;
    /**
     * The search query to rerank documents against
     */
    query: string;
    /**
     * Number of most relevant documents to return
     */
    topN?: number | undefined;
};
export type CreateRerankRequest = {
    /**
     * The app identifier should be your app's URL and is used as the primary identifier for rankings.
     *
     * @remarks
     * This is used to track API usage per application.
     */
    httpReferer?: string | undefined;
    /**
     * The app display name allows you to customize how your app appears in OpenRouter's dashboard.
     *
     * @remarks
     */
    appTitle?: string | undefined;
    /**
     * Comma-separated list of app categories (e.g. "cli-agent,cloud-agent"). Used for marketplace rankings.
     *
     * @remarks
     */
    appCategories?: string | undefined;
    requestBody: CreateRerankRequestBody;
};
/**
 * The document object echoing the original input (text and/or image)
 */
export type DocumentResponse = {
    /**
     * The image (URL or data URI) from the original document
     */
    image?: string | undefined;
    /**
     * The document text
     */
    text?: string | undefined;
};
/**
 * A single rerank result
 */
export type Result = {
    /**
     * The document object echoing the original input (text and/or image)
     */
    document: DocumentResponse;
    /**
     * Index of the document in the original input list
     */
    index: number;
    /**
     * Relevance score of the document to the query
     */
    relevanceScore: number;
};
/**
 * Usage statistics
 */
export type CreateRerankUsage = {
    /**
     * Cost of the request in credits
     */
    cost?: number | undefined;
    /**
     * Number of search units consumed (Cohere billing)
     */
    searchUnits?: number | undefined;
    /**
     * Total number of tokens used
     */
    totalTokens?: number | undefined;
};
/**
 * Rerank response containing ranked results
 */
export type CreateRerankResponseBody = {
    /**
     * Unique identifier for the rerank response (ORID format)
     */
    id?: string | undefined;
    /**
     * The model used for reranking
     */
    model: string;
    /**
     * The provider that served the rerank request
     */
    provider?: string | undefined;
    /**
     * List of rerank results sorted by relevance
     */
    results: Array<Result>;
    /**
     * Usage statistics
     */
    usage?: CreateRerankUsage | undefined;
};
export type CreateRerankResponse = CreateRerankResponseBody | string;
/** @internal */
export type DocumentRequest$Outbound = {
    image?: string | undefined;
    text?: string | undefined;
};
/** @internal */
export declare const DocumentRequest$outboundSchema: z.ZodType<DocumentRequest$Outbound, DocumentRequest>;
export declare function documentRequestToJSON(documentRequest: DocumentRequest): string;
/** @internal */
export type Document$Outbound = string | DocumentRequest$Outbound;
/** @internal */
export declare const Document$outboundSchema: z.ZodType<Document$Outbound, Document>;
export declare function documentToJSON(document: Document): string;
/** @internal */
export type CreateRerankRequestBody$Outbound = {
    documents: Array<string | DocumentRequest$Outbound>;
    model: string;
    provider?: models.ProviderPreferences$Outbound | null | undefined;
    query: string;
    top_n?: number | undefined;
};
/** @internal */
export declare const CreateRerankRequestBody$outboundSchema: z.ZodType<CreateRerankRequestBody$Outbound, CreateRerankRequestBody>;
export declare function createRerankRequestBodyToJSON(createRerankRequestBody: CreateRerankRequestBody): string;
/** @internal */
export type CreateRerankRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    RequestBody: CreateRerankRequestBody$Outbound;
};
/** @internal */
export declare const CreateRerankRequest$outboundSchema: z.ZodType<CreateRerankRequest$Outbound, CreateRerankRequest>;
export declare function createRerankRequestToJSON(createRerankRequest: CreateRerankRequest): string;
/** @internal */
export declare const DocumentResponse$inboundSchema: z.ZodType<DocumentResponse, unknown>;
export declare function documentResponseFromJSON(jsonString: string): SafeParseResult<DocumentResponse, SDKValidationError>;
/** @internal */
export declare const Result$inboundSchema: z.ZodType<Result, unknown>;
export declare function resultFromJSON(jsonString: string): SafeParseResult<Result, SDKValidationError>;
/** @internal */
export declare const CreateRerankUsage$inboundSchema: z.ZodType<CreateRerankUsage, unknown>;
export declare function createRerankUsageFromJSON(jsonString: string): SafeParseResult<CreateRerankUsage, SDKValidationError>;
/** @internal */
export declare const CreateRerankResponseBody$inboundSchema: z.ZodType<CreateRerankResponseBody, unknown>;
export declare function createRerankResponseBodyFromJSON(jsonString: string): SafeParseResult<CreateRerankResponseBody, SDKValidationError>;
/** @internal */
export declare const CreateRerankResponse$inboundSchema: z.ZodType<CreateRerankResponse, unknown>;
export declare function createRerankResponseFromJSON(jsonString: string): SafeParseResult<CreateRerankResponse, SDKValidationError>;
//# sourceMappingURL=creatererank.d.ts.map