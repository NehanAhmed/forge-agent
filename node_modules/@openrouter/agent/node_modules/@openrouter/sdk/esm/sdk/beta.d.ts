import { ClientSDK } from "../lib/sdks.js";
import { BetaAnalytics } from "./betaanalytics.js";
import { Responses } from "./responses.js";
export declare class Beta extends ClientSDK {
    private _analytics?;
    get analytics(): BetaAnalytics;
    private _responses?;
    get responses(): Responses;
}
//# sourceMappingURL=beta.d.ts.map