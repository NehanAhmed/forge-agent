import * as z from "zod/v4";
import { ContainerAutoEnvironment, ContainerAutoEnvironment$Outbound } from "./containerautoenvironment.js";
import { ContainerReferenceEnvironment, ContainerReferenceEnvironment$Outbound } from "./containerreferenceenvironment.js";
/**
 * Server-side execution environment for the shell tool. Only container-backed environments are supported; "local" shells are not.
 */
export type ShellServerToolEnvironment = ContainerAutoEnvironment | ContainerReferenceEnvironment;
/** @internal */
export type ShellServerToolEnvironment$Outbound = ContainerAutoEnvironment$Outbound | ContainerReferenceEnvironment$Outbound;
/** @internal */
export declare const ShellServerToolEnvironment$outboundSchema: z.ZodType<ShellServerToolEnvironment$Outbound, ShellServerToolEnvironment>;
export declare function shellServerToolEnvironmentToJSON(shellServerToolEnvironment: ShellServerToolEnvironment): string;
//# sourceMappingURL=shellservertoolenvironment.d.ts.map