import * as z from "zod/v4";
import { ContainerAutoEnvironment, ContainerAutoEnvironment$Outbound } from "./containerautoenvironment.js";
import { ContainerReferenceEnvironment, ContainerReferenceEnvironment$Outbound } from "./containerreferenceenvironment.js";
/**
 * Execution environment for the bash server tool.
 */
export type BashServerToolEnvironment = ContainerAutoEnvironment | ContainerReferenceEnvironment;
/** @internal */
export type BashServerToolEnvironment$Outbound = ContainerAutoEnvironment$Outbound | ContainerReferenceEnvironment$Outbound;
/** @internal */
export declare const BashServerToolEnvironment$outboundSchema: z.ZodType<BashServerToolEnvironment$Outbound, BashServerToolEnvironment>;
export declare function bashServerToolEnvironmentToJSON(bashServerToolEnvironment: BashServerToolEnvironment): string;
//# sourceMappingURL=bashservertoolenvironment.d.ts.map