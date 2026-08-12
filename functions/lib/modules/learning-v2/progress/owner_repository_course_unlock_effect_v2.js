"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2 = exports.materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2 = exports.parseOwnerRepositoryCourseUnlockEffectRecordV2 = exports.createOwnerRepositoryCourseUnlockEffectRecordV2 = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const course_unlock_reducer_1 = require("./course_unlock_reducer");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BLOB_BYTES = 512 * 1024;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"];
const COURSE_REF_KEYS = ["schemaVersion", "courseIdentityFingerprint", "stateRef"];
const CREATE_KEYS = [
    "accountScopeHash",
    "journalSequence",
    "repositoryRevisionBefore",
    "rootBeforeFingerprint",
    "previousJournalRecordRef",
    "walletStateBeforeRef",
    "walletStateAfterRef",
    "courseStateBeforeRef",
    "courseStateAfterRef",
    "courseStateManifestBeforeRef",
    "courseStateManifestAfterRef",
    "operationIndexManifestBeforeRef",
    "subjectIndexManifestBeforeRef",
    "receiptIndexManifestBeforeRef",
    "appliedReceipt",
];
const RECORD_KEYS = [
    "schemaVersion",
    "recordKind",
    "accountScopeHash",
    "acceptedAccountGeneration",
    "journalSequence",
    "repositoryRevisionBefore",
    "rootBeforeFingerprint",
    "previousJournalRecordRef",
    "canonicalOperationId",
    "operationFingerprint",
    "semanticSubjectFingerprint",
    "semanticFingerprint",
    "appliedReceiptFingerprint",
    "courseIdentityFingerprint",
    "walletStateBeforeFingerprint",
    "walletStateAfterFingerprint",
    "courseStateBeforeFingerprint",
    "courseStateAfterFingerprint",
    "walletStateBeforeRef",
    "walletStateAfterRef",
    "courseStateBeforeRef",
    "courseStateAfterRef",
    "courseStateManifestBeforeRef",
    "courseStateManifestAfterRef",
    "operationIndexManifestBeforeRef",
    "subjectIndexManifestBeforeRef",
    "receiptIndexManifestBeforeRef",
    "appliedReceipt",
    "journalRecordFingerprint",
];
const ENVELOPE_KEYS = ["schemaVersion", "accountScopeHash", "kind", "payload"];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_course_unlock_effect_v2_invalid");
};
const indeterminate = () => {
    throw new Error("owner_repository_course_unlock_effect_v2_indeterminate");
};
const safe = (value, minimum = 0) => Number.isSafeInteger(value) &&
    !Object.is(value, -0) &&
    Number(value) >= minimum;
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const deepFreeze = (value) => {
    const stack = [value];
    const seen = new Set();
    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current !== "object" || current === null || seen.has(current)) {
            continue;
        }
        seen.add(current);
        Object.freeze(current);
        for (const child of Object.values(current)) {
            stack.push(child);
        }
    }
    return value;
};
const readRecord = (input, keys, stored = false) => {
    const fail = stored ? indeterminate : invalid;
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        return fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length ||
        own.some((key) => typeof key !== "string" || !keys.includes(key)) ||
        keys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        })) {
        return fail();
    }
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const detachRecord = (input, keys, stored) => {
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, stored
            ? "owner_repository_course_unlock_effect_v2_indeterminate"
            : "owner_repository_course_unlock_effect_v2_invalid");
    }
    catch {
        return stored ? indeterminate() : invalid();
    }
    return readRecord(detached, keys, stored);
};
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseRef = (input, accountScopeHash, kind, stored) => {
    const value = readRecord(input, REF_KEYS, stored);
    if (value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        value.kind !== kind ||
        typeof value.blobFingerprint !== "string" ||
        !HASH.test(value.blobFingerprint) ||
        value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)) {
        return stored ? indeterminate() : invalid();
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
        kind,
        blobKey: value.blobKey,
        blobFingerprint: value.blobFingerprint,
    });
};
const parseCourseRef = (input, accountScopeHash, stored) => {
    const value = readRecord(input, COURSE_REF_KEYS, stored);
    if (value.schemaVersion !== "learning-v2-owner-repository-course-ref.v1" ||
        typeof value.courseIdentityFingerprint !== "string" ||
        !HASH.test(value.courseIdentityFingerprint)) {
        return stored ? indeterminate() : invalid();
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-course-ref.v1",
        courseIdentityFingerprint: value.courseIdentityFingerprint,
        stateRef: parseRef(value.stateRef, accountScopeHash, "course_unlock_state", stored),
    });
};
const parseCoordinates = (input, stored) => {
    const value = detachRecord(input, stored ? RECORD_KEYS : CREATE_KEYS, stored);
    const fail = stored ? indeterminate : invalid;
    if (typeof value.accountScopeHash !== "string" ||
        !ACCOUNT.test(value.accountScopeHash) ||
        !safe(value.journalSequence, 1) ||
        !safe(value.repositoryRevisionBefore) ||
        value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
        typeof value.rootBeforeFingerprint !== "string" ||
        !HASH.test(value.rootBeforeFingerprint)) {
        return fail();
    }
    const accountScopeHash = value.accountScopeHash;
    const journalSequence = Number(value.journalSequence);
    const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
    if (journalSequence - 1 > repositoryRevisionBefore)
        return fail();
    const previousJournalRecordRef = value.previousJournalRecordRef === null
        ? null
        : parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record", stored);
    if ((journalSequence === 1) !== (previousJournalRecordRef === null)) {
        return fail();
    }
    return {
        value,
        accountScopeHash,
        journalSequence,
        repositoryRevisionBefore,
        rootBeforeFingerprint: value.rootBeforeFingerprint,
        previousJournalRecordRef,
        walletStateBeforeRef: parseRef(value.walletStateBeforeRef, accountScopeHash, "wallet_state", stored),
        walletStateAfterRef: parseRef(value.walletStateAfterRef, accountScopeHash, "wallet_state", stored),
        courseStateBeforeRef: value.courseStateBeforeRef === null
            ? null
            : parseCourseRef(value.courseStateBeforeRef, accountScopeHash, stored),
        courseStateAfterRef: parseCourseRef(value.courseStateAfterRef, accountScopeHash, stored),
        courseStateManifestBeforeRef: parseRef(value.courseStateManifestBeforeRef, accountScopeHash, "course_state_manifest", stored),
        courseStateManifestAfterRef: parseRef(value.courseStateManifestAfterRef, accountScopeHash, "course_state_manifest", stored),
        operationIndexManifestBeforeRef: parseRef(value.operationIndexManifestBeforeRef, accountScopeHash, "operation_index_manifest", stored),
        subjectIndexManifestBeforeRef: parseRef(value.subjectIndexManifestBeforeRef, accountScopeHash, "subject_index_manifest", stored),
        receiptIndexManifestBeforeRef: parseRef(value.receiptIndexManifestBeforeRef, accountScopeHash, "receipt_index_manifest", stored),
    };
};
const createOwnerRepositoryCourseUnlockEffectRecordV2 = (input) => {
    const parsed = parseCoordinates(input, false);
    let appliedReceipt;
    try {
        appliedReceipt = (0, course_unlock_reducer_1.parseCourseUnlockAppliedReceipt)(parsed.value.appliedReceipt);
    }
    catch {
        return invalid();
    }
    const request = appliedReceipt.authorizedRequest;
    const free = appliedReceipt.chargedSubunits === 0;
    const identity = appliedReceipt.courseUnlockStateBefore.courseIdentityFingerprint;
    const refs = [
        parsed.walletStateBeforeRef,
        parsed.walletStateAfterRef,
        ...(parsed.courseStateBeforeRef ? [parsed.courseStateBeforeRef.stateRef] : []),
        parsed.courseStateAfterRef.stateRef,
        parsed.courseStateManifestBeforeRef,
        parsed.courseStateManifestAfterRef,
        parsed.operationIndexManifestBeforeRef,
        parsed.subjectIndexManifestBeforeRef,
        parsed.receiptIndexManifestBeforeRef,
        ...(parsed.previousJournalRecordRef ? [parsed.previousJournalRecordRef] : []),
    ];
    const expectedUnique = refs.length - (free ? 1 : 0);
    if (request.accountScopeHash !== parsed.accountScopeHash ||
        (free ? parsed.courseStateBeforeRef !== null : parsed.courseStateBeforeRef === null) ||
        (parsed.courseStateBeforeRef !== null &&
            parsed.courseStateBeforeRef.courseIdentityFingerprint !== identity) ||
        parsed.courseStateAfterRef.courseIdentityFingerprint !== identity ||
        (parsed.courseStateBeforeRef !== null &&
            parsed.courseStateBeforeRef.stateRef.blobFingerprint ===
                parsed.courseStateAfterRef.stateRef.blobFingerprint) ||
        (free
            ? parsed.walletStateBeforeRef.blobFingerprint !==
                parsed.walletStateAfterRef.blobFingerprint
            : parsed.walletStateBeforeRef.blobFingerprint ===
                parsed.walletStateAfterRef.blobFingerprint) ||
        parsed.courseStateManifestBeforeRef.blobFingerprint ===
            parsed.courseStateManifestAfterRef.blobFingerprint ||
        new Set(refs.map((ref) => ref.blobFingerprint)).size !== expectedUnique) {
        return invalid();
    }
    const body = {
        schemaVersion: "learning-v2-owner-repository-course-unlock-effect-record.v2",
        recordKind: "course_unlock",
        accountScopeHash: parsed.accountScopeHash,
        acceptedAccountGeneration: request.accountGeneration,
        journalSequence: parsed.journalSequence,
        repositoryRevisionBefore: parsed.repositoryRevisionBefore,
        rootBeforeFingerprint: parsed.rootBeforeFingerprint,
        previousJournalRecordRef: parsed.previousJournalRecordRef,
        canonicalOperationId: request.operationId,
        operationFingerprint: request.operationFingerprint,
        semanticSubjectFingerprint: request.semanticSubjectFingerprint,
        semanticFingerprint: request.semanticFingerprint,
        appliedReceiptFingerprint: appliedReceipt.appliedReceiptFingerprint,
        courseIdentityFingerprint: identity,
        walletStateBeforeFingerprint: appliedReceipt.walletStateBefore.stateFingerprint,
        walletStateAfterFingerprint: appliedReceipt.walletStateAfter.stateFingerprint,
        courseStateBeforeFingerprint: appliedReceipt.courseUnlockStateBefore.stateFingerprint,
        courseStateAfterFingerprint: appliedReceipt.courseUnlockStateAfter.stateFingerprint,
        walletStateBeforeRef: parsed.walletStateBeforeRef,
        walletStateAfterRef: parsed.walletStateAfterRef,
        courseStateBeforeRef: parsed.courseStateBeforeRef,
        courseStateAfterRef: parsed.courseStateAfterRef,
        courseStateManifestBeforeRef: parsed.courseStateManifestBeforeRef,
        courseStateManifestAfterRef: parsed.courseStateManifestAfterRef,
        operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
        subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
        receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
        appliedReceipt,
    };
    return deepFreeze({
        ...body,
        journalRecordFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.createOwnerRepositoryCourseUnlockEffectRecordV2 = createOwnerRepositoryCourseUnlockEffectRecordV2;
const parseOwnerRepositoryCourseUnlockEffectRecordV2 = (input) => {
    const parsed = parseCoordinates(input, true);
    const value = parsed.value;
    if (value.schemaVersion !==
        "learning-v2-owner-repository-course-unlock-effect-record.v2" ||
        value.recordKind !== "course_unlock" ||
        !safe(value.acceptedAccountGeneration) ||
        !(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId) ||
        ![
            value.operationFingerprint,
            value.semanticSubjectFingerprint,
            value.semanticFingerprint,
            value.appliedReceiptFingerprint,
            value.courseIdentityFingerprint,
            value.walletStateBeforeFingerprint,
            value.walletStateAfterFingerprint,
            value.courseStateBeforeFingerprint,
            value.courseStateAfterFingerprint,
            value.journalRecordFingerprint,
        ].every((candidate) => typeof candidate === "string" && HASH.test(candidate))) {
        return indeterminate();
    }
    let rebuilt;
    try {
        rebuilt = (0, exports.createOwnerRepositoryCourseUnlockEffectRecordV2)({
            accountScopeHash: parsed.accountScopeHash,
            journalSequence: parsed.journalSequence,
            repositoryRevisionBefore: parsed.repositoryRevisionBefore,
            rootBeforeFingerprint: parsed.rootBeforeFingerprint,
            previousJournalRecordRef: parsed.previousJournalRecordRef,
            walletStateBeforeRef: parsed.walletStateBeforeRef,
            walletStateAfterRef: parsed.walletStateAfterRef,
            courseStateBeforeRef: parsed.courseStateBeforeRef,
            courseStateAfterRef: parsed.courseStateAfterRef,
            courseStateManifestBeforeRef: parsed.courseStateManifestBeforeRef,
            courseStateManifestAfterRef: parsed.courseStateManifestAfterRef,
            operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
            subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
            receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
            appliedReceipt: value.appliedReceipt,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(rebuilt, value))
        return indeterminate();
    return rebuilt;
};
exports.parseOwnerRepositoryCourseUnlockEffectRecordV2 = parseOwnerRepositoryCourseUnlockEffectRecordV2;
const materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2 = (input) => {
    let record;
    try {
        record = (0, exports.parseOwnerRepositoryCourseUnlockEffectRecordV2)(input);
    }
    catch {
        return invalid();
    }
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash: record.accountScopeHash,
        kind: "journal_record",
        payload: record,
    };
    let encoded;
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
    }
    catch {
        return invalid();
    }
    if (encoded.length > MAX_BLOB_BYTES || (0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BLOB_BYTES) {
        return invalid();
    }
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "journal_record",
            blobKey: blobKey(record.accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
        encoded,
        record,
    });
};
exports.materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2 = materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2;
const parseOwnerRepositoryCourseUnlockEffectRecordBlobV2 = (input) => {
    const request = readRecord(input, ["accountScopeHash", "ref", "raw"], true);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.raw !== "string" ||
        request.raw.length > MAX_BLOB_BYTES) {
        return indeterminate();
    }
    const ref = parseRef(request.ref, request.accountScopeHash, "journal_record", true);
    let envelope;
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MAX_BLOB_BYTES ||
            (0, decision_registry_1.sha256Utf8)(request.raw) !== ref.blobFingerprint) {
            return indeterminate();
        }
        envelope = JSON.parse(request.raw);
        if ((0, decision_registry_1.canonicalJsonV1)(envelope) !== request.raw)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    if (!isRecord(envelope) ||
        Reflect.ownKeys(envelope).length !== ENVELOPE_KEYS.length ||
        !Reflect.ownKeys(envelope).every((key) => typeof key === "string" &&
            ENVELOPE_KEYS.includes(key)) ||
        envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        envelope.accountScopeHash !== request.accountScopeHash ||
        envelope.kind !== "journal_record") {
        return indeterminate();
    }
    const record = (0, exports.parseOwnerRepositoryCourseUnlockEffectRecordV2)(envelope.payload);
    const rebuilt = (0, exports.materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2)(record);
    if (rebuilt.encoded !== request.raw || !same(rebuilt.ref, ref)) {
        return indeterminate();
    }
    return rebuilt;
};
exports.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2 = parseOwnerRepositoryCourseUnlockEffectRecordBlobV2;
//# sourceMappingURL=owner_repository_course_unlock_effect_v2.js.map