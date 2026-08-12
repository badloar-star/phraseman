"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveLearningV2EconomicAccountScopeHash = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const STABLE_UID = /^[A-Za-z0-9._-]{1,160}$/;
/**
 * Stable account-global identity for Learning V2 economics.
 *
 * Account generation is deliberately absent. Generation is a publication
 * fence/provenance coordinate and may advance while the same wallet, lifetime
 * indexes and journal remain reachable.
 */
const deriveLearningV2EconomicAccountScopeHash = (stableUid) => {
    if (typeof stableUid !== "string" ||
        !STABLE_UID.test(stableUid) ||
        stableUid === "." ||
        stableUid === "..") {
        throw new Error("learning_v2_economic_account_scope_invalid");
    }
    return (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-economic-account-scope.v1",
        stableUid,
    });
};
exports.deriveLearningV2EconomicAccountScopeHash = deriveLearningV2EconomicAccountScopeHash;
//# sourceMappingURL=economic_account_scope.js.map