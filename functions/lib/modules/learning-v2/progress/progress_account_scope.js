"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveLocalOfflineProgressAccountScopeHash = exports.LOCAL_OFFLINE_PROGRESS_GENERATION = exports.deriveProgressAccountScopeHash = void 0;
const decision_registry_1 = require("../policies/decision_registry");
/** Account scope shared by the offline envelope and the server inbox. */
const deriveProgressAccountScopeHash = (stableUid, generation) => {
    if (typeof stableUid !== "string" || !stableUid.trim() ||
        !Number.isSafeInteger(generation) || generation < 1) {
        throw new Error("v2_progress_account_identity_invalid");
    }
    return (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-progress-account-scope.v1",
        stableUid,
        generation,
    });
};
exports.deriveProgressAccountScopeHash = deriveProgressAccountScopeHash;
/**
 * Local Learning V2 drafts are stable across process restarts. The app's
 * process-local account generation is only a race fence and must never be
 * serialized as the server's durable account generation. Background transport
 * rebinds an exact completion to a server-owned binding before upload.
 */
exports.LOCAL_OFFLINE_PROGRESS_GENERATION = 0;
const deriveLocalOfflineProgressAccountScopeHash = (stableUid) => {
    if (typeof stableUid !== "string" || !stableUid.trim()) {
        throw new Error("v2_local_progress_account_identity_invalid");
    }
    return (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-local-progress-account-scope.v1",
        stableUid,
    });
};
exports.deriveLocalOfflineProgressAccountScopeHash = deriveLocalOfflineProgressAccountScopeHash;
//# sourceMappingURL=progress_account_scope.js.map