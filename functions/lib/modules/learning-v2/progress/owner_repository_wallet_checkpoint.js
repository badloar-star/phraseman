"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnerRepositoryWalletCheckpoint = exports.matchOwnerRepositoryWalletCheckpointProjection = exports.materializeOwnerRepositoryWalletCheckpoint = exports.appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition = exports.appendOwnerRepositoryWalletCreditCheckpointPage = exports.createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration = exports.createOwnerRepositoryWalletCheckpointAccumulator = exports.ownerRepositoryWalletCheckpointKey = exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_course_manifest_1 = require("./owner_repository_course_manifest");
const owner_repository_economic_manifest_1 = require("./owner_repository_economic_manifest");
const owner_repository_wallet_credit_page_1 = require("./owner_repository_wallet_credit_page");
const owner_repository_root_fold_1 = require("./owner_repository_root_fold");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_wallet_blob_1 = require("./owner_repository_wallet_blob");
exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL = 16;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 64 * 1024;
const CHECKPOINT_KEYS = [
    "schemaVersion", "checkpointKind", "bootstrapOrigin", "accountScopeHash", "checkpointRootFingerprint",
    "currentGeneration", "repositoryRevision", "journalSequence", "previousRootFingerprint",
    "journalHeadRef", "walletStateRef", "courseStateManifestRef", "operationIndexManifestRef",
    "subjectIndexManifestRef", "receiptIndexManifestRef", "walletStateFingerprint",
    "walletRevision", "canonicalEffectCount", "operationEntryCount", "subjectEntryCount",
    "receiptEntryCount", "pageStartingRootFingerprint", "pageStartingRepositoryRevision",
    "pageStartingJournalSequence", "previousCheckpointRootFingerprint",
    "previousCheckpointFingerprint", "walletCreditTransitions", "generationRolloverTransitions",
    "rootTransitions", "pageAccumulatorFingerprint", "checkpointFingerprint",
];
const ACCUMULATORS = new WeakSet();
const CHECKPOINTS = new WeakSet();
const LOCALLY_MATERIALIZED_CHECKPOINTS = new WeakSet();
const PROJECTION_MATCHED_CHECKPOINTS = new WeakSet();
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => { throw new Error("owner_repository_wallet_checkpoint_invalid"); };
const indeterminate = () => {
    throw new Error("owner_repository_wallet_checkpoint_indeterminate");
};
const mismatch = () => { throw new Error("owner_repository_wallet_checkpoint_mismatch"); };
const overflow = () => { throw new Error("owner_repository_wallet_checkpoint_overflow"); };
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
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
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            return invalid();
        result[key] = descriptor.value;
    }
    return result;
};
const denseArray = (input, maximum) => {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype ||
        input.length > maximum)
        return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") || keys.length !== input.length + 1 ||
        !Object.prototype.hasOwnProperty.call(descriptors, "length"))
        return invalid();
    const values = [];
    for (let index = 0; index < input.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            return invalid();
        values.push(descriptor.value);
    }
    return values;
};
const checkedAdd = (left, right) => {
    const value = left + right;
    if (!safe(value))
        return overflow();
    return value;
};
const checkedDouble = (value) => {
    if (!safe(value) || value > Math.floor(Number.MAX_SAFE_INTEGER / 2))
        return overflow();
    return value * 2;
};
const parseRootMaterialization = (input) => {
    const value = readRecord(input, ["root", "encoded"]);
    if (typeof value.encoded !== "string")
        return invalid();
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(value.root, "owner_repository_wallet_checkpoint_invalid");
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
    if (parsed.encoded !== value.encoded)
        return invalid();
    return parsed;
};
const hashBody = (body) => (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body));
const ownerRepositoryWalletCheckpointKey = (accountScopeHash, checkpointRootFingerprint) => {
    if (typeof accountScopeHash !== "string" || !ACCOUNT.test(accountScopeHash) ||
        typeof checkpointRootFingerprint !== "string" || !HASH.test(checkpointRootFingerprint)) {
        return invalid();
    }
    return `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${checkpointRootFingerprint}`;
};
exports.ownerRepositoryWalletCheckpointKey = ownerRepositoryWalletCheckpointKey;
const accumulatorSeed = (root, previous, bootstrapOrigin) => hashBody({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-page-seed.v1",
    accountScopeHash: root.accountScopeHash,
    pageStartingRootFingerprint: root.rootFingerprint,
    previousCheckpointRootFingerprint: previous?.checkpoint.checkpointRootFingerprint ?? null,
    previousCheckpointFingerprint: previous?.checkpoint.checkpointFingerprint ?? null,
    bootstrapOrigin,
});
const freezeAccumulator = (value) => {
    const frozen = deepFreeze(value);
    ACCUMULATORS.add(frozen);
    return frozen;
};
/**
 * Starts deterministic checkpoint induction from a repository-verified RootV2. A self-hashed
 * root/checkpoint is not authentication; the caller must already have verified storage ancestry.
 */
