"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerCourseUnlockReceiptAuthority = exports.parseServerCourseUnlockRequest = exports.materializeServerCourseUnlockRequest = exports.parseServerCourseUnlockReceiptRaw = exports.materializeServerCourseUnlockReceiptCandidate = exports.parseServerCourseUnlockIntent = void 0;
const course_unlock_1 = require("../contracts/course_unlock");
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const course_unlock_reducer_1 = require("./course_unlock_reducer");
const wallet_reducer_1 = require("./wallet_reducer");
const INTENT_KEYS = [
    "schemaVersion", "accountScopeHash", "accountGeneration", "courseId",
    "studyTarget", "requiredSessionOrdinal", "walletRevisionBefore",
    "walletStateBeforeFingerprint", "courseRevisionBefore",
    "courseStateBeforeFingerprint",
];
const MATERIALIZE_KEYS = ["intent", "targetSessionRef"];
const RECORD_KEYS = [
    "schemaVersion", "recordKind", "unlockId", "authorizedRequest",
    "unlockFingerprint", "recordFingerprint",
];
const REQUEST_KEYS = [
    "schemaVersion", "operationId", "courseId", "studyTarget", "unlockId",
    "unlockFingerprint",
];
const TARGET_KEYS = [
    "courseReleaseId", "sessionSetId", "sessionSetHash", "catalogFingerprint",
    "sessionId",
];
const MAX_BYTES = 128 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => {
    const own = Reflect.ownKeys(value);
    return own.length === keys.length && own.every((key) => typeof key === "string" && keys.includes(key));
};
const safe = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && !Object.is(value, -0) &&
    Number(value) >= minimum && Number(value) <= maximum;
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const fail = (code) => { throw new Error(code); };
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const detachRecord = (input, keys, code) => {
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, code);
    }
    catch {
        return fail(code);
    }
    if (!isRecord(detached) || !exactKeys(detached, keys))
        return fail(code);
    return detached;
};
const readRecord = (input, keys, code) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return fail(code);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length || own.some((key) => typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
        const descriptor = descriptors[key];
        return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    }))
        return fail(code);
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const parseServerCourseUnlockIntent = (input) => {
    const value = detachRecord(input, INTENT_KEYS, "server_course_unlock_intent_invalid");
    if (value.schemaVersion !== "learning-v2-server-course-unlock-intent.v1" ||
        typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
        !safe(value.accountGeneration, 1) || !(0, wallet_1.isWalletIdentifier)(value.courseId) ||
        !(0, wallet_1.isWalletIdentifier)(value.studyTarget) || !safe(value.requiredSessionOrdinal, 1, 384) ||
        !safe(value.walletRevisionBefore) ||
        typeof value.walletStateBeforeFingerprint !== "string" ||
        !HASH.test(value.walletStateBeforeFingerprint) ||
        !safe(value.courseRevisionBefore, 0, 383) ||
        typeof value.courseStateBeforeFingerprint !== "string" ||
        !HASH.test(value.courseStateBeforeFingerprint) ||
        value.requiredSessionOrdinal !== Number(value.courseRevisionBefore) + 1) {
        return fail("server_course_unlock_intent_invalid");
    }
    return deepFreeze({
        schemaVersion: value.schemaVersion,
        accountScopeHash: value.accountScopeHash,
        accountGeneration: Number(value.accountGeneration),
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        requiredSessionOrdinal: Number(value.requiredSessionOrdinal),
        walletRevisionBefore: Number(value.walletRevisionBefore),
        walletStateBeforeFingerprint: value.walletStateBeforeFingerprint,
        courseRevisionBefore: Number(value.courseRevisionBefore),
        courseStateBeforeFingerprint: value.courseStateBeforeFingerprint,
    });
};
exports.parseServerCourseUnlockIntent = parseServerCourseUnlockIntent;
const parseTargetSessionRef = (input) => {
    const value = detachRecord(input, TARGET_KEYS, "server_course_unlock_receipt_invalid");
    if (!(0, wallet_1.isWalletIdentifier)(value.courseReleaseId) ||
        !(0, wallet_1.isWalletIdentifier)(value.sessionSetId) ||
        typeof value.sessionSetHash !== "string" || !HASH.test(value.sessionSetHash) ||
        typeof value.catalogFingerprint !== "string" || !HASH.test(value.catalogFingerprint) ||
        !(0, wallet_1.isWalletIdentifier)(value.sessionId)) {
        return fail("server_course_unlock_receipt_invalid");
    }
    return deepFreeze({
        courseReleaseId: value.courseReleaseId,
        sessionSetId: value.sessionSetId,
        sessionSetHash: value.sessionSetHash,
        catalogFingerprint: value.catalogFingerprint,
        sessionId: value.sessionId,
    });
};
const materializeServerCourseUnlockReceiptCandidate = (input) => {
    const value = detachRecord(input, MATERIALIZE_KEYS, "server_course_unlock_receipt_invalid");
    const intent = (0, exports.parseServerCourseUnlockIntent)(value.intent);
    const targetSessionRef = parseTargetSessionRef(value.targetSessionRef);
    const semanticSubjectFingerprint = (0, course_unlock_1.deriveCourseUnlockSemanticSubjectFingerprint)({
        accountScopeHash: intent.accountScopeHash,
        courseId: intent.courseId,
        studyTarget: intent.studyTarget,
        requiredSessionOrdinal: intent.requiredSessionOrdinal,
    });
    const unlockIdentity = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-server-course-unlock-identity.v1",
        intent,
        targetSessionRef,
    });
    const unlockId = `cu:${unlockIdentity.slice(0, 48)}`;
    const authorizedRequest = (0, course_unlock_1.createAuthorizedCourseUnlockRequest)({
        schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
        authority: "trusted_server_boundary",
        operationId: `course-unlock:${unlockIdentity.slice(0, 40)}`,
        semanticSubjectFingerprint,
        accountScopeHash: intent.accountScopeHash,
        accountGeneration: intent.accountGeneration,
        courseId: intent.courseId,
        studyTarget: intent.studyTarget,
        requiredSessionOrdinal: intent.requiredSessionOrdinal,
        walletRevisionBefore: intent.walletRevisionBefore,
        walletStateBeforeFingerprint: intent.walletStateBeforeFingerprint,
        courseRevisionBefore: intent.courseRevisionBefore,
        courseStateBeforeFingerprint: intent.courseStateBeforeFingerprint,
        chargeSubunits: (0, course_unlock_1.requiredCourseUnlockPriceStars)(intent.requiredSessionOrdinal - 1) * wallet_1.WALLET_SUBUNITS_PER_STAR,
        basis: intent.requiredSessionOrdinal === 1 ? "free_first_session" : "stars",
        policyFingerprint: course_unlock_1.COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
        targetSessionRef,
    });
    const unlockBody = {
        schemaVersion: "learning-v2-server-course-unlock-body.v1",
        unlockId,
        authorizedRequest,
    };
    const withoutRecordFingerprint = {
        schemaVersion: "learning-v2-server-course-unlock-receipt.v1",
        recordKind: "server_course_unlock_receipt",
        unlockId,
        authorizedRequest,
        unlockFingerprint: (0, decision_registry_1.hashCanonicalBody)(unlockBody),
    };
    const receipt = deepFreeze({
        ...withoutRecordFingerprint,
        recordFingerprint: (0, decision_registry_1.hashCanonicalBody)(withoutRecordFingerprint),
    });
    const encoded = (0, decision_registry_1.canonicalJsonV1)(receipt);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BYTES)
        return fail("server_course_unlock_receipt_invalid");
    return deepFreeze({ receipt, encoded, authority: "structural_candidate" });
};
exports.materializeServerCourseUnlockReceiptCandidate = materializeServerCourseUnlockReceiptCandidate;
const parseServerCourseUnlockReceiptRaw = (raw) => {
    if (typeof raw !== "string" || raw.length > MAX_BYTES)
        return fail("server_course_unlock_receipt_indeterminate");
    let value;
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(raw) > MAX_BYTES)
            return fail("server_course_unlock_receipt_indeterminate");
        const parsed = JSON.parse(raw);
        if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
            return fail("server_course_unlock_receipt_indeterminate");
        value = detachRecord(parsed, RECORD_KEYS, "server_course_unlock_receipt_indeterminate");
    }
    catch {
        return fail("server_course_unlock_receipt_indeterminate");
    }
    if (value.schemaVersion !== "learning-v2-server-course-unlock-receipt.v1" ||
        value.recordKind !== "server_course_unlock_receipt" ||
        typeof value.unlockId !== "string" || !(0, wallet_1.isWalletIdentifier)(value.unlockId) ||
        typeof value.unlockFingerprint !== "string" || !HASH.test(value.unlockFingerprint) ||
        typeof value.recordFingerprint !== "string" || !HASH.test(value.recordFingerprint)) {
        return fail("server_course_unlock_receipt_indeterminate");
    }
    let request;
    try {
        request = (0, course_unlock_1.createAuthorizedCourseUnlockRequest)(value.authorizedRequest);
    }
    catch {
        return fail("server_course_unlock_receipt_indeterminate");
    }
    let rebuilt;
    try {
        rebuilt = (0, exports.materializeServerCourseUnlockReceiptCandidate)({
            intent: {
                schemaVersion: "learning-v2-server-course-unlock-intent.v1",
                accountScopeHash: request.accountScopeHash,
                accountGeneration: request.accountGeneration,
                courseId: request.courseId,
                studyTarget: request.studyTarget,
                requiredSessionOrdinal: request.requiredSessionOrdinal,
                walletRevisionBefore: request.walletRevisionBefore,
                walletStateBeforeFingerprint: request.walletStateBeforeFingerprint,
                courseRevisionBefore: request.courseRevisionBefore,
                courseStateBeforeFingerprint: request.courseStateBeforeFingerprint,
            },
            targetSessionRef: request.targetSessionRef,
        });
    }
    catch {
        return fail("server_course_unlock_receipt_indeterminate");
    }
    if (!same(rebuilt.receipt, value) || rebuilt.encoded !== raw)
        return fail("server_course_unlock_receipt_indeterminate");
    return rebuilt;
};
exports.parseServerCourseUnlockReceiptRaw = parseServerCourseUnlockReceiptRaw;
const materializeServerCourseUnlockRequest = (materialization) => deepFreeze({
    schemaVersion: "learning-v2-server-course-unlock-request.v1",
    operationId: materialization.receipt.authorizedRequest.operationId,
    courseId: materialization.receipt.authorizedRequest.courseId,
    studyTarget: materialization.receipt.authorizedRequest.studyTarget,
    unlockId: materialization.receipt.unlockId,
    unlockFingerprint: materialization.receipt.unlockFingerprint,
});
exports.materializeServerCourseUnlockRequest = materializeServerCourseUnlockRequest;
const parseServerCourseUnlockRequest = (input) => {
    const value = detachRecord(input, REQUEST_KEYS, "server_course_unlock_request_invalid");
    if (value.schemaVersion !== "learning-v2-server-course-unlock-request.v1" ||
        typeof value.operationId !== "string" || !(0, wallet_1.isWalletIdentifier)(value.operationId) ||
        typeof value.courseId !== "string" || !(0, wallet_1.isWalletIdentifier)(value.courseId) ||
        typeof value.studyTarget !== "string" || !(0, wallet_1.isWalletIdentifier)(value.studyTarget) ||
        typeof value.unlockId !== "string" || !(0, wallet_1.isWalletIdentifier)(value.unlockId) ||
        typeof value.unlockFingerprint !== "string" || !HASH.test(value.unlockFingerprint)) {
        return fail("server_course_unlock_request_invalid");
    }
    return deepFreeze({
        schemaVersion: value.schemaVersion,
        operationId: value.operationId,
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        unlockId: value.unlockId,
        unlockFingerprint: value.unlockFingerprint,
    });
};
exports.parseServerCourseUnlockRequest = parseServerCourseUnlockRequest;
/**
 * Reads the exact protected server bytes and binds them to the repository's
 * current wallet/course projections. Client JSON never becomes authority by
 * carrying the structural `trusted_server_boundary` label itself.
 */
