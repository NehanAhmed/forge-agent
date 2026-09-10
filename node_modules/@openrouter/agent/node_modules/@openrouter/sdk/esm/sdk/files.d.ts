import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as models from "../models/index.js";
import * as operations from "../models/operations/index.js";
import { PageIterator } from "../types/operations.js";
export declare class Files extends ClientSDK {
    /**
     * List files
     *
     * @remarks
     * Lists files belonging to the workspace of the authenticating API key.
     */
    list(request?: operations.ListFilesRequest | undefined, options?: RequestOptions): Promise<PageIterator<operations.ListFilesResponse, {
        cursor: string;
    }>>;
    /**
     * Upload a file
     *
     * @remarks
     * Uploads a file to be referenced in future API calls. The file is stored under the workspace of the authenticating API key. Maximum file size: 100 MB.
     */
    upload(request: operations.UploadFileRequest, options?: RequestOptions): Promise<models.FileMetadata>;
    /**
     * Delete a file
     *
     * @remarks
     * Deletes a file owned by the requesting workspace. Deletion is irreversible.
     */
    delete(request: operations.DeleteFileRequest, options?: RequestOptions): Promise<models.FileDeleteResponse>;
    /**
     * Get file metadata
     *
     * @remarks
     * Retrieves metadata for a single file owned by the requesting workspace.
     */
    retrieve(request: operations.GetFileMetadataRequest, options?: RequestOptions): Promise<models.FileMetadata>;
    /**
     * Download file content
     *
     * @remarks
     * Downloads the raw bytes of a file. Only files created server-side are downloadable; uploaded files return 400.
     */
    download(request: operations.DownloadFileContentRequest, options?: RequestOptions): Promise<ReadableStream<Uint8Array>>;
}
//# sourceMappingURL=files.d.ts.map