const createOwnerRepositoryWalletCheckpointAccumulator = (input) => {
    const request = readRecord(input, ["startingRoot", "previousCheckpoint"]);
    const startingRoot = parseRootMaterialization(request.startingRoot);
    let previous = null;
    if (request.previousCheckpoint === null) {
        if (startingRoot.root.journalSequence !== 0 || startingRoot.root.journalHeadRef !== null ||
            startingRoot.root.repositoryRevision !== 0 ||
            startingRoot.root.previousRootFingerprint !== null) {
            return invalid();
        }
    }
    else {
        if (!isRecord(request.previousCheckpoint) ||
            !PROJECTION_MATCHED_CHECKPOINTS.has(request.previousCheckpoint)) {
            return invalid();
        }
        previous = request.previousCheckpoint;
        if (previous.checkpoint.accountScopeHash !== startingRoot.root.accountScopeHash ||
            previous.checkpoint.checkpointRootFingerprint !== startingRoot.root.rootFingerprint ||
            previous.checkpoint.repositoryRevision !== startingRoot.root.repositoryRevision ||
            previous.checkpoint.journalSequence !== startingRoot.root.journalSequence ||
            previous.key !== (0, exports.ownerRepositoryWalletCheckpointKey)(startingRoot.root.accountScopeHash, startingRoot.root.rootFingerprint))
            return invalid();
    }
    return freezeAccumulator({
        startingRoot,
        endingRoot: startingRoot,
        previousCheckpoint: previous,
        bootstrapOrigin: previous === null ? "fresh_v2_genesis" : null,
        walletCreditTransitions: 0,
        generationRolloverTransitions: 0,
        rootTransitions: 0,
        pageAccumulatorFingerprint: accumulatorSeed(startingRoot.root, previous, previous === null ? "fresh_v2_genesis" : null),
        closedByGenerationRollover: false,
    });
};
exports.createOwnerRepositoryWalletCheckpointAccumulator = createOwnerRepositoryWalletCheckpointAccumulator;
/**
 * `Verified` here means re-derived by the closed V1→V2 migration codec. It is not proof that
 * the migrated root is the durable active root; repository fence/CAS admission remains external.
 */
const createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration = async (input) => {
    const request = readRecord(input, [
        "rootV1", "targetGeneration", "emptyCourseStateManifestBlob", "resolveCourseNode",
        "migratedRoot",
    ]);
    if (typeof request.resolveCourseNode !== "function")
        return invalid();
    const migratedRoot = parseRootMaterialization(request.migratedRoot);
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
    return freezeAccumulator({
        startingRoot: migratedRoot,
        endingRoot: migratedRoot,
        previousCheckpoint: null,
        bootstrapOrigin: "verified_v1_genesis_migration",
        walletCreditTransitions: 0,
        generationRolloverTransitions: 0,
        rootTransitions: 0,
        pageAccumulatorFingerprint: accumulatorSeed(migratedRoot.root, null, "verified_v1_genesis_migration"),
        closedByGenerationRollover: false,
    });
};
exports.createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration = createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration;
const appendOwnerRepositoryWalletCreditCheckpointPage = (input) => {
    const request = readRecord(input, ["accumulator", "page"]);
    if (!isRecord(request.accumulator) || !ACCUMULATORS.has(request.accumulator) ||
        request.accumulator
            .closedByGenerationRollover ||
        !(0, owner_repository_wallet_credit_page_1.isOwnerRepositoryWalletCreditPageFoldResult)(request.page))
        return invalid();
    const accumulator = request.accumulator;
    const page = request.page;
    const pageStart = parseRootMaterialization(page.startingRoot);
    if (!same(pageStart, accumulator.endingRoot))
        return mismatch();
    const transitions = denseArray(page.transitions, exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL - accumulator.rootTransitions);
    if (transitions.length < 1 ||
        checkedAdd(accumulator.rootTransitions, transitions.length) >
            exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL)
        return invalid();
    let current = accumulator.endingRoot;
    let fingerprint = accumulator.pageAccumulatorFingerprint;
    for (const candidate of transitions) {
        const transition = readRecord(candidate, [
            "status", "appliedReceipt", "authorizedOperation", "journalRecord", "journalRecordBlob",
            "walletStateAfterBlob", "successorRoot", "immutableBlobs",
        ]);
        if (transition.status !== "applied")
            return invalid();
        const suppliedBlob = readRecord(transition.journalRecordBlob, ["ref", "encoded"]);
        let parsedBlob;
        let successor;
        try {
            parsedBlob = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
                accountScopeHash: current.root.accountScopeHash,
                ref: suppliedBlob.ref,
                raw: suppliedBlob.encoded,
            });
            successor = (0, owner_repository_root_fold_1.bindOwnerRepositoryWalletCreditSuccessorRootV2)({
                rootBefore: current.root,
                journalRecordBlob: { ref: suppliedBlob.ref, encoded: suppliedBlob.encoded },
            });
        }
        catch {
            return invalid();
        }
        const suppliedSuccessor = parseRootMaterialization(transition.successorRoot);
        let detachedRecord;
        try {
            detachedRecord = (0, wallet_1.detachBoundedWalletJson)(transition.journalRecord, "owner_repository_wallet_checkpoint_invalid");
        }
        catch {
            return invalid();
        }
        if (parsedBlob.record.recordKind !== "wallet_credit" ||
            !same(parsedBlob.record, detachedRecord) ||
            !same(successor, suppliedSuccessor) ||
            current.root.currentGeneration !== successor.root.currentGeneration ||
            !same(current.root.courseStateManifestRef, successor.root.courseStateManifestRef)) {
            return mismatch();
        }
        fingerprint = hashBody({
            schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-step.v1",
            previousAccumulatorFingerprint: fingerprint,
            transitionKind: "wallet_credit",
            rootBeforeFingerprint: current.root.rootFingerprint,
            rootAfterFingerprint: successor.root.rootFingerprint,
            repositoryRevisionBefore: current.root.repositoryRevision,
            repositoryRevisionAfter: successor.root.repositoryRevision,
            journalSequenceBefore: current.root.journalSequence,
            journalSequenceAfter: successor.root.journalSequence,
            journalRecordFingerprint: parsedBlob.record.journalRecordFingerprint,
            journalRecordBlobFingerprint: parsedBlob.blob.ref.blobFingerprint,
        });
        current = successor;
    }
    const pageEnd = parseRootMaterialization(page.endingRoot);
    const endingWallet = readRecord(page.endingWalletStateBlob, ["ref", "encoded"]);
    const endingOperation = readRecord(page.endingOperationManifestBlob, ["ref", "encoded"]);
    const endingSubject = readRecord(page.endingSubjectManifestBlob, ["ref", "encoded"]);
    const endingReceipt = readRecord(page.endingReceiptManifestBlob, ["ref", "encoded"]);
    if (!same(current, pageEnd) || !same(endingWallet.ref, current.root.walletStateRef) ||
        !same(endingOperation.ref, current.root.operationIndexManifestRef) ||
        !same(endingSubject.ref, current.root.subjectIndexManifestRef) ||
        !same(endingReceipt.ref, current.root.receiptIndexManifestRef))
        return mismatch();
    return freezeAccumulator({
        ...accumulator,
        endingRoot: current,
        walletCreditTransitions: checkedAdd(accumulator.walletCreditTransitions, transitions.length),
        rootTransitions: checkedAdd(accumulator.rootTransitions, transitions.length),
        pageAccumulatorFingerprint: fingerprint,
    });
};
exports.appendOwnerRepositoryWalletCreditCheckpointPage = appendOwnerRepositoryWalletCreditCheckpointPage;
const appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition = (input) => {
    const request = readRecord(input, ["accumulator", "successorRoot"]);
    if (!isRecord(request.accumulator) || !ACCUMULATORS.has(request.accumulator))
        return invalid();
    const accumulator = request.accumulator;
    if (accumulator.closedByGenerationRollover || accumulator.generationRolloverTransitions !== 0 ||
        accumulator.rootTransitions >= exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL)
        return invalid();
    const successor = parseRootMaterialization(request.successorRoot);
    let expected;
    try {
        expected = (0, owner_repository_root_v2_1.advanceOwnerRepositoryRootV2Generation)({
            root: accumulator.endingRoot.root,
            targetGeneration: successor.root.currentGeneration,
        });
    }
    catch {
        return invalid();
    }
    if (!same(expected, successor))
        return mismatch();
    const before = accumulator.endingRoot.root;
    const after = successor.root;
    const fingerprint = hashBody({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-step.v1",
        previousAccumulatorFingerprint: accumulator.pageAccumulatorFingerprint,
        transitionKind: "generation_rollover",
        rootBeforeFingerprint: before.rootFingerprint,
        rootAfterFingerprint: after.rootFingerprint,
        repositoryRevisionBefore: before.repositoryRevision,
        repositoryRevisionAfter: after.repositoryRevision,
        generationBefore: before.currentGeneration,
        generationAfter: after.currentGeneration,
        journalSequence: before.journalSequence,
        journalHeadRef: before.journalHeadRef,
        walletStateRef: before.walletStateRef,
        courseStateManifestRef: before.courseStateManifestRef,
        operationIndexManifestRef: before.operationIndexManifestRef,
        subjectIndexManifestRef: before.subjectIndexManifestRef,
        receiptIndexManifestRef: before.receiptIndexManifestRef,
    });
    return freezeAccumulator({
        ...accumulator,
        endingRoot: successor,
        generationRolloverTransitions: 1,
        rootTransitions: checkedAdd(accumulator.rootTransitions, 1),
        pageAccumulatorFingerprint: fingerprint,
        closedByGenerationRollover: true,
    });
};
exports.appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition = appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition;
const materializeBody = (body) => {
    let encoded;
    const checkpoint = deepFreeze({ ...body, checkpointFingerprint: hashBody(body) });
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(checkpoint);
    }
    catch {
        return invalid();
    }
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BYTES)
        return overflow();
    return deepFreeze({
        checkpoint,
        key: (0, exports.ownerRepositoryWalletCheckpointKey)(checkpoint.accountScopeHash, checkpoint.checkpointRootFingerprint),
        encoded,
    });
};
/**
 * Materializes a structural checkpoint candidate. Before persistence or reuse as a previous
 * checkpoint it must pass `matchOwnerRepositoryWalletCheckpointProjection`.
 */
