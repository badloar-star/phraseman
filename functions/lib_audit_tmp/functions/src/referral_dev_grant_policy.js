"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertReferralDevGrantAcquisitionAllowed = assertReferralDevGrantAcquisitionAllowed;
exports.reconcileDevGrantLedger = reconcileDevGrantLedger;
const https_1 = require("firebase-functions/v2/https");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
/** Dev issuance is acquisition, so it closes with the public soft-sunset gate. */
function assertReferralDevGrantAcquisitionAllowed(policy) {
    if (policy.emergencyStop) {
        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
    }
    if (!policy.softEnabled) {
        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_SOFT_SUNSET');
    }
}
function reconcileDevGrantLedger(rows, nowMs) {
    const reconciled = (0, referral_spin_ledger_1.reconcileLedgerRowsForClaim)(rows, nowMs, { softEnabled: true }, 1);
    return {
        expiredIds: reconciled.expiredIds,
        spinsTotalAfterGrant: reconciled.availableCountAfterClaim,
    };
}
//# sourceMappingURL=referral_dev_grant_policy.js.map