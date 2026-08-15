"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateVerifiedGenesisOwnerRepositoryRootV1 = exports.advanceOwnerRepositoryRootV2Generation = exports.createGenesisOwnerRepositoryRootV2 = exports.parseOwnerRepositoryRootV2Raw = exports.parseOwnerRepositoryRootV2 = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_course_manifest_1 = require("./owner_repository_course_manifest");
const ROOT_MAX_BYTES = 64 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const ROOT_KEYS = [
    "schemaVersion", "accountScopeHash", "currentGeneration", "repositoryRevision",
    "journalSequence", "previousRootFingerprint", "journalHeadRef", "walletStateRef",
    "courseStateManifestRef", "operationIndexManifestRef", "subjectIndexManifestRef",
    "receiptIndexManifestRef", "rootFingerprint",
];
const V1_KEYS = [
    "schemaVersion", "accountScopeHash", "currentGeneration", "repositoryRevision",
    "journalSequence", "previousRootFingerprint", "journalHeadRef", "walletStateRef",
    "courseStateRefs", "operationIndexManifestRef", "subjectIndexManifestRef",
    "receiptIndexManifestRef", "rootFingerprint",
];
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => {
    const ownKeys = Reflect.ownKeys(value);
    return ownKeys.length === keys.length && ownKeys.every((key) => typeof key === "string" && keys.includes(key));
};
const readRecord = (input, requiredKeys) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== requiredKeys.length ||
        keys.some((key) => typeof key !== "string" || !requiredKeys.includes(key)) ||
        requiredKeys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        }))
        return invalid();
    const result = Object.create(null);
    for (const key of requiredKeys)
        result[key] = descriptors[key].value;
    return result;
};
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const invalid = () => { throw new Error("owner_repository_root_v2_invalid"); };
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseRef = (input, accountScopeHash, expectedKind) => {
    if (!isRecord(input) || !exactKeys(input, REF_KEYS) ||
        input.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" || input.kind !== expectedKind ||
        typeof input.blobFingerprint !== "string" || !HASH.test(input.blobFingerprint) ||
        input.blobKey !== blobKey(accountScopeHash, input.blobFingerprint))
        return invalid();
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
        kind: expectedKind,
        blobKey: input.blobKey,
        blobFingerprint: input.blobFingerprint,
    });
};
const materialize = (body) => {
    const root = deepFreeze({ ...body, rootFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)) });
    const encoded = (0, decision_registry_1.canonicalJsonV1)(root);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > ROOT_MAX_BYTES)
        throw new Error("owner_repository_root_v2_overflow");
    return deepFreeze({ root, encoded });
};
const parseOwnerRepositoryRootV2 = (input, expectedAccountScopeHash) => {
    if (typeof expectedAccountScopeHash !== "string" || !ACCOUNT.test(expectedAccountScopeHash))
        return invalid();
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, "owner_repository_root_v2_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || !exactKeys(detached, ROOT_KEYS) ||
        detached.schemaVersion !== "learning-v2-owner-repository-root.v2" ||
        detached.accountScopeHash !== expectedAccountScopeHash || !safe(detached.currentGeneration) ||
        !safe(detached.repositoryRevision) || !safe(detached.journalSequence) ||
        Number(detached.journalSequence) > Number(detached.repositoryRevision) ||
        (detached.previousRootFingerprint !== null &&
            (typeof detached.previousRootFingerprint !== "string" || !HASH.test(detached.previousRootFingerprint))) ||
        typeof detached.rootFingerprint !== "string" || !HASH.test(detached.rootFingerprint))
        return invalid();
    if ((Number(detached.repositoryRevision) === 0) !== (detached.previousRootFingerprint === null)) {
        return invalid();
    }
    const accountScopeHash = detached.accountScopeHash;
    const journalSequence = Number(detached.journalSequence);
    const journalHeadRef = detached.journalHeadRef === null ? null
        : parseRef(detached.journalHeadRef, accountScopeHash, "journal_record");
    if ((journalSequence === 0) !== (journalHeadRef === null))
        return invalid();
    const body = {
        schemaVersion: "learning-v2-owner-repository-root.v2",
        accountScopeHash,
        currentGeneration: Number(detached.currentGeneration),
        repositoryRevision: Number(detached.repositoryRevision),
        journalSequence,
        previousRootFingerprint: detached.previousRootFingerprint,
        journalHeadRef,
        walletStateRef: parseRef(detached.walletStateRef, accountScopeHash, "wallet_state"),
        courseStateManifestRef: parseRef(detached.courseStateManifestRef, accountScopeHash, "course_state_manifest"),
        operationIndexManifestRef: parseRef(detached.operationIndexManifestRef, accountScopeHash, "operation_index_manifest"),
        subjectIndexManifestRef: parseRef(detached.subjectIndexManifestRef, accountScopeHash, "subject_index_manifest"),
        receiptIndexManifestRef: parseRef(detached.receiptIndexManifestRef, accountScopeHash, "receipt_index_manifest"),
    };
    const refs = [body.walletStateRef, body.courseStateManifestRef, body.operationIndexManifestRef,
        body.subjectIndexManifestRef, body.receiptIndexManifestRef, ...(journalHeadRef ? [journalHeadRef] : [])];
    if (new Set(refs.map((ref) => ref.blobFingerprint)).size !== refs.length)
        return invalid();
    const rebuilt = materialize(body);
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt.root) !== (0, decision_registry_1.canonicalJsonV1)(detached))
        return invalid();
    return rebuilt;
};
exports.parseOwnerRepositoryRootV2 = parseOwnerRepositoryRootV2;
const parseOwnerRepositoryRootV2Raw = (raw, expectedAccountScopeHash) => {
    let parsed;
    try {
        if (typeof raw !== "string" || (0, decision_registry_1.utf8ByteLengthV1)(raw) > ROOT_MAX_BYTES)
            return invalid();
        parsed = JSON.parse(raw);
        if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
            return invalid();
    }
    catch {
        return invalid();
    }
    const result = (0, exports.parseOwnerRepositoryRootV2)(parsed, expectedAccountScopeHash);
    if (result.encoded !== raw)
        return invalid();
    return result;
};
exports.parseOwnerRepositoryRootV2Raw = parseOwnerRepositoryRootV2Raw;
const createGenesisOwnerRepositoryRootV2 = (input) => {
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, "owner_repository_root_v2_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || !exactKeys(detached, [
        "accountScopeHash", "currentGeneration", "walletStateRef", "courseStateManifestRef",
        "operationIndexManifestRef", "subjectIndexManifestRef", "receiptIndexManifestRef",
    ]) || typeof detached.accountScopeHash !== "string" || !ACCOUNT.test(detached.accountScopeHash) ||
        !safe(detached.currentGeneration))
        return invalid();
    const accountScopeHash = detached.accountScopeHash;
    const created = materialize({
        schemaVersion: "learning-v2-owner-repository-root.v2",
        accountScopeHash,
        currentGeneration: detached.currentGeneration,
        repositoryRevision: 0,
        journalSequence: 0,
        previousRootFingerprint: null,
        journalHeadRef: null,
        walletStateRef: parseRef(detached.walletStateRef, accountScopeHash, "wallet_state"),
        courseStateManifestRef: parseRef(detached.courseStateManifestRef, accountScopeHash, "course_state_manifest"),
        operationIndexManifestRef: parseRef(detached.operationIndexManifestRef, accountScopeHash, "operation_index_manifest"),
        subjectIndexManifestRef: parseRef(detached.subjectIndexManifestRef, accountScopeHash, "subject_index_manifest"),
        receiptIndexManifestRef: parseRef(detached.receiptIndexManifestRef, accountScopeHash, "receipt_index_manifest"),
    });
    return (0, exports.parseOwnerRepositoryRootV2)(created.root, accountScopeHash);
};
exports.createGenesisOwnerRepositoryRootV2 = createGenesisOwnerRepositoryRootV2;
const advanceOwnerRepositoryRootV2Generation = (input) => {
    let request;
    let detachedRoot;
    try {
        request = readRecord(input, ["root", "targetGeneration"]);
    }
    catch {
        return invalid();
    }
    try {
        detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.root, "owner_repository_root_v2_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string" ||
        !safe(request.targetGeneration))
        return invalid();
    const parsed = (0, exports.parseOwnerRepositoryRootV2)(detachedRoot, detachedRoot.accountScopeHash).root;
    if (Number(request.targetGeneration) <= parsed.currentGeneration ||
        parsed.repositoryRevision === Number.MAX_SAFE_INTEGER)
        return invalid();
    const { rootFingerprint, ...body } = parsed;
    const advanced = materialize({
        ...body,
        currentGeneration: request.targetGeneration,
        repositoryRevision: parsed.repositoryRevision + 1,
        previousRootFingerprint: rootFingerprint,
    });
    return (0, exports.parseOwnerRepositoryRootV2)(advanced.root, parsed.accountScopeHash);
};
exports.advanceOwnerRepositoryRootV2Generation = advanceOwnerRepositoryRootV2Generation;
const migrateVerifiedGenesisOwnerRepositoryRootV1 = async (input) => {
    let request;
    let rootV1;
    let manifestBlob;
    try {
        request = readRecord(input, [
            "rootV1", "targetGeneration", "emptyCourseStateManifestBlob", "resolveCourseNode",
        ]);
        rootV1 = (0, wallet_1.detachBoundedWalletJson)(request.rootV1, "owner_repository_root_v2_invalid");
        manifestBlob = readRecord(request.emptyCourseStateManifestBlob, ["ref", "encoded"]);
    }
    catch {
        return invalid();
    }
    if (!isRecord(rootV1) || !exactKeys(rootV1, V1_KEYS) ||
        rootV1.schemaVersion !== "learning-v2-owner-repository-root.v1" ||
        typeof rootV1.accountScopeHash !== "string" || !ACCOUNT.test(rootV1.accountScopeHash) ||
        !safe(rootV1.currentGeneration) || rootV1.repositoryRevision !== 0 ||
        rootV1.previousRootFingerprint !== null || rootV1.journalSequence !== 0 ||
        rootV1.journalHeadRef !== null || !Array.isArray(rootV1.courseStateRefs) ||
        rootV1.courseStateRefs.length !== 0 ||
        typeof rootV1.rootFingerprint !== "string" || !HASH.test(rootV1.rootFingerprint) ||
        !safe(request.targetGeneration) ||
        Number(request.targetGeneration) < Number(rootV1.currentGeneration) ||
        typeof request.resolveCourseNode !== "function" || typeof manifestBlob.encoded !== "string") {
        return invalid();
    }
    const accountScopeHash = rootV1.accountScopeHash;
    const rootV1Body = { ...rootV1 };
    delete rootV1Body.rootFingerprint;
    if ((0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(rootV1Body)) !== rootV1.rootFingerprint)
        return invalid();
    let parsedCourseManifest;
    try {
        parsedCourseManifest = await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
            accountScopeHash,
            ref: manifestBlob.ref,
            raw: manifestBlob.encoded,
            resolveNode: request.resolveCourseNode,
        });
    }
    catch {
        return invalid();
    }
    if (parsedCourseManifest.manifest.entryCount !== 0 ||
        parsedCourseManifest.manifest.rootNodeRef !== null)
        return invalid();
    const migrated = materialize({
        schemaVersion: "learning-v2-owner-repository-root.v2",
        accountScopeHash,
        currentGeneration: request.targetGeneration,
        repositoryRevision: 1,
        journalSequence: 0,
        previousRootFingerprint: rootV1.rootFingerprint,
        journalHeadRef: null,
        walletStateRef: parseRef(rootV1.walletStateRef, accountScopeHash, "wallet_state"),
        courseStateManifestRef: parseRef(parsedCourseManifest.manifestBlob.ref, accountScopeHash, "course_state_manifest"),
        operationIndexManifestRef: parseRef(rootV1.operationIndexManifestRef, accountScopeHash, "operation_index_manifest"),
        subjectIndexManifestRef: parseRef(rootV1.subjectIndexManifestRef, accountScopeHash, "subject_index_manifest"),
        receiptIndexManifestRef: parseRef(rootV1.receiptIndexManifestRef, accountScopeHash, "receipt_index_manifest"),
    });
    return (0, exports.parseOwnerRepositoryRootV2)(migrated.root, accountScopeHash);
};
exports.migrateVerifiedGenesisOwnerRepositoryRootV1 = migrateVerifiedGenesisOwnerRepositoryRootV1;
//# sourceMappingURL=owner_repository_root_v2.js.map