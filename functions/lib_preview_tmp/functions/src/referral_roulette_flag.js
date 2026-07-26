"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referralRouletteEnabledFromData = referralRouletteEnabledFromData;
const referral_roulette_policy_1 = require("./referral_roulette_policy");
/**
 * Missing keys remain ON for compatibility. An explicit boolean false is the
 * only stored value that disables the program; Firestore read failures are
 * handled separately and fail closed in resolveReferralRouletteEnabled.
 */
function referralRouletteEnabledFromData(data) {
    const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(data);
    return policy.softEnabled && !policy.emergencyStop;
}
//# sourceMappingURL=referral_roulette_flag.js.map