"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnerRepositoryEconomicCheckpointV3ProjectionMatched = exports.createOwnerRepositoryEconomicCheckpointV3AnchorCandidate = exports.parseOwnerRepositoryEconomicCheckpointV3 = exports.materializeOwnerRepositoryEconomicCheckpointV3 = exports.ownerRepositoryEconomicCheckpointV3Key = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_course_manifest_1 = require("./owner_repository_course_manifest");
const owner_repository_economic_manifest_1 = require("./owner_repository_economic_manifest");
const owner_repository_root_v3_1 = require("./owner_repository_root_v3");
const owner_repository_wallet_blob_1 = require("./owner_repository_wallet_blob");
const MAX_BYTES = 64 * 1024;
const MAX_EXTERNAL_READS = 64;
const MAX_EXTERNAL_BYTES = 64 * 1024 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const KEYS = [
    "schemaVersion", "checkpointKind", "accountScopeHash", "checkpointRoot",
    "checkpointRootFingerprint", "previousCheckpointAnchor", "currentGeneration",
    "repositoryRevision", "journalSequence", "windowRootTransitions",
    "walletCreditTransitions", "operationAliasTransitions",
    "missingIndexRepairTransitions", "generationRolloverTransitions",
    "walletStateFingerprint", "walletRevision", "walletCreditCount",
    "operationAliasCount", "missingIndexRepairCount", "operationEntryCount",
    "subjectEntryCount", "receiptEntryCount", "checkpointFingerprint",
];
const CHECKPOINTS = new WeakSet();
const PROJECTION_MATCHED = new WeakSet();
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_economic_checkpoint_v3_invalid");
};
const mismatch = () => {
    throw new Error("owner_repository_economic_checkpoint_v3_mismatch");
};
const indeterminate = () => {
    throw new Error("owner_repository_economic_checkpoint_v3_indeterminate");
};
const overflow = () => {
    throw new Error("owner_repository_economic_checkpoint_v3_overflow");
};
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const checkedAdd = (left, right) => {
    const result = left + right;
    if (!Number.isSafeInteger(result) || result < 0)
        return overflow();
    return result;
};
const checkedDouble = (value) => checkedAdd(value, value);
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
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
const ownerRepositoryEconomicCheckpointV3Key = (accountScopeHash, rootFingerprint) => {
    if (typeof accountScopeHash !== "string" || !ACCOUNT.test(accountScopeHash) ||
        typeof rootFingerprint !== "string" || !HASH.test(rootFingerprint))
        return invalid();
    return `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${rootFingerprint}`;
};
exports.ownerRepositoryEconomicCheckpointV3Key = ownerRepositoryEconomicCheckpointV3Key;
const parseRootMaterialization = (input) => {
    const request = readRecord(input, ["root", "encoded", "authority"]);
    if (request.authority !== "structural_candidate" || typeof request.encoded !== "string") {
        return invalid();
    }
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.root, "owner_repository_economic_checkpoint_v3_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string")
        return invalid();
    const parsed = (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash);
    if (parsed.encoded !== request.encoded)
        return invalid();
    return parsed;
};
const assertClosedRoot = (root) => {
    const rootTransitions = root.walletCheckpointLagRootTransitions;
    const journalTransitions = root.journalSequence -
        root.walletCheckpointAnchor.checkpointJournalSequence;
    const rollovers = rootTransitions - journalTransitions;
    if (!root.walletCheckpointPromotionRequired || rootTransitions < 1 ||
        rootTransitions > 16 || journalTransitions < 0 ||
        journalTransitions > rootTransitions || rollovers < 0 || rollovers > 1 ||
        (rootTransitions !== 16 && rollovers !== 1))
        return invalid();
    return { rootTransitions, journalTransitions, rollovers };
};
const parseManifest = async (accountScopeHash, indexKind, blob, resolveNode) => {
    const supplied = readRecord(blob, ["ref", "encoded"]);
    return (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
        accountScopeHash,
        indexKind,
        ref: supplied.ref,
        raw: supplied.encoded,
        resolveNode,
    });
};
const loadProjection = async (input) => {
    const walletBlob = readRecord(input.walletStateBlob, ["ref", "encoded"]);
    const courseBlob = readRecord(input.courseManifestBlob, ["ref", "encoded"]);
    const cache = new Map();
    let reads = 0;
    let bytes = 0;
    const resolveNode = async (ref) => {
        if (cache.has(ref.blobKey))
            return cache.get(ref.blobKey);
        if (reads >= MAX_EXTERNAL_READS)
            return overflow();
        let raw;
        try {
            raw = await input.resolveNode(ref);
        }
        catch {
            return indeterminate();
        }
        reads += 1;
        if (typeof raw === "string") {
            bytes = checkedAdd(bytes, (0, decision_registry_1.utf8ByteLengthV1)(raw));
            if (bytes > MAX_EXTERNAL_BYTES)
                return overflow();
        }
        cache.set(ref.blobKey, raw);
        return raw;
    };
    try {
        const wallet = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash: input.root.accountScopeHash,
            ref: walletBlob.ref,
            raw: walletBlob.encoded,
        });
        const course = await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
            accountScopeHash: input.root.accountScopeHash,
            ref: courseBlob.ref,
            raw: courseBlob.encoded,
            resolveNode,
        });
        const operation = await parseManifest(input.root.accountScopeHash, "operation", input.operationManifestBlob, resolveNode);
        const subject = await parseManifest(input.root.accountScopeHash, "subject", input.subjectManifestBlob, resolveNode);
        const receipt = await parseManifest(input.root.accountScopeHash, "receipt", input.receiptManifestBlob, resolveNode);
        if (!same(wallet.blob.ref, input.root.walletStateRef) ||
            !same(course.manifestBlob.ref, input.root.courseStateManifestRef) ||
            !same(operation.sourceManifestBlob.ref, input.root.operationIndexManifestRef) ||
            !same(subject.sourceManifestBlob.ref, input.root.subjectIndexManifestRef) ||
            !same(receipt.sourceManifestBlob.ref, input.root.receiptIndexManifestRef) ||
            course.manifest.entryCount !== 0 || operation.legacy || subject.legacy || receipt.legacy) {
            return mismatch();
        }
        const walletCreditCount = wallet.state.revision;
        if (subject.manifest.entryCount !== walletCreditCount ||
            receipt.manifest.entryCount !== walletCreditCount ||
            operation.manifest.entryCount % 2 !== 0)
            return mismatch();
        const canonicalOperationEntries = checkedDouble(walletCreditCount);
        if (operation.manifest.entryCount < canonicalOperationEntries)
            return mismatch();
        const operationAliasCount = (operation.manifest.entryCount - canonicalOperationEntries) / 2;
        if (!safe(operationAliasCount))
            return mismatch();
        const usedJournal = checkedAdd(walletCreditCount, operationAliasCount);
        if (usedJournal > input.root.journalSequence)
            return mismatch();
        const missingIndexRepairCount = input.root.journalSequence - usedJournal;
        return deepFreeze({
            wallet,
            operationEntryCount: operation.manifest.entryCount,
            subjectEntryCount: subject.manifest.entryCount,
            receiptEntryCount: receipt.manifest.entryCount,
            walletCreditCount,
            operationAliasCount,
            missingIndexRepairCount,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message === "owner_repository_economic_checkpoint_v3_mismatch" ||
                error.message === "owner_repository_economic_checkpoint_v3_overflow"))
            throw error;
        return indeterminate();
    }
};
const materializeBody = (body) => {
    const checkpoint = deepFreeze({
        ...body,
        checkpointFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)),
    });
    const encoded = (0, decision_registry_1.canonicalJsonV1)(checkpoint);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BYTES)
        return overflow();
    const result = deepFreeze({
        checkpoint,
        key: (0, exports.ownerRepositoryEconomicCheckpointV3Key)(checkpoint.accountScopeHash, checkpoint.checkpointRootFingerprint),
        encoded,
        authority: "structural_candidate",
    });
    CHECKPOINTS.add(result);
    return result;
};
const previousCounts = (root, previous) => {
    const anchor = root.walletCheckpointAnchor;
    if (anchor.checkpointSchemaVersion ===
        "learning-v2-owner-repository-economic-checkpoint.v3") {
        if (!isRecord(previous) || !CHECKPOINTS.has(previous) ||
            !PROJECTION_MATCHED.has(previous))
            return invalid();
        const materialization = previous;
        const checkpoint = materialization.checkpoint;
        if (materialization.key !== anchor.checkpointKey ||
            checkpoint.checkpointFingerprint !== anchor.checkpointFingerprint ||
            checkpoint.checkpointRootFingerprint !== anchor.checkpointRootFingerprint ||
            checkpoint.currentGeneration !== anchor.checkpointCurrentGeneration ||
            checkpoint.repositoryRevision !== anchor.checkpointRepositoryRevision ||
            checkpoint.journalSequence !== anchor.checkpointJournalSequence)
            return mismatch();
        return {
            walletCreditCount: checkpoint.walletCreditCount,
            operationAliasCount: checkpoint.operationAliasCount,
            missingIndexRepairCount: checkpoint.missingIndexRepairCount,
        };
    }
    if (previous !== null)
        return invalid();
    return {
        walletCreditCount: anchor.checkpointJournalSequence,
        operationAliasCount: 0,
        missingIndexRepairCount: 0,
    };
};
/**
 * Materializes a deterministic mixed checkpoint from exact current projections.
 * The result is structural only; bounded journal-history admission remains a
 * repository-owned prerequisite for persistence/CAS.
 */