const createServerCourseUnlockReceiptAuthority = (input) => {
    const options = readRecord(input, ["resolveCourseUnlockReceipt"], "server_course_unlock_authority_invalid");
    if (typeof options.resolveCourseUnlockReceipt !== "function")
        return fail("server_course_unlock_authority_invalid");
    const resolve = options.resolveCourseUnlockReceipt;
    return async (request) => {
        const candidate = (0, exports.parseServerCourseUnlockRequest)(request.candidate);
        let raw;
        try {
            raw = await resolve({
                accountScopeHash: request.scope.accountScopeHash,
                operationId: candidate.operationId,
                courseId: candidate.courseId,
                studyTarget: candidate.studyTarget,
                unlockId: candidate.unlockId,
                unlockFingerprint: candidate.unlockFingerprint,
            });
        }
        catch {
            return fail("server_course_unlock_receipt_unavailable");
        }
        const materialized = (0, exports.parseServerCourseUnlockReceiptRaw)(raw);
        const receipt = materialized.receipt;
        if (receipt.unlockId !== candidate.unlockId ||
            receipt.unlockFingerprint !== candidate.unlockFingerprint ||
            receipt.authorizedRequest.operationId !== candidate.operationId ||
            receipt.authorizedRequest.courseId !== candidate.courseId ||
            receipt.authorizedRequest.studyTarget !== candidate.studyTarget ||
            receipt.authorizedRequest.accountScopeHash !== request.scope.accountScopeHash) {
            return fail("server_course_unlock_receipt_conflict");
        }
        let wallet;
        let course;
        try {
            wallet = (0, wallet_reducer_1.parseWalletState)(request.walletState);
            course = (0, course_unlock_reducer_1.parseCourseUnlockState)(request.courseUnlockState);
        }
        catch {
            return fail("server_course_unlock_projection_indeterminate");
        }
        const authorized = receipt.authorizedRequest;
        if (authorized.accountGeneration !== request.scope.generation ||
            authorized.accountScopeHash !== wallet.accountScopeHash ||
            authorized.accountScopeHash !== course.accountScopeHash ||
            authorized.courseId !== course.courseId ||
            authorized.studyTarget !== course.studyTarget) {
            return fail("server_course_unlock_receipt_conflict");
        }
        if (request.canonicalAppliedReceipt !== null) {
            let canonical;
            try {
                canonical = (0, course_unlock_reducer_1.parseCourseUnlockAppliedReceipt)(request.canonicalAppliedReceipt);
            }
            catch {
                return fail("server_course_unlock_projection_indeterminate");
            }
            if (canonical.authorizedRequest.operationFingerprint !==
                authorized.operationFingerprint ||
                canonical.authorizedRequest.semanticFingerprint !==
                    authorized.semanticFingerprint ||
                canonical.appliedReceiptFingerprint !==
                    request.canonicalAppliedReceipt.appliedReceiptFingerprint) {
                return fail("server_course_unlock_receipt_conflict");
            }
            return authorized;
        }
        if (authorized.walletRevisionBefore !== wallet.revision ||
            authorized.walletStateBeforeFingerprint !== wallet.stateFingerprint ||
            authorized.courseRevisionBefore !== course.revision ||
            authorized.courseStateBeforeFingerprint !== course.stateFingerprint) {
            return fail("server_course_unlock_request_out_of_order");
        }
        return authorized;
    };
};
exports.createServerCourseUnlockReceiptAuthority = createServerCourseUnlockReceiptAuthority;
//# sourceMappingURL=server_course_unlock_receipt.js.map