const materializeOwnerRepositoryWalletCheckpoint = (input) => {
    const request = readRecord(input, ["accumulator", "endingWalletStateBlob"]);
    if (!isRecord(request.accumulator) || !ACCUMULATORS.has(request.accumulator))
        return invalid();
    const accumulator = request.accumulator;
    if (accumulator.previousCheckpoint === null) {
        const freshBootstrap = accumulator.bootstrapOrigin === "fresh_v2_genesis" &&
            accumulator.rootTransitions === 0 &&
            accumulator.endingRoot.root.journalSequence === 0 &&
            accumulator.endingRoot.root.repositoryRevision === 0 &&
            accumulator.endingRoot.root.previousRootFingerprint === null;
        const verifiedMigration = accumulator.bootstrapOrigin === "verified_v1_genesis_migration" &&
            accumulator.rootTransitions === 0 && accumulator.endingRoot.root.journalSequence === 0 &&
            accumulator.endingRoot.root.repositoryRevision === 1 &&
            accumulator.endingRoot.root.previousRootFingerprint !== null;
        if (!freshBootstrap && !verifiedMigration)
            return invalid();
    }
    else if (accumulator.rootTransitions !== exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL &&
        !accumulator.closedByGenerationRollover)
        return invalid();
    const suppliedWallet = readRecord(request.endingWalletStateBlob, ["ref", "encoded"]);
    let wallet;
    try {
        wallet = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash: accumulator.endingRoot.root.accountScopeHash,
            ref: suppliedWallet.ref,
            raw: suppliedWallet.encoded,
        });
    }
    catch {
        return invalid();
    }
    const root = accumulator.endingRoot.root;
    if (!same(wallet.blob.ref, root.walletStateRef) || wallet.state.revision !== root.journalSequence) {
        return mismatch();
    }
    const canonicalEffectCount = root.journalSequence;
    const created = materializeBody({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
        checkpointKind: "wallet_credit_only",
        bootstrapOrigin: accumulator.bootstrapOrigin,
        accountScopeHash: root.accountScopeHash,
        checkpointRootFingerprint: root.rootFingerprint,
        currentGeneration: root.currentGeneration,
        repositoryRevision: root.repositoryRevision,
        journalSequence: root.journalSequence,
        previousRootFingerprint: root.previousRootFingerprint,
        journalHeadRef: root.journalHeadRef,
        walletStateRef: root.walletStateRef,
        courseStateManifestRef: root.courseStateManifestRef,
        operationIndexManifestRef: root.operationIndexManifestRef,
        subjectIndexManifestRef: root.subjectIndexManifestRef,
        receiptIndexManifestRef: root.receiptIndexManifestRef,
        walletStateFingerprint: wallet.state.stateFingerprint,
        walletRevision: wallet.state.revision,
        canonicalEffectCount,
        operationEntryCount: checkedDouble(canonicalEffectCount),
        subjectEntryCount: canonicalEffectCount,
        receiptEntryCount: canonicalEffectCount,
        pageStartingRootFingerprint: accumulator.startingRoot.root.rootFingerprint,
        pageStartingRepositoryRevision: accumulator.startingRoot.root.repositoryRevision,
        pageStartingJournalSequence: accumulator.startingRoot.root.journalSequence,
        previousCheckpointRootFingerprint: accumulator.previousCheckpoint?.checkpoint.checkpointRootFingerprint ?? null,
        previousCheckpointFingerprint: accumulator.previousCheckpoint?.checkpoint.checkpointFingerprint ?? null,
        walletCreditTransitions: accumulator.walletCreditTransitions,
        generationRolloverTransitions: accumulator.generationRolloverTransitions,
        rootTransitions: accumulator.rootTransitions,
        pageAccumulatorFingerprint: accumulator.pageAccumulatorFingerprint,
    });
    const parsed = (0, exports.parseOwnerRepositoryWalletCheckpoint)({
        accountScopeHash: root.accountScopeHash,
        checkpointRoot: root,
        key: created.key,
        raw: created.encoded,
        walletStateBlob: { ref: suppliedWallet.ref, encoded: suppliedWallet.encoded },
    });
    LOCALLY_MATERIALIZED_CHECKPOINTS.add(parsed);
    return parsed;
};
exports.materializeOwnerRepositoryWalletCheckpoint = materializeOwnerRepositoryWalletCheckpoint;
/**
 * Matches the structural checkpoint candidate to the exact repository-verified projection
 * blobs. Radix parsing here validates canonical roots/counts, not the deferred lifetime audit.
 * A checkpoint parsed from storage is therefore not admitted as a previous authority by this
 * function; the later repository window verifier must provide that durable admission boundary.
 */