const materializeOwnerRepositoryEconomicCheckpointV3 = async (input) => {
    const request = readRecord(input, [
        "checkpointRoot", "previousCheckpoint", "walletStateBlob",
        "courseManifestBlob", "operationManifestBlob", "subjectManifestBlob",
        "receiptManifestBlob", "resolveNode",
    ]);
    if (typeof request.resolveNode !== "function")
        return invalid();
    const rootCandidate = parseRootMaterialization(request.checkpointRoot);
    const root = rootCandidate.root;
    const window = assertClosedRoot(root);
    let projection;
    try {
        projection = await loadProjection({
            root,
            walletStateBlob: request.walletStateBlob,
            courseManifestBlob: request.courseManifestBlob,
            operationManifestBlob: request.operationManifestBlob,
            subjectManifestBlob: request.subjectManifestBlob,
            receiptManifestBlob: request.receiptManifestBlob,
            resolveNode: request.resolveNode,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message === "owner_repository_economic_checkpoint_v3_mismatch" ||
                error.message === "owner_repository_economic_checkpoint_v3_overflow"))
            throw error;
        return indeterminate();
    }
    const prior = previousCounts(root, request.previousCheckpoint);
    const walletCreditTransitions = projection.walletCreditCount - prior.walletCreditCount;
    const operationAliasTransitions = projection.operationAliasCount - prior.operationAliasCount;
    const missingIndexRepairTransitions = projection.missingIndexRepairCount - prior.missingIndexRepairCount;
    if (![walletCreditTransitions, operationAliasTransitions, missingIndexRepairTransitions]
        .every((value) => safe(value)) ||
        checkedAdd(checkedAdd(walletCreditTransitions, operationAliasTransitions), missingIndexRepairTransitions) !== window.journalTransitions)
        return mismatch();
    const body = {
        schemaVersion: "learning-v2-owner-repository-economic-checkpoint.v3",
        checkpointKind: "economic_mixed",
        accountScopeHash: root.accountScopeHash,
        checkpointRoot: root,
        checkpointRootFingerprint: root.rootFingerprint,
        previousCheckpointAnchor: root.walletCheckpointAnchor,
        currentGeneration: root.currentGeneration,
        repositoryRevision: root.repositoryRevision,
        journalSequence: root.journalSequence,
        windowRootTransitions: window.rootTransitions,
        walletCreditTransitions,
        operationAliasTransitions,
        missingIndexRepairTransitions,
        generationRolloverTransitions: window.rollovers,
        walletStateFingerprint: projection.wallet.state.stateFingerprint,
        walletRevision: projection.wallet.state.revision,
        walletCreditCount: projection.walletCreditCount,
        operationAliasCount: projection.operationAliasCount,
        missingIndexRepairCount: projection.missingIndexRepairCount,
        operationEntryCount: projection.operationEntryCount,
        subjectEntryCount: projection.subjectEntryCount,
        receiptEntryCount: projection.receiptEntryCount,
    };
    const created = materializeBody(body);
    PROJECTION_MATCHED.add(created);
    return created;
};
exports.materializeOwnerRepositoryEconomicCheckpointV3 = materializeOwnerRepositoryEconomicCheckpointV3;
/**
 * Strict storage parser plus exact current-projection match. History kinds are
 * still verified separately by the bounded repository window fold.
 */
