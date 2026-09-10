import * as z from "zod/v4";
import * as discriminatedUnionTypes from "../types/discriminatedUnion.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityArizeDestination } from "./observabilityarizedestination.js";
import { ObservabilityBraintrustDestination } from "./observabilitybraintrustdestination.js";
import { ObservabilityClickhouseDestination } from "./observabilityclickhousedestination.js";
import { ObservabilityDatadogDestination } from "./observabilitydatadogdestination.js";
import { ObservabilityGrafanaDestination } from "./observabilitygrafanadestination.js";
import { ObservabilityLangfuseDestination } from "./observabilitylangfusedestination.js";
import { ObservabilityLangsmithDestination } from "./observabilitylangsmithdestination.js";
import { ObservabilityNewrelicDestination } from "./observabilitynewrelicdestination.js";
import { ObservabilityOpikDestination } from "./observabilityopikdestination.js";
import { ObservabilityOtelCollectorDestination } from "./observabilityotelcollectordestination.js";
import { ObservabilityPosthogDestination } from "./observabilityposthogdestination.js";
import { ObservabilityRampDestination } from "./observabilityrampdestination.js";
import { ObservabilityS3Destination } from "./observabilitys3destination.js";
import { ObservabilitySentryDestination } from "./observabilitysentrydestination.js";
import { ObservabilitySnowflakeDestination } from "./observabilitysnowflakedestination.js";
import { ObservabilityWeaveDestination } from "./observabilityweavedestination.js";
import { ObservabilityWebhookDestination } from "./observabilitywebhookdestination.js";
export type ObservabilityDestination = ObservabilityArizeDestination | ObservabilityBraintrustDestination | ObservabilityClickhouseDestination | ObservabilityDatadogDestination | ObservabilityGrafanaDestination | ObservabilityLangfuseDestination | ObservabilityLangsmithDestination | ObservabilityNewrelicDestination | ObservabilityOpikDestination | ObservabilityOtelCollectorDestination | ObservabilityPosthogDestination | ObservabilityRampDestination | ObservabilityS3Destination | ObservabilitySentryDestination | ObservabilitySnowflakeDestination | ObservabilityWeaveDestination | ObservabilityWebhookDestination | discriminatedUnionTypes.Unknown<"type">;
/** @internal */
export declare const ObservabilityDestination$inboundSchema: z.ZodType<ObservabilityDestination, unknown>;
export declare function observabilityDestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityDestination, SDKValidationError>;
//# sourceMappingURL=observabilitydestination.d.ts.map