"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnerRepositoryCourseUnlockStateBlob = exports.materializeOwnerRepositoryCourseUnlockStateBlob = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const course_unlock_reducer_1 = require("./course_unlock_reducer");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 512 * 1024;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"];
const ENVELOPE_KEYS = ["schemaVersion", "accountScopeHash", "kind", "payload"];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_course_blob_invalid");
};
const readRecord = (input, keys) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        return invalid();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.length !== keys.length ||
        ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)) ||
        keys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        })) {
        return invalid();
    }
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
        return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value)) {
        deepFreeze(child);
    }
    return value;
};
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const materializeOwnerRepositoryCourseUnlockStateBlob = (input) => {
    let state;
    try {
        state = (0, course_unlock_reducer_1.parseCourseUnlockState)(input);
    }
    catch {
        return invalid();
    }
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash: state.accountScopeHash,
        kind: "course_unlock_state",
        payload: state,
    };
    let encoded;
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
    }
    catch {
        return invalid();
    }
    if (encoded.length > MAX_BYTES || (0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BYTES) {
        throw new Error("owner_repository_course_blob_overflow");
    }
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        state,
        blob: {
            encoded,
            ref: {
                schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
                kind: "course_unlock_state",
                blobKey: blobKey(state.accountScopeHash, blobFingerprint),
                blobFingerprint,
            },
        },
    });
};
exports.materializeOwnerRepositoryCourseUnlockStateBlob = materializeOwnerRepositoryCourseUnlockStateBlob;
const parseOwnerRepositoryCourseUnlockStateBlob = (input) => {
    let request;
    let refValue;
    try {
        request = readRecord(input, ["accountScopeHash", "ref", "raw"]);
        refValue = readRecord(request.ref, REF_KEYS);
    }
    catch {
        return invalid();
    }
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.raw !== "string" ||
        request.raw.length > MAX_BYTES ||
        refValue.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        refValue.kind !== "course_unlock_state" ||
        typeof refValue.blobFingerprint !== "string" ||
        !HASH.test(refValue.blobFingerprint) ||
        refValue.blobKey !== blobKey(request.accountScopeHash, refValue.blobFingerprint)) {
        return invalid();
    }
    let detachedEnvelope;
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MAX_BYTES ||
            (0, decision_registry_1.sha256Utf8)(request.raw) !== refValue.blobFingerprint) {
            return invalid();
        }
        const parsed = JSON.parse(request.raw);
        detachedEnvelope = (0, wallet_1.detachBoundedWalletJson)(parsed, "owner_repository_course_blob_invalid");
        if ((0, decision_registry_1.canonicalJsonV1)(detachedEnvelope) !== request.raw)
            return invalid();
    }
    catch {
        return invalid();
    }
    if (!isRecord(detachedEnvelope) ||
        Reflect.ownKeys(detachedEnvelope).length !== ENVELOPE_KEYS.length ||
        !Reflect.ownKeys(detachedEnvelope).every((key) => typeof key === "string" &&
            ENVELOPE_KEYS.includes(key)) ||
        detachedEnvelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        detachedEnvelope.accountScopeHash !== request.accountScopeHash ||
        detachedEnvelope.kind !== "course_unlock_state") {
        return invalid();
    }
    let rebuilt;
    try {
        rebuilt = (0, exports.materializeOwnerRepositoryCourseUnlockStateBlob)(detachedEnvelope.payload);
    }
    catch {
        return invalid();
    }
    if (rebuilt.blob.encoded !== request.raw ||
        rebuilt.blob.ref.blobFingerprint !== refValue.blobFingerprint ||
        rebuilt.blob.ref.blobKey !== refValue.blobKey) {
        return invalid();
    }
    return rebuilt;
};
exports.parseOwnerRepositoryCourseUnlockStateBlob = parseOwnerRepositoryCourseUnlockStateBlob;
//# sourceMappingURL=owner_repository_course_blob.js.map