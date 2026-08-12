"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceOwnerRepositoryRootV3Generation = exports.advanceOwnerRepositoryRootV3GenerationFromV2 = exports.bindOwnerRepositoryMissingIndexRepairSuccessorRootV3 = exports.bindOwnerRepositoryMissingIndexRepairSuccessorRootV3FromV2 = exports.bindOwnerRepositoryOperationAliasSuccessorRootV3 = exports.bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2 = exports.bindOwnerRepositoryOperationAliasV2SuccessorRootV3 = exports.bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3 = exports.bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2 = exports.bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3 = exports.bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2 = exports.bindOwnerRepositoryWalletCreditSuccessorRootV3 = exports.bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2 = exports.createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1 = exports.createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration = exports.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2 = exports.parseOwnerRepositoryRootV3Raw = exports.parseOwnerRepositoryRootV3 = exports.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate = exports.materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate = exports.materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_root_fold_1 = require("./owner_repository_root_fold");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_wallet_checkpoint_1 = require("./owner_repository_wallet_checkpoint");
const owner_repository_economic_effect_v2_1 = require("./owner_repository_economic_effect_v2");
const owner_repository_course_unlock_effect_v2_1 = require("./owner_repository_course_unlock_effect_v2");
const ROOT_MAX_BYTES = 64 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const ROOT_KEYS = [
    "schemaVersion", "accountScopeHash", "currentGeneration", "repositoryRevision",
    "journalSequence", "previousRootFingerprint", "journalHeadRef", "walletStateRef",
    "courseStateManifestRef", "operationIndexManifestRef", "subjectIndexManifestRef",
    "receiptIndexManifestRef", "walletCheckpointAnchor", "walletCheckpointLagRootTransitions",
    "walletCheckpointPromotionRequired", "rootFingerprint",
];
const ANCHOR_KEYS = [
    "schemaVersion", "checkpointSchemaVersion", "checkpointKind", "accountScopeHash",
    "checkpointKey", "checkpointRootFingerprint", "checkpointFingerprint",
    "checkpointCurrentGeneration", "checkpointRepositoryRevision", "checkpointJournalSequence",
    "bootstrapOrigin",
];
const ANCHOR_CANDIDATES = new WeakSet();
const ADOPTION_BASES = new WeakSet();
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => { throw new Error("owner_repository_root_v3_invalid"); };
const mismatch = () => { throw new Error("owner_repository_root_v3_mismatch"); };
const overflow = () => { throw new Error("owner_repository_root_v3_overflow"); };
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const readRecord = (input, keys) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
        const descriptor = descriptors[key];
        return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    }))
        return invalid();
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const checkpointKey = (accountScopeHash, rootFingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${rootFingerprint}`;
const parseRootV2Materialization = (input) => {
    const request = readRecord(input, ["root", "encoded"]);
    if (typeof request.encoded !== "string")
        return invalid();
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.root, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string")
        return invalid();
    let parsed;
    try {
        parsed = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(detached, detached.accountScopeHash);
    }
    catch {
        return invalid();
    }
    if (parsed.encoded !== request.encoded)
        return invalid();
    return parsed;
};
const parseAnchor = (input, expectedAccountScopeHash) => {
    const value = readRecord(input, ANCHOR_KEYS);
    if (value.schemaVersion !== "learning-v2-owner-repository-wallet-checkpoint-anchor.v1" ||
        (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" &&
            value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v2" &&
            value.checkpointSchemaVersion !== "learning-v2-owner-repository-economic-checkpoint.v3") ||
        (value.checkpointKind !== "wallet_credit_only" &&
            value.checkpointKind !== "economic_mixed") ||
        (value.checkpointSchemaVersion === "learning-v2-owner-repository-economic-checkpoint.v3"
            ? value.checkpointKind !== "economic_mixed"
            : value.checkpointKind !== "wallet_credit_only") ||
        typeof value.accountScopeHash !== "string" ||
        !ACCOUNT.test(value.accountScopeHash) ||
        (expectedAccountScopeHash !== undefined && value.accountScopeHash !== expectedAccountScopeHash) ||
        typeof value.checkpointRootFingerprint !== "string" || !HASH.test(value.checkpointRootFingerprint) ||
        typeof value.checkpointFingerprint !== "string" || !HASH.test(value.checkpointFingerprint) ||
        value.checkpointKey !== checkpointKey(value.accountScopeHash, value.checkpointRootFingerprint) ||
        !safe(value.checkpointCurrentGeneration) || !safe(value.checkpointRepositoryRevision) ||
        !safe(value.checkpointJournalSequence) ||
        ![null, "fresh_v2_genesis", "verified_v1_genesis_migration"].includes(value.bootstrapOrigin))
        return invalid();
    if (value.bootstrapOrigin === "fresh_v2_genesis" &&
        (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" ||
            value.checkpointJournalSequence !== 0 || value.checkpointRepositoryRevision !== 0)) {
        return invalid();
    }
    if (value.bootstrapOrigin === "verified_v1_genesis_migration" &&
        (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" ||
            value.checkpointJournalSequence !== 0 || value.checkpointRepositoryRevision !== 1)) {
        return invalid();
    }
    if (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" &&
        value.bootstrapOrigin !== null)
        return invalid();
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
        checkpointSchemaVersion: value.checkpointSchemaVersion,
        checkpointKind: value.checkpointKind,
        accountScopeHash: value.accountScopeHash,
        checkpointKey: value.checkpointKey,
        checkpointRootFingerprint: value.checkpointRootFingerprint,
        checkpointFingerprint: value.checkpointFingerprint,
        checkpointCurrentGeneration: Number(value.checkpointCurrentGeneration),
        checkpointRepositoryRevision: Number(value.checkpointRepositoryRevision),
        checkpointJournalSequence: Number(value.checkpointJournalSequence),
        bootstrapOrigin: value.bootstrapOrigin,
    });
};
const brandAnchorCandidate = (anchor, source) => {
    const candidate = deepFreeze({ anchor, source, authority: "structural_candidate" });
    ANCHOR_CANDIDATES.add(candidate);
    return candidate;
};
/**
 * Structural V2-checkpoint identity only. The Checkpoint V2 codec and repository window
 * verifier must validate the exact stored bytes before this candidate can reach CAS.
 */
const materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate = (input) => {
    const anchor = parseAnchor(input);
    if (anchor.checkpointSchemaVersion !==
        "learning-v2-owner-repository-wallet-checkpoint.v2" || anchor.bootstrapOrigin !== null) {
        return invalid();
    }
    return brandAnchorCandidate(anchor, "checkpoint_v2_structural_candidate");
};
exports.materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate = materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate;
/**
 * Structural V3 economic-checkpoint identity only. Exact checkpoint bytes,
 * projections and bounded history must be verified before repository admission.
 */
const materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate = (input) => {
    const anchor = parseAnchor(input);
    if (anchor.checkpointSchemaVersion !==
        "learning-v2-owner-repository-economic-checkpoint.v3" ||
        anchor.checkpointKind !== "economic_mixed" ||
        anchor.bootstrapOrigin !== null)
        return invalid();
    return brandAnchorCandidate(anchor, "checkpoint_v3_structural_candidate");
};
exports.materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate = materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate;
/**
 * Derives a structural anchor from exact Checkpoint V1 bytes parsed by the closed V1 codec.
 * This proves codec identity, not durable storage/current-root ancestry.
 */
const parseOwnerRepositoryWalletCheckpointV1AnchorCandidate = (input) => {
    const request = readRecord(input, ["checkpoint", "checkpointRoot", "walletStateBlob"]);
    const supplied = readRecord(request.checkpoint, ["checkpoint", "key", "encoded"]);
    let detachedCheckpoint;
    try {
        detachedCheckpoint = (0, wallet_1.detachBoundedWalletJson)(supplied.checkpoint, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detachedCheckpoint) ||
        typeof detachedCheckpoint.accountScopeHash !== "string")
        return invalid();
    let parsed;
    try {
        parsed = (0, owner_repository_wallet_checkpoint_1.parseOwnerRepositoryWalletCheckpoint)({
            accountScopeHash: detachedCheckpoint.accountScopeHash,
            checkpointRoot: request.checkpointRoot,
            key: supplied.key,
            raw: supplied.encoded,
            walletStateBlob: request.walletStateBlob,
        });
    }
    catch {
        return invalid();
    }
    const checkpoint = parsed.checkpoint;
    return brandAnchorCandidate(parseAnchor({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
        checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
        checkpointKind: "wallet_credit_only",
        accountScopeHash: checkpoint.accountScopeHash,
        checkpointKey: parsed.key,
        checkpointRootFingerprint: checkpoint.checkpointRootFingerprint,
        checkpointFingerprint: checkpoint.checkpointFingerprint,
        checkpointCurrentGeneration: checkpoint.currentGeneration,
        checkpointRepositoryRevision: checkpoint.repositoryRevision,
        checkpointJournalSequence: checkpoint.journalSequence,
        bootstrapOrigin: checkpoint.bootstrapOrigin,
    }), "checkpoint_v1_codec");
};
exports.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate;
const materialize = (body) => {
    const root = deepFreeze({ ...body, rootFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)) });
    const encoded = (0, decision_registry_1.canonicalJsonV1)(root);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > ROOT_MAX_BYTES)
        return overflow();
    return deepFreeze({ root, encoded, authority: "structural_candidate" });
};
const validateCommonWithV2 = (value, accountScopeHash) => {
    const body = {
        schemaVersion: "learning-v2-owner-repository-root.v2",
        accountScopeHash,
        currentGeneration: value.currentGeneration,
        repositoryRevision: value.repositoryRevision,
        journalSequence: value.journalSequence,
        previousRootFingerprint: value.previousRootFingerprint,
        journalHeadRef: value.journalHeadRef,
        walletStateRef: value.walletStateRef,
        courseStateManifestRef: value.courseStateManifestRef,
        operationIndexManifestRef: value.operationIndexManifestRef,
        subjectIndexManifestRef: value.subjectIndexManifestRef,
        receiptIndexManifestRef: value.receiptIndexManifestRef,
    };
    const candidate = { ...body, rootFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)) };
    return (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(candidate, accountScopeHash).root;
};
const parseOwnerRepositoryRootV3 = (input, expectedAccountScopeHash) => {
    if (typeof expectedAccountScopeHash !== "string" || !ACCOUNT.test(expectedAccountScopeHash)) {
        return invalid();
    }
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || Reflect.ownKeys(detached).length !== ROOT_KEYS.length ||
        !Reflect.ownKeys(detached).every((key) => typeof key === "string" &&
            ROOT_KEYS.includes(key)) ||
        detached.schemaVersion !== "learning-v2-owner-repository-root.v3" ||
        detached.accountScopeHash !== expectedAccountScopeHash ||
        typeof detached.previousRootFingerprint !== "string" ||
        !HASH.test(detached.previousRootFingerprint) ||
        typeof detached.rootFingerprint !== "string" || !HASH.test(detached.rootFingerprint) ||
        !safe(detached.walletCheckpointLagRootTransitions) ||
        typeof detached.walletCheckpointPromotionRequired !== "boolean")
        return invalid();
    let common;
    let anchor;
    try {
        common = validateCommonWithV2(detached, expectedAccountScopeHash);
        anchor = parseAnchor(detached.walletCheckpointAnchor, expectedAccountScopeHash);
    }
    catch {
        return invalid();
    }
    const revisionDelta = common.repositoryRevision - anchor.checkpointRepositoryRevision;
    const sequenceDelta = common.journalSequence - anchor.checkpointJournalSequence;
    const nonWalletTransitions = revisionDelta - sequenceDelta;
    if (anchor.checkpointRootFingerprint === detached.rootFingerprint ||
        anchor.checkpointCurrentGeneration > common.currentGeneration || revisionDelta < 1 ||
        revisionDelta > 16 || sequenceDelta < 0 || sequenceDelta > revisionDelta ||
        nonWalletTransitions < 0 || nonWalletTransitions > 1 ||
        (nonWalletTransitions === 0) !==
            (anchor.checkpointCurrentGeneration === common.currentGeneration) ||
        detached.walletCheckpointLagRootTransitions !== revisionDelta ||
        detached.walletCheckpointPromotionRequired !==
            (revisionDelta === 16 || nonWalletTransitions === 1))
        return invalid();
    const body = {
        schemaVersion: "learning-v2-owner-repository-root.v3",
        accountScopeHash: common.accountScopeHash,
        currentGeneration: common.currentGeneration,
        repositoryRevision: common.repositoryRevision,
        journalSequence: common.journalSequence,
        previousRootFingerprint: common.previousRootFingerprint,
        journalHeadRef: common.journalHeadRef,
        walletStateRef: common.walletStateRef,
        courseStateManifestRef: common.courseStateManifestRef,
        operationIndexManifestRef: common.operationIndexManifestRef,
        subjectIndexManifestRef: common.subjectIndexManifestRef,
        receiptIndexManifestRef: common.receiptIndexManifestRef,
        walletCheckpointAnchor: anchor,
        walletCheckpointLagRootTransitions: revisionDelta,
        walletCheckpointPromotionRequired: detached.walletCheckpointPromotionRequired,
    };
    const rebuilt = materialize(body);
    if (!same(rebuilt.root, detached))
        return invalid();
    return rebuilt;
};
exports.parseOwnerRepositoryRootV3 = parseOwnerRepositoryRootV3;
const parseOwnerRepositoryRootV3Raw = (raw, expectedAccountScopeHash) => {
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
    const result = (0, exports.parseOwnerRepositoryRootV3)(parsed, expectedAccountScopeHash);
    if (result.encoded !== raw)
        return invalid();
    return result;
};
exports.parseOwnerRepositoryRootV3Raw = parseOwnerRepositoryRootV3Raw;
const assertAnchorMatchesRoot = (candidate, root) => {
    if (!ANCHOR_CANDIDATES.has(candidate))
        return invalid();
    const anchor = candidate.anchor;
    if (anchor.accountScopeHash !== root.accountScopeHash ||
        anchor.checkpointRootFingerprint !== root.rootFingerprint ||
        anchor.checkpointCurrentGeneration !== root.currentGeneration ||
        anchor.checkpointRepositoryRevision !== root.repositoryRevision ||
        anchor.checkpointJournalSequence !== root.journalSequence)
        return mismatch();
    return anchor;
};
const adoptionBase = (rootBefore, candidate) => {
    const value = deepFreeze({
        rootBefore,
        anchorCandidate: candidate,
        authority: "structural_candidate",
    });
    ADOPTION_BASES.add(value);
    return value;
};
const createOwnerRepositoryRootV3AdoptionBaseFromFreshV2 = (input) => {
    const request = readRecord(input, ["rootBefore", "checkpointAnchorCandidate"]);
    const rootBefore = parseRootV2Materialization(request.rootBefore);
    if (!isRecord(request.checkpointAnchorCandidate) ||
        !ANCHOR_CANDIDATES.has(request.checkpointAnchorCandidate) ||
        rootBefore.root.repositoryRevision !== 0 || rootBefore.root.journalSequence !== 0 ||
        rootBefore.root.previousRootFingerprint !== null || rootBefore.root.journalHeadRef !== null) {
        return invalid();
    }
    const candidate = request.checkpointAnchorCandidate;
    const anchor = assertAnchorMatchesRoot(candidate, rootBefore.root);
    if (candidate.source !== "checkpoint_v1_codec" ||
        anchor.bootstrapOrigin !== "fresh_v2_genesis")
        return invalid();
    return adoptionBase(rootBefore, candidate);
};
exports.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2 = createOwnerRepositoryRootV3AdoptionBaseFromFreshV2;
const createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration = async (input) => {
    const request = readRecord(input, [
        "rootV1", "targetGeneration", "emptyCourseStateManifestBlob", "resolveCourseNode",
        "migratedRoot", "checkpointAnchorCandidate",
    ]);
    if (typeof request.resolveCourseNode !== "function" ||
        !isRecord(request.checkpointAnchorCandidate) ||
        !ANCHOR_CANDIDATES.has(request.checkpointAnchorCandidate))
        return invalid();
    const migratedRoot = parseRootV2Materialization(request.migratedRoot);
    let expected;
    try {
        expected = await (0, owner_repository_root_v2_1.migrateVerifiedGenesisOwnerRepositoryRootV1)({
            rootV1: request.rootV1,
            targetGeneration: request.targetGeneration,
            emptyCourseStateManifestBlob: request.emptyCourseStateManifestBlob,
            resolveCourseNode: request.resolveCourseNode,
        });
    }
    catch {
        return invalid();
    }
    if (!same(expected, migratedRoot))
        return mismatch();
    const candidate = request.checkpointAnchorCandidate;
    const anchor = assertAnchorMatchesRoot(candidate, migratedRoot.root);
    if (candidate.source !== "checkpoint_v1_codec" ||
        anchor.bootstrapOrigin !== "verified_v1_genesis_migration")
        return invalid();
    return adoptionBase(migratedRoot, candidate);
};
exports.createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration = createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration;
const createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1 = (input) => {
    const request = readRecord(input, [
        "rootBefore", "parentRoot", "parentJournalRecordBlob", "checkpointAnchorCandidate",
    ]);
    const rootBefore = parseRootV2Materialization(request.rootBefore);
    const parentRoot = parseRootV2Materialization(request.parentRoot);
    if (!isRecord(request.checkpointAnchorCandidate) ||
        !ANCHOR_CANDIDATES.has(request.checkpointAnchorCandidate) ||
        rootBefore.root.journalSequence !== 1 || parentRoot.root.journalSequence !== 0 ||
        rootBefore.root.previousRootFingerprint !== parentRoot.root.rootFingerprint ||
        rootBefore.root.repositoryRevision !== parentRoot.root.repositoryRevision + 1 ||
        rootBefore.root.currentGeneration !== parentRoot.root.currentGeneration)
        return invalid();
    let rebuilt;
    try {
        rebuilt = (0, owner_repository_root_fold_1.bindOwnerRepositoryWalletCreditSuccessorRootV2)({
            rootBefore: parentRoot.root,
            journalRecordBlob: request.parentJournalRecordBlob,
        });
    }
    catch {
        return invalid();
    }
    if (!same(rebuilt, rootBefore))
        return mismatch();
    const candidate = request.checkpointAnchorCandidate;
    if (candidate.source !== "checkpoint_v1_codec")
        return invalid();
    assertAnchorMatchesRoot(candidate, parentRoot.root);
    return adoptionBase(rootBefore, candidate);
};
exports.createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1 = createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1;
const parseWalletRecord = (root, input) => {
    const supplied = readRecord(input, ["ref", "encoded"]);
    let parsed;
    try {
        parsed = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: supplied.ref,
            raw: supplied.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (parsed.record.recordKind !== "wallet_credit")
        return invalid();
    const record = parsed.record;
    if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
        root.journalSequence === Number.MAX_SAFE_INTEGER ||
        record.accountScopeHash !== root.accountScopeHash ||
        record.acceptedAccountGeneration !== root.currentGeneration ||
        record.repositoryRevisionBefore !== root.repositoryRevision ||
        record.rootBeforeFingerprint !== root.rootFingerprint ||
        record.journalSequence !== root.journalSequence + 1 ||
        !same(record.previousJournalRecordRef, root.journalHeadRef) ||
        !same(record.walletStateBeforeRef, root.walletStateRef) ||
        !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef) ||
        !same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
        !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef))
        return mismatch();
    return { record, blob: parsed.blob };
};
const anchorForV3Successor = (root, promoted) => {
    if (root.walletCheckpointPromotionRequired) {
        if (!isRecord(promoted) || !ANCHOR_CANDIDATES.has(promoted))
            return invalid();
        const candidate = promoted;
        if (candidate.source !== "checkpoint_v2_structural_candidate" &&
            candidate.source !== "checkpoint_v3_structural_candidate")
            return invalid();
        return assertAnchorMatchesRoot(candidate, root);
    }
    if (promoted !== null)
        return invalid();
    return root.walletCheckpointAnchor;
};
const walletSuccessorBody = (root, anchor, record, journalBlob) => ({
    schemaVersion: "learning-v2-owner-repository-root.v3",
    accountScopeHash: root.accountScopeHash,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: record.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: journalBlob.ref,
    walletStateRef: record.walletStateAfterRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef: record.operationIndexManifestAfterRef,
    subjectIndexManifestRef: record.subjectIndexManifestAfterRef,
    receiptIndexManifestRef: record.receiptIndexManifestAfterRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
        anchor.checkpointRepositoryRevision,
    walletCheckpointPromotionRequired: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});
/** Pure structural successor; it is not eligible for persistence without repository admission. */
const bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2 = (input) => {
    const request = readRecord(input, ["adoptionBase", "journalRecordBlob"]);
    if (!isRecord(request.adoptionBase) || !ADOPTION_BASES.has(request.adoptionBase))
        return invalid();
    const base = request.adoptionBase;
    const parsed = parseWalletRecord(base.rootBefore.root, request.journalRecordBlob);
    const created = materialize(walletSuccessorBody(base.rootBefore.root, base.anchorCandidate.anchor, parsed.record, parsed.blob));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, created.root.accountScopeHash);
};
exports.bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2 = bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2;
/** Pure structural successor; the bounded ancestry verifier must admit root and anchor before CAS. */
const bindOwnerRepositoryWalletCreditSuccessorRootV3 = (input) => {
    const request = readRecord(input, ["rootBefore", "journalRecordBlob", "promotedCheckpointAnchor"]);
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string")
        return invalid();
    const root = (0, exports.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash).root;
    const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
    const parsed = parseWalletRecord(root, request.journalRecordBlob);
    const created = materialize(walletSuccessorBody(root, anchor, parsed.record, parsed.blob));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, root.accountScopeHash);
};
exports.bindOwnerRepositoryWalletCreditSuccessorRootV3 = bindOwnerRepositoryWalletCreditSuccessorRootV3;
const parseWalletEffectV2 = (root, blobInput, afterInput) => {
    const supplied = readRecord(blobInput, ["ref", "encoded", "record"]);
    let blob;
    try {
        blob = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryWalletCreditEffectRecordBlobV2)({
            accountScopeHash: root.accountScopeHash,
            ref: supplied.ref,
            raw: supplied.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (!same(blob.record, supplied.record))
        return invalid();
    const record = blob.record;
    if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
        root.journalSequence === Number.MAX_SAFE_INTEGER ||
        record.accountScopeHash !== root.accountScopeHash ||
        record.acceptedAccountGeneration !== root.currentGeneration ||
        record.repositoryRevisionBefore !== root.repositoryRevision ||
        record.rootBeforeFingerprint !== root.rootFingerprint ||
        record.journalSequence !== root.journalSequence + 1 ||
        !same(record.previousJournalRecordRef, root.journalHeadRef) ||
        !same(record.walletStateBeforeRef, root.walletStateRef) ||
        !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef) ||
        !same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
        !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef))
        return mismatch();
    let detachedAfter;
    try {
        detachedAfter = (0, wallet_1.detachBoundedWalletJson)(afterInput, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    const after = readRecord(detachedAfter, [
        "operationIndexManifestAfterRef",
        "subjectIndexManifestAfterRef",
        "receiptIndexManifestAfterRef",
    ]);
    return {
        record,
        blob,
        operationIndexManifestAfterRef: after.operationIndexManifestAfterRef,
        subjectIndexManifestAfterRef: after.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: after.receiptIndexManifestAfterRef,
    };
};
const walletEffectV2SuccessorBody = (root, anchor, parsed) => ({
    schemaVersion: "learning-v2-owner-repository-root.v3",
    accountScopeHash: root.accountScopeHash,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: parsed.record.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: parsed.blob.ref,
    walletStateRef: parsed.record.walletStateAfterRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestRef: parsed.receiptIndexManifestAfterRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision,
    walletCheckpointPromotionRequired: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});
/** V2 effect adoption uses a pre-COW journal blob plus exact planned after refs. */
const bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2 = (input) => {
    const request = readRecord(input, [
        "adoptionBase",
        "journalRecordBlob",
        "operationIndexManifestAfterRef",
        "subjectIndexManifestAfterRef",
        "receiptIndexManifestAfterRef",
    ]);
    if (!isRecord(request.adoptionBase) ||
        !ADOPTION_BASES.has(request.adoptionBase))
        return invalid();
    const base = request.adoptionBase;
    const parsed = parseWalletEffectV2(base.rootBefore.root, request.journalRecordBlob, {
        operationIndexManifestAfterRef: request.operationIndexManifestAfterRef,
        subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
    });
    const created = materialize(walletEffectV2SuccessorBody(base.rootBefore.root, base.anchorCandidate.anchor, parsed));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, created.root.accountScopeHash);
};
exports.bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2 = bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2;
/** Existing RootV3 successor; repository ancestry/COW admission remains separate. */
const bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3 = (input) => {
    const request = readRecord(input, [
        "rootBefore",
        "journalRecordBlob",
        "operationIndexManifestAfterRef",
        "subjectIndexManifestAfterRef",
        "receiptIndexManifestAfterRef",
        "promotedCheckpointAnchor",
    ]);
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
        return invalid();
    }
    const root = (0, exports.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash).root;
    const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
    const parsed = parseWalletEffectV2(root, request.journalRecordBlob, {
        operationIndexManifestAfterRef: request.operationIndexManifestAfterRef,
        subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
    });
    const created = materialize(walletEffectV2SuccessorBody(root, anchor, parsed));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, root.accountScopeHash);
};
exports.bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3 = bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3;
const parseCourseUnlockEffectV2 = (root, blobInput, afterInput) => {
    const supplied = readRecord(blobInput, ["ref", "encoded", "record"]);
    let blob;
    try {
        blob = (0, owner_repository_course_unlock_effect_v2_1.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2)({
            accountScopeHash: root.accountScopeHash,
            ref: supplied.ref,
            raw: supplied.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (!same(blob.record, supplied.record))
        return invalid();
    const record = blob.record;
    if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
        root.journalSequence === Number.MAX_SAFE_INTEGER ||
        record.accountScopeHash !== root.accountScopeHash ||
        record.acceptedAccountGeneration !== root.currentGeneration ||
        record.repositoryRevisionBefore !== root.repositoryRevision ||
        record.rootBeforeFingerprint !== root.rootFingerprint ||
        record.journalSequence !== root.journalSequence + 1 ||
        !same(record.previousJournalRecordRef, root.journalHeadRef) ||
        !same(record.walletStateBeforeRef, root.walletStateRef) ||
        !same(record.courseStateManifestBeforeRef, root.courseStateManifestRef) ||
        !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef) ||
        !same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
        !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)) {
        return mismatch();
    }
    let detachedAfter;
    try {
        detachedAfter = (0, wallet_1.detachBoundedWalletJson)(afterInput, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    const after = readRecord(detachedAfter, [
        "operationIndexManifestAfterRef",
        "subjectIndexManifestAfterRef",
        "receiptIndexManifestAfterRef",
    ]);
    return {
        record,
        blob,
        operationIndexManifestAfterRef: after.operationIndexManifestAfterRef,
        subjectIndexManifestAfterRef: after.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: after.receiptIndexManifestAfterRef,
    };
};
const courseUnlockEffectV2SuccessorBody = (root, anchor, parsed) => ({
    schemaVersion: "learning-v2-owner-repository-root.v3",
    accountScopeHash: root.accountScopeHash,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: parsed.record.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: parsed.blob.ref,
    walletStateRef: parsed.record.walletStateAfterRef,
    courseStateManifestRef: parsed.record.courseStateManifestAfterRef,
    operationIndexManifestRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestRef: parsed.receiptIndexManifestAfterRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision,
    walletCheckpointPromotionRequired: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});
/** V2 adoption for one exact compound wallet-debit + course-access effect. */
const bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2 = (input) => {
    const request = readRecord(input, [
        "adoptionBase",
        "journalRecordBlob",
        "operationIndexManifestAfterRef",
        "subjectIndexManifestAfterRef",
        "receiptIndexManifestAfterRef",
    ]);
    if (!isRecord(request.adoptionBase) ||
        !ADOPTION_BASES.has(request.adoptionBase)) {
        return invalid();
    }
    const base = request.adoptionBase;
    const parsed = parseCourseUnlockEffectV2(base.rootBefore.root, request.journalRecordBlob, {
        operationIndexManifestAfterRef: request.operationIndexManifestAfterRef,
        subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
    });
    const created = materialize(courseUnlockEffectV2SuccessorBody(base.rootBefore.root, base.anchorCandidate.anchor, parsed));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, created.root.accountScopeHash);
};
exports.bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2 = bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2;
/** Existing RootV3 compound successor; persistence still requires history admission. */
const bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3 = (input) => {
    const request = readRecord(input, [
        "rootBefore",
        "journalRecordBlob",
        "operationIndexManifestAfterRef",
        "subjectIndexManifestAfterRef",
        "receiptIndexManifestAfterRef",
        "promotedCheckpointAnchor",
    ]);
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
        return invalid();
    }
    const root = (0, exports.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash).root;
    const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
    const parsed = parseCourseUnlockEffectV2(root, request.journalRecordBlob, {
        operationIndexManifestAfterRef: request.operationIndexManifestAfterRef,
        subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
    });
    const created = materialize(courseUnlockEffectV2SuccessorBody(root, anchor, parsed));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, root.accountScopeHash);
};
exports.bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3 = bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3;
const parseOperationAliasV2 = (root, input) => {
    const supplied = readRecord(input, ["ref", "encoded", "record"]);
    let parsed;
    try {
        parsed = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryOperationAliasRecordBlobV2)({
            accountScopeHash: root.accountScopeHash,
            ref: supplied.ref,
            raw: supplied.encoded,
        });
    }
    catch {
        return invalid();
    }
    const record = parsed.record;
    if (!same(record, supplied.record) ||
        root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
        root.journalSequence === Number.MAX_SAFE_INTEGER ||
        record.accountScopeHash !== root.accountScopeHash ||
        record.acceptedAccountGeneration !== root.currentGeneration ||
        record.repositoryRevisionBefore !== root.repositoryRevision ||
        record.rootBeforeFingerprint !== root.rootFingerprint ||
        record.journalSequence !== root.journalSequence + 1 ||
        !same(record.previousJournalRecordRef, root.journalHeadRef) ||
        !same(record.walletStateRef, root.walletStateRef) ||
        !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef) ||
        !same(record.subjectIndexManifestRef, root.subjectIndexManifestRef) ||
        !same(record.receiptIndexManifestRef, root.receiptIndexManifestRef))
        return mismatch();
    return { record, blob: parsed };
};
/**
 * Structural bound-alias successor. Canonical-effect ancestry and the exact
 * two-key COW must still be proven by the repository window before CAS.
 */
const bindOwnerRepositoryOperationAliasV2SuccessorRootV3 = (input) => {
    const request = readRecord(input, [
        "rootBefore",
        "journalRecordBlob",
        "promotedCheckpointAnchor",
    ]);
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
        return invalid();
    }
    const root = (0, exports.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash).root;
    const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
    const parsed = parseOperationAliasV2(root, request.journalRecordBlob);
    const created = materialize({
        schemaVersion: "learning-v2-owner-repository-root.v3",
        accountScopeHash: root.accountScopeHash,
        currentGeneration: root.currentGeneration,
        repositoryRevision: root.repositoryRevision + 1,
        journalSequence: parsed.record.journalSequence,
        previousRootFingerprint: root.rootFingerprint,
        journalHeadRef: parsed.blob.ref,
        walletStateRef: root.walletStateRef,
        courseStateManifestRef: root.courseStateManifestRef,
        operationIndexManifestRef: parsed.record.operationIndexManifestAfterRef,
        subjectIndexManifestRef: root.subjectIndexManifestRef,
        receiptIndexManifestRef: root.receiptIndexManifestRef,
        walletCheckpointAnchor: anchor,
        walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
            anchor.checkpointRepositoryRevision,
        walletCheckpointPromotionRequired: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
    });
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, root.accountScopeHash);
};
exports.bindOwnerRepositoryOperationAliasV2SuccessorRootV3 = bindOwnerRepositoryOperationAliasV2SuccessorRootV3;
const parseNoWalletRecord = (root, input, expectedKind) => {
    const supplied = readRecord(input, ["ref", "encoded"]);
    let parsed;
    try {
        parsed = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: supplied.ref,
            raw: supplied.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (parsed.record.recordKind !== expectedKind)
        return invalid();
    const record = parsed.record;
    if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
        root.journalSequence === Number.MAX_SAFE_INTEGER ||
        record.accountScopeHash !== root.accountScopeHash ||
        record.acceptedAccountGeneration !== root.currentGeneration ||
        record.repositoryRevisionBefore !== root.repositoryRevision ||
        record.rootBeforeFingerprint !== root.rootFingerprint ||
        record.journalSequence !== root.journalSequence + 1 ||
        !same(record.previousJournalRecordRef, root.journalHeadRef) ||
        !same(record.walletStateRef, root.walletStateRef) ||
        !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef)) {
        return mismatch();
    }
    if (record.recordKind === "operation_alias") {
        if (!same(record.subjectIndexManifestRef, root.subjectIndexManifestRef) ||
            !same(record.receiptIndexManifestRef, root.receiptIndexManifestRef)) {
            return mismatch();
        }
    }
    else if (!same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
        !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)) {
        return mismatch();
    }
    return { record, blob: parsed.blob };
};
const noWalletSuccessorBody = (root, anchor, record, journalBlob) => ({
    schemaVersion: "learning-v2-owner-repository-root.v3",
    accountScopeHash: root.accountScopeHash,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: record.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: journalBlob.ref,
    walletStateRef: root.walletStateRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef: record.operationIndexManifestAfterRef,
    subjectIndexManifestRef: record.recordKind === "operation_alias"
        ? record.subjectIndexManifestRef
        : record.subjectIndexManifestAfterRef,
    receiptIndexManifestRef: record.recordKind === "operation_alias"
        ? record.receiptIndexManifestRef
        : record.receiptIndexManifestAfterRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
        anchor.checkpointRepositoryRevision,
    walletCheckpointPromotionRequired: root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});
const bindNoWalletSuccessorFromV2 = (input, expectedKind) => {
    const request = readRecord(input, ["adoptionBase", "journalRecordBlob"]);
    if (!isRecord(request.adoptionBase) || !ADOPTION_BASES.has(request.adoptionBase)) {
        return invalid();
    }
    const base = request.adoptionBase;
    const parsed = parseNoWalletRecord(base.rootBefore.root, request.journalRecordBlob, expectedKind);
    const created = materialize(noWalletSuccessorBody(base.rootBefore.root, base.anchorCandidate.anchor, parsed.record, parsed.blob));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, created.root.accountScopeHash);
};
const bindNoWalletSuccessor = (input, expectedKind) => {
    const request = readRecord(input, [
        "rootBefore",
        "journalRecordBlob",
        "promotedCheckpointAnchor",
    ]);
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
        return invalid();
    }
    const root = (0, exports.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash).root;
    const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
    const parsed = parseNoWalletRecord(root, request.journalRecordBlob, expectedKind);
    const created = materialize(noWalletSuccessorBody(root, anchor, parsed.record, parsed.blob));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, root.accountScopeHash);
};
/** Structural alias successor only; repository graph validation is mandatory before CAS. */
const bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2 = (input) => bindNoWalletSuccessorFromV2(input, "operation_alias");
exports.bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2 = bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2;
/** Structural alias successor only; it does not prove canonical-effect reachability/COW. */
const bindOwnerRepositoryOperationAliasSuccessorRootV3 = (input) => bindNoWalletSuccessor(input, "operation_alias");
exports.bindOwnerRepositoryOperationAliasSuccessorRootV3 = bindOwnerRepositoryOperationAliasSuccessorRootV3;
/** Structural one-key repair successor only; no persisted corruption is authorized here. */
const bindOwnerRepositoryMissingIndexRepairSuccessorRootV3FromV2 = (input) => bindNoWalletSuccessorFromV2(input, "missing_index_entry");
exports.bindOwnerRepositoryMissingIndexRepairSuccessorRootV3FromV2 = bindOwnerRepositoryMissingIndexRepairSuccessorRootV3FromV2;
/** Structural one-key repair successor only; repository admission/COW proof are separate. */
const bindOwnerRepositoryMissingIndexRepairSuccessorRootV3 = (input) => bindNoWalletSuccessor(input, "missing_index_entry");
exports.bindOwnerRepositoryMissingIndexRepairSuccessorRootV3 = bindOwnerRepositoryMissingIndexRepairSuccessorRootV3;
const rolloverBody = (root, anchor, targetGeneration) => {
    if (!safe(targetGeneration) || targetGeneration <= root.currentGeneration ||
        root.repositoryRevision === Number.MAX_SAFE_INTEGER)
        return invalid();
    return {
        schemaVersion: "learning-v2-owner-repository-root.v3",
        accountScopeHash: root.accountScopeHash,
        currentGeneration: targetGeneration,
        repositoryRevision: root.repositoryRevision + 1,
        journalSequence: root.journalSequence,
        previousRootFingerprint: root.rootFingerprint,
        journalHeadRef: root.journalHeadRef,
        walletStateRef: root.walletStateRef,
        courseStateManifestRef: root.courseStateManifestRef,
        operationIndexManifestRef: root.operationIndexManifestRef,
        subjectIndexManifestRef: root.subjectIndexManifestRef,
        receiptIndexManifestRef: root.receiptIndexManifestRef,
        walletCheckpointAnchor: anchor,
        walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
            anchor.checkpointRepositoryRevision,
        walletCheckpointPromotionRequired: true,
    };
};
/** Pure structural rollover; it does not establish durable checkpoint/current-root authority. */
const advanceOwnerRepositoryRootV3GenerationFromV2 = (input) => {
    const request = readRecord(input, ["adoptionBase", "targetGeneration"]);
    if (!isRecord(request.adoptionBase) || !ADOPTION_BASES.has(request.adoptionBase))
        return invalid();
    const base = request.adoptionBase;
    const created = materialize(rolloverBody(base.rootBefore.root, base.anchorCandidate.anchor, request.targetGeneration));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, created.root.accountScopeHash);
};
exports.advanceOwnerRepositoryRootV3GenerationFromV2 = advanceOwnerRepositoryRootV3GenerationFromV2;
/** Pure structural rollover; only a repository-admitted result may later reach CAS. */
const advanceOwnerRepositoryRootV3Generation = (input) => {
    const request = readRecord(input, ["rootBefore", "targetGeneration", "promotedCheckpointAnchor"]);
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_root_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string")
        return invalid();
    const root = (0, exports.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash).root;
    const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
    const created = materialize(rolloverBody(root, anchor, request.targetGeneration));
    return (0, exports.parseOwnerRepositoryRootV3)(created.root, root.accountScopeHash);
};
exports.advanceOwnerRepositoryRootV3Generation = advanceOwnerRepositoryRootV3Generation;
//# sourceMappingURL=owner_repository_root_v3.js.map