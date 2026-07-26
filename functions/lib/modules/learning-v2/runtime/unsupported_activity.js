"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedActivityError = void 0;
/** Recovery error used by the React-free activity runtime boundary. */
class UnsupportedActivityError extends Error {
    constructor(activityTypeKey) {
        super("v2_activity_unknown_type");
        this.activityTypeKey = activityTypeKey;
        this.code = "v2_activity_unknown_type";
        this.name = "UnsupportedActivityError";
    }
}
exports.UnsupportedActivityError = UnsupportedActivityError;
//# sourceMappingURL=unsupported_activity.js.map