const matchOwnerRepositoryWalletCheckpointProjection = async (input) => {
    const request = readRecord(input, [
        "checkpoint", "checkpointRoot", "walletStateBlob", "courseManifestBlob",
        "operationManifestBlob", "subjectManifestBlob", "receiptManifestBlob", "resolveNode",
    ]);
    if (!isRecord(request.checkpoint) || !CHECKPOINTS.has(request.checkpoint) ||
        typeof request.resolveNode !== "function")
        return invalid();
    const checkpoint = request.checkpoint;
    let detachedRoot;
    let root;
    try {
        detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.checkpointRoot, "owner_repository_wallet_checkpoint_invalid");
        if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string")
            return invalid();
        root = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(detachedRoot, detachedRoot.accountScopeHash).root;
    }
    catch {
        return invalid();
    }
    if (root.rootFingerprint !== checkpoint.checkpoint.checkpointRootFingerprint)
        return mismatch();
    const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
    const courseBlob = readRecord(request.courseManifestBlob, ["ref", "encoded"]);
    const operationBlob = readRecord(request.operationManifestBlob, ["ref", "encoded"]);
    const subjectBlob = readRecord(request.subjectManifestBlob, ["ref", "encoded"]);
    const receiptBlob = readRecord(request.receiptManifestBlob, ["ref", "encoded"]);
    const externalCache = new Map();
    let externalReads = 0;
    let externalBytes = 0;
    const resolveNode = async (ref) => {
        if (externalCache.has(ref.blobKey))
            return externalCache.get(ref.blobKey);
        if (externalReads >= 64)
            return overflow();
        let raw;
        try {
            raw = await request.resolveNode(ref);
        }
        catch {
            return indeterminate();
        }
        externalReads += 1;
        if (typeof raw === "string") {
            try {
                externalBytes = checkedAdd(externalBytes, (0, decision_registry_1.utf8ByteLengthV1)(raw));
            }
            catch {
                return overflow();
            }
            if (externalBytes > 64 * 1024 * 1024)
                return overflow();
        }
        externalCache.set(ref.blobKey, raw);
        return raw;
    };
    let wallet;
    let course;
    let operation;
    let subject;
    let receipt;
    try {
        wallet = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: walletBlob.ref,
            raw: walletBlob.encoded,
        });
        course = await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: courseBlob.ref,
            raw: courseBlob.encoded,
            resolveNode,
        });
        operation = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "operation",
            ref: operationBlob.ref,
            raw: operationBlob.encoded,
            resolveNode,
        });
        subject = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "subject",
            ref: subjectBlob.ref,
            raw: subjectBlob.encoded,
            resolveNode,
        });
        receipt = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "receipt",
            ref: receiptBlob.ref,
            raw: receiptBlob.encoded,
            resolveNode,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("overflow"))
            throw error;
        return indeterminate();
    }
    const expected = checkpoint.checkpoint;
    if (!same(wallet.blob.ref, root.walletStateRef) ||
        !same(course.manifestBlob.ref, root.courseStateManifestRef) ||
        !same(operation.sourceManifestBlob.ref, root.operationIndexManifestRef) ||
        !same(subject.sourceManifestBlob.ref, root.subjectIndexManifestRef) ||
        !same(receipt.sourceManifestBlob.ref, root.receiptIndexManifestRef) ||
        wallet.state.stateFingerprint !== expected.walletStateFingerprint ||
        wallet.state.revision !== expected.walletRevision || course.manifest.entryCount !== 0 ||
        operation.manifest.entryCount !== expected.operationEntryCount ||
        subject.manifest.entryCount !== expected.subjectEntryCount ||
        receipt.manifest.entryCount !== expected.receiptEntryCount)
        return mismatch();
    if (LOCALLY_MATERIALIZED_CHECKPOINTS.has(checkpoint)) {
        PROJECTION_MATCHED_CHECKPOINTS.add(checkpoint);
    }
    return checkpoint;
};
exports.matchOwnerRepositoryWalletCheckpointProjection = matchOwnerRepositoryWalletCheckpointProjection;
/**
 * Structural projection match only. It does not authenticate a checkpoint or recursively audit
 * previous checkpoints, journal records, radix nodes, or the repository CAS lineage.
 */
