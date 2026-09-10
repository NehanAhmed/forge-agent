import * as z from "zod/v4";
/**
 * Reference to a previously created container to reuse.
 */
export type ContainerReferenceEnvironment = {
    /**
     * Identifier of an existing container to reuse (max 20 characters).
     */
    containerId: string;
    type: "container_reference";
};
/** @internal */
export type ContainerReferenceEnvironment$Outbound = {
    container_id: string;
    type: "container_reference";
};
/** @internal */
export declare const ContainerReferenceEnvironment$outboundSchema: z.ZodType<ContainerReferenceEnvironment$Outbound, ContainerReferenceEnvironment>;
export declare function containerReferenceEnvironmentToJSON(containerReferenceEnvironment: ContainerReferenceEnvironment): string;
//# sourceMappingURL=containerreferenceenvironment.d.ts.map