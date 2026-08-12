"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthorizedCourseUnlockRequest = exports.deriveCourseUnlockSemanticSubjectFingerprint = exports.deriveCourseUnlockIdentityFingerprint = exports.requiredCourseUnlockPriceStars = exports.COURSE_UNLOCK_POLICY_FINGERPRINT_V1 = exports.COURSE_UNLOCK_POLICY_V1 = void 0;
const wallet_1 = require("./wallet");
const decision_registry_1 = require("../policies/decision_registry");
exports.COURSE_UNLOCK_POLICY_V1 = Object.freeze({
    schemaVersion: "learning-v2-required-session-unlock-policy.v1",
    totalRequiredSessions: 384,
    unlockPriceLadderStars: Object.freeze([0, 45, 50, 55, 60, 65]),
    freeFirstScope: "stable_course_and_study_target",
    progression: "strictly_contiguous_1_to_384",
    subscriptionWaivesStarPrice: false,
    walletSubunitsPerStar: wallet_1.WALLET_SUBUNITS_PER_STAR,
});
exports.COURSE_UNLOCK_POLICY_FINGERPRINT_V1 = (0, decision_registry_1.hashCanonicalBody)(exports.COURSE_UNLOCK_POLICY_V1);
const requiredCourseUnlockPriceStars = (previouslyUnlockedRequiredSessions) => {
    if (!Number.isSafeInteger(previouslyUnlockedRequiredSessions) ||
        Object.is(previouslyUnlockedRequiredSessions, -0) ||
        Number(previouslyUnlockedRequiredSessions) < 0 ||
        Number(previouslyUnlockedRequiredSessions) >= exports.COURSE_UNLOCK_POLICY_V1.totalRequiredSessions) {
        throw new Error("course_unlock_policy_progress_invalid");
    }
    return exports.COURSE_UNLOCK_POLICY_V1.unlockPriceLadderStars[Math.min(Number(previouslyUnlockedRequiredSessions), exports.COURSE_UNLOCK_POLICY_V1.unlockPriceLadderStars.length - 1)];
};
exports.requiredCourseUnlockPriceStars = requiredCourseUnlockPriceStars;
const HASH = /^[a-f0-9]{64}$/;
const BODY_KEYS = [
    "schemaVersion", "authority", "operationId", "semanticSubjectFingerprint",
    "accountScopeHash", "accountGeneration", "courseId", "studyTarget",
    "requiredSessionOrdinal", "walletRevisionBefore", "walletStateBeforeFingerprint",
    "courseRevisionBefore", "courseStateBeforeFingerprint", "chargeSubunits",
    "basis", "policyFingerprint", "targetSessionRef",
];
const FULL_KEYS = [...BODY_KEYS, "semanticFingerprint", "operationFingerprint"];
const TARGET_KEYS = [
    "courseReleaseId", "sessionSetId", "sessionSetHash", "catalogFingerprint", "sessionId",
];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const safe = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum && Number(value) <= maximum;
const validHash = (value) => typeof value === "string" && HASH.test(value);
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const deriveCourseUnlockIdentityFingerprint = (input) => (0, decision_registry_1.hashCanonicalBody)({
    schemaVersion: "learning-v2-course-unlock-identity.v1",
    accountScopeHash: input.accountScopeHash,
    courseId: input.courseId,
    studyTarget: input.studyTarget,
    entitlementKind: "required_session",
});
exports.deriveCourseUnlockIdentityFingerprint = deriveCourseUnlockIdentityFingerprint;
const deriveCourseUnlockSemanticSubjectFingerprint = (input) => (0, decision_registry_1.hashCanonicalBody)({
    schemaVersion: "learning-v2-course-unlock-semantic-subject.v1",
    accountScopeHash: input.accountScopeHash,
    courseId: input.courseId,
    studyTarget: input.studyTarget,
    requiredSessionOrdinal: input.requiredSessionOrdinal,
    entitlementKind: "required_session",
});
exports.deriveCourseUnlockSemanticSubjectFingerprint = deriveCourseUnlockSemanticSubjectFingerprint;
const parseTargetSessionRef = (input) => {
    if (!isRecord(input) || !exactKeys(input, TARGET_KEYS) ||
        !(0, wallet_1.isWalletIdentifier)(input.courseReleaseId) || !(0, wallet_1.isWalletIdentifier)(input.sessionSetId) ||
        !validHash(input.sessionSetHash) || !validHash(input.catalogFingerprint) ||
        !(0, wallet_1.isWalletIdentifier)(input.sessionId)) {
        throw new Error("course_unlock_request_invalid");
    }
    return input;
};
const createAuthorizedCourseUnlockRequest = (input) => {
    const detached = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_request_invalid");
    if (!isRecord(detached))
        throw new Error("course_unlock_request_invalid");
    const materialized = Object.prototype.hasOwnProperty.call(detached, "operationFingerprint");
    if (!(materialized ? exactKeys(detached, FULL_KEYS) : exactKeys(detached, BODY_KEYS)) ||
        detached.schemaVersion !== "learning-v2-course-unlock-authorized-request.v1" ||
        detached.authority !== "trusted_server_boundary" || !(0, wallet_1.isWalletIdentifier)(detached.operationId) ||
        !validHash(detached.semanticSubjectFingerprint) ||
        typeof detached.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(detached.accountScopeHash) ||
        !safe(detached.accountGeneration) || !(0, wallet_1.isWalletIdentifier)(detached.courseId) ||
        !(0, wallet_1.isWalletIdentifier)(detached.studyTarget) || !safe(detached.requiredSessionOrdinal, 1, 384) ||
        !safe(detached.walletRevisionBefore) || !validHash(detached.walletStateBeforeFingerprint) ||
        !safe(detached.courseRevisionBefore) || !validHash(detached.courseStateBeforeFingerprint) ||
        !safe(detached.chargeSubunits) ||
        (detached.basis !== "free_first_session" && detached.basis !== "stars") ||
        detached.policyFingerprint !== exports.COURSE_UNLOCK_POLICY_FINGERPRINT_V1) {
        throw new Error("course_unlock_request_invalid");
    }
    const targetSessionRef = parseTargetSessionRef(detached.targetSessionRef);
    const requiredSessionOrdinal = Number(detached.requiredSessionOrdinal);
    const expectedCharge = (0, exports.requiredCourseUnlockPriceStars)(requiredSessionOrdinal - 1) * wallet_1.WALLET_SUBUNITS_PER_STAR;
    const expectedBasis = requiredSessionOrdinal === 1 ? "free_first_session" : "stars";
    const expectedSubject = (0, exports.deriveCourseUnlockSemanticSubjectFingerprint)({
        accountScopeHash: detached.accountScopeHash,
        courseId: detached.courseId,
        studyTarget: detached.studyTarget,
        requiredSessionOrdinal,
    });
    if (detached.chargeSubunits !== expectedCharge || detached.basis !== expectedBasis ||
        detached.semanticSubjectFingerprint !== expectedSubject) {
        throw new Error("course_unlock_request_invalid");
    }
    const body = {
        schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
        authority: "trusted_server_boundary",
        operationId: detached.operationId,
        semanticSubjectFingerprint: detached.semanticSubjectFingerprint,
        accountScopeHash: detached.accountScopeHash,
        accountGeneration: Number(detached.accountGeneration),
        courseId: detached.courseId,
        studyTarget: detached.studyTarget,
        requiredSessionOrdinal,
        walletRevisionBefore: Number(detached.walletRevisionBefore),
        walletStateBeforeFingerprint: detached.walletStateBeforeFingerprint,
        courseRevisionBefore: Number(detached.courseRevisionBefore),
        courseStateBeforeFingerprint: detached.courseStateBeforeFingerprint,
        chargeSubunits: Number(detached.chargeSubunits),
        basis: detached.basis,
        policyFingerprint: exports.COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
        targetSessionRef,
    };
    const semanticFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-course-unlock-semantics.v1",
        semanticSubjectFingerprint: body.semanticSubjectFingerprint,
        accountScopeHash: body.accountScopeHash,
        courseId: body.courseId,
        studyTarget: body.studyTarget,
        requiredSessionOrdinal: body.requiredSessionOrdinal,
        chargeSubunits: body.chargeSubunits,
        basis: body.basis,
        policyFingerprint: body.policyFingerprint,
        targetSessionRef: body.targetSessionRef,
    });
    const result = deepFreeze({
        ...body,
        semanticFingerprint,
        operationFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if (materialized && (detached.semanticFingerprint !== result.semanticFingerprint ||
        detached.operationFingerprint !== result.operationFingerprint)) {
        throw new Error("course_unlock_request_invalid");
    }
    return result;
};
exports.createAuthorizedCourseUnlockRequest = createAuthorizedCourseUnlockRequest;
//# sourceMappingURL=course_unlock.js.map