const parseOwnerRepositoryEconomicCheckpointV3 = async (input) => {
    let request;
    try {
        request = readRecord(input, [
            "accountScopeHash", "checkpointRoot", "key", "raw", "walletStateBlob",
            "courseManifestBlob", "operationManifestBlob", "subjectManifestBlob",
            "receiptManifestBlob", "resolveNode",
        ]);
    }
    catch {
        return indeterminate();
    }
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) || typeof request.key !== "string" ||
        typeof request.raw !== "string" || typeof request.resolveNode !== "function") {
        return indeterminate();
    }
    let root;
    let detached;
    try {
        const detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.checkpointRoot, "owner_repository_economic_checkpoint_v3_indeterminate");
        if (!isRecord(detachedRoot))
            return indeterminate();
        root = (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3)(detachedRoot, request.accountScopeHash).root;
        assertClosedRoot(root);
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MAX_BYTES)
            return indeterminate();
        detached = (0, wallet_1.detachBoundedWalletJson)(JSON.parse(request.raw), "owner_repository_economic_checkpoint_v3_indeterminate");
        if ((0, decision_registry_1.canonicalJsonV1)(detached) !== request.raw)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    if (!isRecord(detached) || !KEYS.every((key) => Object.prototype.hasOwnProperty.call(detached, key)) ||
        Reflect.ownKeys(detached).length !== KEYS.length ||
        detached.schemaVersion !== "learning-v2-owner-repository-economic-checkpoint.v3" ||
        detached.checkpointKind !== "economic_mixed" ||
        detached.accountScopeHash !== request.accountScopeHash ||
        typeof detached.checkpointRootFingerprint !== "string" ||
        !HASH.test(detached.checkpointRootFingerprint) ||
        typeof detached.walletStateFingerprint !== "string" ||
        !HASH.test(detached.walletStateFingerprint) ||
        typeof detached.checkpointFingerprint !== "string" ||
        !HASH.test(detached.checkpointFingerprint))
        return indeterminate();
    const numberKeys = [
        "currentGeneration", "repositoryRevision", "journalSequence",
        "windowRootTransitions", "walletCreditTransitions",
        "operationAliasTransitions", "missingIndexRepairTransitions",
        "generationRolloverTransitions", "walletRevision", "walletCreditCount",
        "operationAliasCount", "missingIndexRepairCount", "operationEntryCount",
        "subjectEntryCount", "receiptEntryCount",
    ];
    if (numberKeys.some((key) => !safe(detached[key])))
        return indeterminate();
    let projection;
    try {
        projection = await loadProjection({
            root,
            walletStateBlob: request.walletStateBlob,
            courseManifestBlob: request.courseManifestBlob,
            operationManifestBlob: request.operationManifestBlob,
            subjectManifestBlob: request.subjectManifestBlob,
            receiptManifestBlob: request.receiptManifestBlob,
            resolveNode: request.resolveNode,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_repository_economic_checkpoint_v3_overflow")
            throw error;
        return indeterminate();
    }
    const window = assertClosedRoot(root);
    if (!same(detached.checkpointRoot, root) ||
        !same(detached.previousCheckpointAnchor, root.walletCheckpointAnchor) ||
        detached.checkpointRootFingerprint !== root.rootFingerprint ||
        detached.currentGeneration !== root.currentGeneration ||
        detached.repositoryRevision !== root.repositoryRevision ||
        detached.journalSequence !== root.journalSequence ||
        detached.windowRootTransitions !== window.rootTransitions ||
        detached.generationRolloverTransitions !== window.rollovers ||
        checkedAdd(checkedAdd(Number(detached.walletCreditTransitions), Number(detached.operationAliasTransitions)), Number(detached.missingIndexRepairTransitions)) !== window.journalTransitions ||
        detached.walletStateFingerprint !== projection.wallet.state.stateFingerprint ||
        detached.walletRevision !== projection.wallet.state.revision ||
        detached.walletCreditCount !== projection.walletCreditCount ||
        detached.operationAliasCount !== projection.operationAliasCount ||
        detached.missingIndexRepairCount !== projection.missingIndexRepairCount ||
        detached.operationEntryCount !== projection.operationEntryCount ||
        detached.subjectEntryCount !== projection.subjectEntryCount ||
        detached.receiptEntryCount !== projection.receiptEntryCount ||
        request.key !== (0, exports.ownerRepositoryEconomicCheckpointV3Key)(root.accountScopeHash, root.rootFingerprint))
        return indeterminate();
    const body = { ...detached };
    delete body.checkpointFingerprint;
    if ((0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)) !== detached.checkpointFingerprint) {
        return indeterminate();
    }
    const result = deepFreeze({
        checkpoint: detached,
        key: request.key,
        encoded: request.raw,
        authority: "structural_candidate",
    });
    CHECKPOINTS.add(result);
    PROJECTION_MATCHED.add(result);
    return result;
};
exports.parseOwnerRepositoryEconomicCheckpointV3 = parseOwnerRepositoryEconomicCheckpointV3;
/** Converts only an exact projection-matched mixed checkpoint into an anchor. */
const createOwnerRepositoryEconomicCheckpointV3AnchorCandidate = (input) => {
    const request = readRecord(input, ["checkpoint"]);
    if (!isRecord(request.checkpoint) || !CHECKPOINTS.has(request.checkpoint) ||
        !PROJECTION_MATCHED.has(request.checkpoint))
        return invalid();
    const materialization = request.checkpoint;
    const checkpoint = materialization.checkpoint;
    return (0, owner_repository_root_v3_1.materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate)({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
        checkpointSchemaVersion: "learning-v2-owner-repository-economic-checkpoint.v3",
        checkpointKind: "economic_mixed",
        accountScopeHash: checkpoint.accountScopeHash,
        checkpointKey: materialization.key,
        checkpointRootFingerprint: checkpoint.checkpointRootFingerprint,
        checkpointFingerprint: checkpoint.checkpointFingerprint,
        checkpointCurrentGeneration: checkpoint.currentGeneration,
        checkpointRepositoryRevision: checkpoint.repositoryRevision,
        checkpointJournalSequence: checkpoint.journalSequence,
        bootstrapOrigin: null,
    });
};
exports.createOwnerRepositoryEconomicCheckpointV3AnchorCandidate = createOwnerRepositoryEconomicCheckpointV3AnchorCandidate;
const isOwnerRepositoryEconomicCheckpointV3ProjectionMatched = (input) => isRecord(input) && CHECKPOINTS.has(input) && PROJECTION_MATCHED.has(input);
exports.isOwnerRepositoryEconomicCheckpointV3ProjectionMatched = isOwnerRepositoryEconomicCheckpointV3ProjectionMatched;
//# sourceMappingURL=owner_repository_economic_checkpoint_v3.js.map