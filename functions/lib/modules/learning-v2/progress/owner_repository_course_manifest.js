"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planOwnerRepositoryCourseStateMutation = exports.lookupOwnerRepositoryCourseState = exports.parseOwnerRepositoryCourseManifestBlob = exports.createEmptyOwnerRepositoryCourseManifest = exports.parseOwnerRepositoryCourseStateEntry = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const wallet_1 = require("../contracts/wallet");
const owner_repository_radix_1 = require("./owner_repository_radix");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MANIFEST_MAX_BYTES = 64 * 1024;
const ENTRY_KEYS = ["schemaVersion", "courseIdentityFingerprint", "stateRef"];
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => {
    const ownKeys = Reflect.ownKeys(value);
    return ownKeys.length === keys.length && ownKeys.every((key) => typeof key === "string" && keys.includes(key));
};
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const invalid = () => { throw new Error("owner_course_manifest_invalid"); };
const readRecord = (input, requiredKeys, optionalKeys = []) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") ||
        requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
        keys.some((key) => typeof key !== "string" ||
            (!requiredKeys.includes(key) && !optionalKeys.includes(key))))
        return invalid();
    const result = Object.create(null);
    for (const key of keys) {
        const descriptor = descriptors[key];
        if (!("value" in descriptor) || !descriptor.enumerable)
            return invalid();
        result[key] = descriptor.value;
    }
    return result;
};
const parseOwnerRepositoryCourseStateEntry = (input, accountScopeHash) => {
    if (typeof accountScopeHash !== "string")
        return invalid();
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, "owner_course_manifest_invalid");
    }
    catch {
        return invalid();
    }
    if (!ACCOUNT.test(accountScopeHash) || !isRecord(detached) || !exactKeys(detached, ENTRY_KEYS) ||
        detached.schemaVersion !== "learning-v2-owner-repository-course-entry.v1" ||
        typeof detached.courseIdentityFingerprint !== "string" || !HASH.test(detached.courseIdentityFingerprint) ||
        !isRecord(detached.stateRef) || !exactKeys(detached.stateRef, REF_KEYS) ||
        detached.stateRef.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        detached.stateRef.kind !== "course_unlock_state" ||
        typeof detached.stateRef.blobFingerprint !== "string" || !HASH.test(detached.stateRef.blobFingerprint) ||
        detached.stateRef.blobKey !== blobKey(accountScopeHash, detached.stateRef.blobFingerprint))
        return invalid();
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-course-entry.v1",
        courseIdentityFingerprint: detached.courseIdentityFingerprint,
        stateRef: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "course_unlock_state",
            blobKey: detached.stateRef.blobKey,
            blobFingerprint: detached.stateRef.blobFingerprint,
        },
    });
};
exports.parseOwnerRepositoryCourseStateEntry = parseOwnerRepositoryCourseStateEntry;
const legacyEmptyManifest = () => ({
    schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
    indexKind: "course_state",
    shardBits: 8,
    shards: [],
});
const materializeManifestBlob = (accountScopeHash, manifest) => {
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash,
        kind: "course_state_manifest",
        payload: manifest,
    };
    const encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MANIFEST_MAX_BYTES)
        throw new Error("owner_course_manifest_overflow");
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        encoded,
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "course_state_manifest",
            blobKey: blobKey(accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
    });
};
const normalizeManifest = async (input) => {
    const hasReadBudget = Object.prototype.hasOwnProperty.call(input, "readBudget");
    return (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
        accountScopeHash: input.accountScopeHash,
        indexKind: "course_state",
        manifest: input.manifest,
        mutations: [],
        resolveNode: input.resolveNode,
        ...(hasReadBudget ? { readBudget: input.readBudget } : {}),
    });
};
const createEmptyOwnerRepositoryCourseManifest = async (accountScopeHash) => {
    if (typeof accountScopeHash !== "string" || !ACCOUNT.test(accountScopeHash))
        return invalid();
    const plan = await normalizeManifest({
        accountScopeHash,
        manifest: legacyEmptyManifest(),
        resolveNode: () => null,
    });
    const manifest = plan.manifest;
    return deepFreeze({
        manifest,
        manifestBlob: materializeManifestBlob(accountScopeHash, manifest),
        immutableNodeBlobs: plan.immutableBlobs,
        changed: true,
    });
};
exports.createEmptyOwnerRepositoryCourseManifest = createEmptyOwnerRepositoryCourseManifest;
const parseOwnerRepositoryCourseManifestBlob = async (input) => {
    const request = readRecord(input, ["accountScopeHash", "ref", "raw", "resolveNode"], ["readBudget"]);
    let parsedRef;
    try {
        const ref = readRecord(request.ref, REF_KEYS);
        if (ref.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
            ref.kind !== "course_state_manifest" ||
            typeof ref.blobFingerprint !== "string" || !HASH.test(ref.blobFingerprint) ||
            typeof request.accountScopeHash !== "string" ||
            ref.blobKey !== blobKey(request.accountScopeHash, ref.blobFingerprint)) {
            throw new Error("invalid_ref");
        }
        parsedRef = deepFreeze({
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "course_state_manifest",
            blobKey: ref.blobKey,
            blobFingerprint: ref.blobFingerprint,
        });
    }
    catch {
        throw new Error("owner_course_manifest_indeterminate");
    }
    if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.raw !== "string" || typeof request.resolveNode !== "function") {
        throw new Error("owner_course_manifest_indeterminate");
    }
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MANIFEST_MAX_BYTES ||
            (0, decision_registry_1.sha256Utf8)(request.raw) !== parsedRef.blobFingerprint) {
            throw new Error("invalid_raw");
        }
    }
    catch {
        throw new Error("owner_course_manifest_indeterminate");
    }
    let envelope;
    try {
        envelope = JSON.parse(request.raw);
        if ((0, decision_registry_1.canonicalJsonV1)(envelope) !== request.raw)
            throw new Error("noncanonical");
    }
    catch {
        throw new Error("owner_course_manifest_indeterminate");
    }
    if (!isRecord(envelope) || !exactKeys(envelope, ["schemaVersion", "accountScopeHash", "kind", "payload"]) ||
        envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        envelope.accountScopeHash !== request.accountScopeHash || envelope.kind !== "course_state_manifest") {
        throw new Error("owner_course_manifest_indeterminate");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    let normalized;
    try {
        normalized = await normalizeManifest({
            accountScopeHash: request.accountScopeHash,
            manifest: envelope.payload,
            resolveNode: request.resolveNode,
            ...(hasReadBudget ? { readBudget: request.readBudget } : {}),
        });
    }
    catch {
        throw new Error("owner_course_manifest_indeterminate");
    }
    if (normalized.changed || (0, decision_registry_1.canonicalJsonV1)(normalized.manifest) !== (0, decision_registry_1.canonicalJsonV1)(envelope.payload)) {
        throw new Error("owner_course_manifest_indeterminate");
    }
    const manifest = normalized.manifest;
    return deepFreeze({
        manifest,
        manifestBlob: { ref: parsedRef, encoded: request.raw },
    });
};
exports.parseOwnerRepositoryCourseManifestBlob = parseOwnerRepositoryCourseManifestBlob;
const lookupOwnerRepositoryCourseState = async (input) => {
    const request = readRecord(input, ["accountScopeHash", "manifest", "courseIdentityFingerprint", "resolveNode"], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.courseIdentityFingerprint !== "string" || !HASH.test(request.courseIdentityFingerprint) ||
        typeof request.resolveNode !== "function")
        return invalid();
    const accountScopeHash = request.accountScopeHash;
    const courseIdentityFingerprint = request.courseIdentityFingerprint;
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    let found;
    try {
        found = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash,
            indexKind: "course_state",
            manifest: request.manifest,
            keyKind: "course_identity",
            logicalKey: courseIdentityFingerprint,
            resolveNode: request.resolveNode,
            ...(hasReadBudget ? { readBudget: request.readBudget } : {}),
        });
    }
    catch {
        throw new Error("owner_course_manifest_indeterminate");
    }
    if (!found)
        return undefined;
    try {
        return (0, exports.parseOwnerRepositoryCourseStateEntry)(found.value, accountScopeHash);
    }
    catch {
        throw new Error("owner_course_manifest_indeterminate");
    }
};
exports.lookupOwnerRepositoryCourseState = lookupOwnerRepositoryCourseState;
const planOwnerRepositoryCourseStateMutation = async (input) => {
    const request = readRecord(input, ["accountScopeHash", "manifest", "expectedEntry", "nextEntry", "resolveNode"], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function")
        return invalid();
    const accountScopeHash = request.accountScopeHash;
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const nextEntry = (0, exports.parseOwnerRepositoryCourseStateEntry)(request.nextEntry, accountScopeHash);
    const expectedEntry = request.expectedEntry === null ? null
        : (0, exports.parseOwnerRepositoryCourseStateEntry)(request.expectedEntry, accountScopeHash);
    if (expectedEntry && expectedEntry.courseIdentityFingerprint !== nextEntry.courseIdentityFingerprint)
        return invalid();
    const expectedValueFingerprint = expectedEntry === null
        ? null
        : (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(expectedEntry));
    let plan;
    try {
        plan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash,
            indexKind: "course_state",
            manifest: request.manifest,
            mutations: [{
                    keyKind: "course_identity",
                    logicalKey: nextEntry.courseIdentityFingerprint,
                    value: nextEntry,
                    expectedValueFingerprint,
                }],
            resolveNode: request.resolveNode,
            ...(hasReadBudget ? { readBudget: request.readBudget } : {}),
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "owner_index_expected_conflict") {
            throw new Error("owner_course_manifest_expected_conflict");
        }
        throw new Error("owner_course_manifest_indeterminate");
    }
    const manifest = plan.manifest;
    return deepFreeze({
        manifest,
        manifestBlob: materializeManifestBlob(accountScopeHash, manifest),
        immutableNodeBlobs: plan.immutableBlobs,
        changed: plan.changed,
    });
};
exports.planOwnerRepositoryCourseStateMutation = planOwnerRepositoryCourseStateMutation;
//# sourceMappingURL=owner_repository_course_manifest.js.map