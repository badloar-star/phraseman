"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReferralSoftOffAtMs = resolveReferralSoftOffAtMs;
exports.referralSoftToggleReplayResult = referralSoftToggleReplayResult;
function resolveReferralSoftOffAtMs(input) {
    if (input.enabled)
        return 0;
    if (!input.beforeEnabled && input.beforeSoftOffAtMs > 0)
        return input.beforeSoftOffAtMs;
    return input.nowMs;
}
function referralSoftToggleReplayResult(previous) {
    return {
        ok: true,
        enabled: previous.enabled === true,
        softOffAtMs: Math.max(0, Math.floor(Number(previous.softOffAtMs) || 0)),
        auditId: String(previous.auditId ?? ''),
        replayed: true,
    };
}
//# sourceMappingURL=referral_admin_soft_toggle.js.map