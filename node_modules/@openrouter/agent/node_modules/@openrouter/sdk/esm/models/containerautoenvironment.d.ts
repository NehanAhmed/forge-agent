import * as z from "zod/v4";
/**
 * An OpenRouter-managed, auto-provisioned ephemeral container.
 */
export type ContainerAutoEnvironment = {
    type: "container_auto";
};
/** @internal */
export type ContainerAutoEnvironment$Outbound = {
    type: "container_auto";
};
/** @internal */
export declare const ContainerAutoEnvironment$outboundSchema: z.ZodType<ContainerAutoEnvironment$Outbound, ContainerAutoEnvironment>;
export declare function containerAutoEnvironmentToJSON(containerAutoEnvironment: ContainerAutoEnvironment): string;
//# sourceMappingURL=containerautoenvironment.d.ts.map