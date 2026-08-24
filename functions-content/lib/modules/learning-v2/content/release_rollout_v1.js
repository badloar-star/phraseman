"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_RELEASE_COHORT_POLICY_V1 = void 0;
exports.learningV2ReleaseCohortIdV1 = learningV2ReleaseCohortIdV1;
exports.resolveLearningV2ReleaseRolloutV1 = resolveLearningV2ReleaseRolloutV1;
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_RELEASE_COHORT_POLICY_V1 = "learning-v2-release-cohort.v1";
const STABLE_ID_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ALLOWED_PERCENT = new Set([0, 1, 5, 10, 25, 50, 100]);
function fail() {
    throw new Error("learning_v2_release_rollout_invalid");
}
function learningV2ReleaseCohortIdV1(stableAccountId, cohortSaltVersion) {
    if (typeof stableAccountId !== "string" ||
        !STABLE_ID_RE.test(stableAccountId) ||
        !Number.isSafeInteger(cohortSaltVersion) ||
        cohortSaltVersion < 1)
        fail();
    return (0, decision_registry_1.sha256Utf8)(`${exports.LEARNING_V2_RELEASE_COHORT_POLICY_V1}:${cohortSaltVersion}:${stableAccountId}`);
}
function resolveLearningV2ReleaseRolloutV1(input) {
    const rollout = input.pointer?.rollout;
    if (typeof rollout !== "object" ||
        rollout === null ||
        !Number.isSafeInteger(rollout.cohortSaltVersion) ||
        rollout.cohortSaltVersion < 1 ||
        !ALLOWED_PERCENT.has(rollout.percent) ||
        !["internal", "rolling_out", "live", "paused", "rolled_back"].includes(rollout.state) ||
        !Array.isArray(rollout.allowlistCohortIds) ||
        !Array.isArray(rollout.excludeCohortIds) ||
        rollout.allowlistCohortIds.some((id) => !HASH_RE.test(id)) ||
        rollout.excludeCohortIds.some((id) => !HASH_RE.test(id)))
        fail();
    const cohortId = learningV2ReleaseCohortIdV1(input.stableAccountId, rollout.cohortSaltVersion);
    const bucket = Number(BigInt(`0x${cohortId.slice(0, 16)}`) % 100n);
    const excluded = rollout.excludeCohortIds.includes(cohortId);
    const allowlisted = rollout.allowlistCohortIds.includes(cohortId);
    let eligible = false;
    let reason;
    let effectivePercent = rollout.percent;
    if (excluded) {
        reason = "excluded";
    }
    else if (rollout.state === "paused") {
        effectivePercent = 0;
        reason = "paused";
    }
    else if (rollout.state === "internal") {
        effectivePercent = 0;
        eligible = allowlisted;
        reason = allowlisted ? "internal_allowlist" : "internal_not_allowlisted";
    }
    else if (allowlisted) {
        eligible = true;
        reason = "allowlisted";
    }
    else if (bucket < effectivePercent) {
        eligible = true;
        reason = "percentage";
    }
    else {
        reason = "outside_percentage";
    }
    return Object.freeze({
        eligible,
        reason,
        cohortId,
        bucket,
        effectivePercent,
        authority: "code_owned_stable_account_rollout_decision",
    });
}
//# sourceMappingURL=release_rollout_v1.js.map