const parseOwnerRepositoryWalletCheckpoint = (input) => {
    let request;
    try {
        request = readRecord(input, [
            "accountScopeHash", "checkpointRoot", "key", "raw", "walletStateBlob",
        ]);
    }
    catch {
        return indeterminate();
    }
    if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.key !== "string" || typeof request.raw !== "string")
        return indeterminate();
    let detachedRoot;
    let root;
    let wallet;
    try {
        detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.checkpointRoot, "owner_repository_wallet_checkpoint_indeterminate");
        if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string") {
            return indeterminate();
        }
        root = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(detachedRoot, request.accountScopeHash).root;
        const suppliedWallet = readRecord(request.walletStateBlob, ["ref", "encoded"]);
        wallet = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash: request.accountScopeHash,
            ref: suppliedWallet.ref,
            raw: suppliedWallet.encoded,
        });
    }
    catch {
        return indeterminate();
    }
    let detached;
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MAX_BYTES)
            return indeterminate();
        detached = (0, wallet_1.detachBoundedWalletJson)(JSON.parse(request.raw), "owner_repository_wallet_checkpoint_indeterminate");
        if ((0, decision_registry_1.canonicalJsonV1)(detached) !== request.raw)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    if (!isRecord(detached) || Reflect.ownKeys(detached).length !== CHECKPOINT_KEYS.length ||
        !Reflect.ownKeys(detached).every((key) => typeof key === "string" &&
            CHECKPOINT_KEYS.includes(key)) ||
        detached.schemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" ||
        detached.checkpointKind !== "wallet_credit_only" ||
        ![null, "fresh_v2_genesis", "verified_v1_genesis_migration"].includes(detached.bootstrapOrigin) ||
        detached.accountScopeHash !== request.accountScopeHash ||
        typeof detached.checkpointRootFingerprint !== "string" ||
        !HASH.test(detached.checkpointRootFingerprint) ||
        typeof detached.walletStateFingerprint !== "string" || !HASH.test(detached.walletStateFingerprint) ||
        typeof detached.pageStartingRootFingerprint !== "string" ||
        !HASH.test(detached.pageStartingRootFingerprint) ||
        typeof detached.pageAccumulatorFingerprint !== "string" ||
        !HASH.test(detached.pageAccumulatorFingerprint) ||
        typeof detached.checkpointFingerprint !== "string" || !HASH.test(detached.checkpointFingerprint)) {
        return indeterminate();
    }
    const numericKeys = [
        "currentGeneration", "repositoryRevision", "journalSequence", "walletRevision",
        "canonicalEffectCount", "operationEntryCount", "subjectEntryCount", "receiptEntryCount",
        "pageStartingRepositoryRevision", "pageStartingJournalSequence", "walletCreditTransitions",
        "generationRolloverTransitions", "rootTransitions",
    ];
    if (numericKeys.some((key) => !safe(detached[key])))
        return indeterminate();
    const previousCheckpointRootFingerprint = detached.previousCheckpointRootFingerprint;
    const previousCheckpointFingerprint = detached.previousCheckpointFingerprint;
    if ((previousCheckpointRootFingerprint === null) !== (previousCheckpointFingerprint === null) ||
        (previousCheckpointRootFingerprint !== null &&
            (typeof previousCheckpointRootFingerprint !== "string" ||
                !HASH.test(previousCheckpointRootFingerprint))) ||
        (previousCheckpointFingerprint !== null &&
            (typeof previousCheckpointFingerprint !== "string" || !HASH.test(previousCheckpointFingerprint)))) {
        return indeterminate();
    }
    const rootTransitions = Number(detached.rootTransitions);
    const credits = Number(detached.walletCreditTransitions);
    const rollovers = Number(detached.generationRolloverTransitions);
    const sequence = Number(detached.journalSequence);
    const revision = Number(detached.repositoryRevision);
    const startSequence = Number(detached.pageStartingJournalSequence);
    const startRevision = Number(detached.pageStartingRepositoryRevision);
    let operationCount;
    try {
        operationCount = checkedDouble(sequence);
    }
    catch {
        return indeterminate();
    }
    if (rootTransitions > exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL || rollovers > 1 ||
        credits + rollovers !== rootTransitions || startSequence > sequence || startRevision > revision ||
        sequence - startSequence !== credits || revision - startRevision !== rootTransitions ||
        detached.walletRevision !== sequence || detached.canonicalEffectCount !== sequence ||
        detached.operationEntryCount !== operationCount || detached.subjectEntryCount !== sequence ||
        detached.receiptEntryCount !== sequence)
        return indeterminate();
    if (previousCheckpointRootFingerprint === null) {
        const freshBootstrap = detached.bootstrapOrigin === "fresh_v2_genesis" &&
            rootTransitions === 0 && credits === 0 && rollovers === 0 &&
            sequence === 0 && detached.pageStartingRootFingerprint === detached.checkpointRootFingerprint &&
            startRevision === revision && startSequence === sequence && revision === 0 &&
            detached.previousRootFingerprint === null;
        const verifiedMigration = detached.bootstrapOrigin === "verified_v1_genesis_migration" &&
            rootTransitions === 0 && credits === 0 && rollovers === 0 && sequence === 0 &&
            detached.pageStartingRootFingerprint === detached.checkpointRootFingerprint &&
            startRevision === revision && startSequence === sequence && revision === 1 &&
            detached.previousRootFingerprint !== null;
        if (!freshBootstrap && !verifiedMigration)
            return indeterminate();
    }
    else {
        if (detached.bootstrapOrigin !== null ||
            previousCheckpointRootFingerprint !== detached.pageStartingRootFingerprint ||
            (rootTransitions !== exports.OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL && rollovers !== 1)) {
            return indeterminate();
        }
    }
    const rootMatches = detached.checkpointRootFingerprint === root.rootFingerprint &&
        detached.currentGeneration === root.currentGeneration &&
        detached.repositoryRevision === root.repositoryRevision &&
        detached.journalSequence === root.journalSequence &&
        detached.previousRootFingerprint === root.previousRootFingerprint &&
        same(detached.journalHeadRef, root.journalHeadRef) &&
        same(detached.walletStateRef, root.walletStateRef) &&
        same(detached.courseStateManifestRef, root.courseStateManifestRef) &&
        same(detached.operationIndexManifestRef, root.operationIndexManifestRef) &&
        same(detached.subjectIndexManifestRef, root.subjectIndexManifestRef) &&
        same(detached.receiptIndexManifestRef, root.receiptIndexManifestRef);
    if (!rootMatches || !same(wallet.blob.ref, root.walletStateRef) ||
        detached.walletStateFingerprint !== wallet.state.stateFingerprint ||
        detached.walletRevision !== wallet.state.revision ||
        request.key !== (0, exports.ownerRepositoryWalletCheckpointKey)(request.accountScopeHash, root.rootFingerprint))
        return mismatch();
    const { checkpointFingerprint, ...body } = detached;
    if (checkpointFingerprint !== hashBody(body))
        return indeterminate();
    const checkpoint = deepFreeze(detached);
    const result = deepFreeze({ checkpoint, key: request.key, encoded: request.raw });
    CHECKPOINTS.add(result);
    return result;
};
exports.parseOwnerRepositoryWalletCheckpoint = parseOwnerRepositoryWalletCheckpoint;
//# sourceMappingURL=owner_repository_wallet_checkpoint.js.map