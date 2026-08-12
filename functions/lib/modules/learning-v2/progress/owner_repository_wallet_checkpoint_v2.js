"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnerRepositoryWalletCheckpointV2ProjectionMatched = exports.createOwnerRepositoryWalletCheckpointV2AnchorCandidate = exports.materializeOwnerRepositoryWalletCheckpointV2 = exports.matchOwnerRepositoryWalletCheckpointV2Projection = exports.parseOwnerRepositoryWalletCheckpointV2 = exports.ownerRepositoryWalletCheckpointV2Key = void 0;
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
    "schemaVersion",
    "checkpointKind",
    "accountScopeHash",
    "checkpointRoot",
    "checkpointRootFingerprint",
    "previousCheckpointAnchor",
    "currentGeneration",
    "repositoryRevision",
    "journalSequence",
    "windowRootTransitions",
    "walletCreditTransitions",
    "generationRolloverTransitions",
    "walletStateFingerprint",
    "walletRevision",
    "canonicalEffectCount",
    "operationEntryCount",
    "subjectEntryCount",
    "receiptEntryCount",
    "checkpointFingerprint",
];
const CHECKPOINTS = new WeakSet();
const PROJECTION_MATCHED = new WeakSet();
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_wallet_checkpoint_v2_invalid");
};
const mismatch = () => {
    throw new Error("owner_repository_wallet_checkpoint_v2_mismatch");
};
const indeterminate = () => {
    throw new Error("owner_repository_wallet_checkpoint_v2_indeterminate");
};
const overflow = () => {
    throw new Error("owner_repository_wallet_checkpoint_v2_overflow");
};
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const checkedAdd = (left, right) => {
    const result = left + right;
    if (!Number.isSafeInteger(result))
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
    if (ownKeys.length !== keys.length ||
        ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)) ||
        keys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        }))
        return invalid();
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const ownerRepositoryWalletCheckpointV2Key = (accountScopeHash, rootFingerprint) => {
    if (typeof accountScopeHash !== "string" ||
        !ACCOUNT.test(accountScopeHash) ||
        typeof rootFingerprint !== "string" ||
        !HASH.test(rootFingerprint))
        return invalid();
    return `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${rootFingerprint}`;
};
exports.ownerRepositoryWalletCheckpointV2Key = ownerRepositoryWalletCheckpointV2Key;
const parseRootCandidate = (input) => {
    const request = readRecord(input, ["root", "encoded", "authority"]);
    if (request.authority !== "structural_candidate" ||
        typeof request.encoded !== "string") {
        return invalid();
    }
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(request.root, "owner_repository_wallet_checkpoint_v2_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detached) || typeof detached.accountScopeHash !== "string")
        return invalid();
    let parsed;
    try {
        parsed = (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3)(detached, detached.accountScopeHash);
    }
    catch {
        return invalid();
    }
    if (parsed.encoded !== request.encoded)
        return invalid();
    return parsed;
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
        key: (0, exports.ownerRepositoryWalletCheckpointV2Key)(checkpoint.accountScopeHash, checkpoint.checkpointRootFingerprint),
        encoded,
        authority: "structural_candidate",
    });
    CHECKPOINTS.add(result);
    return result;
};
const assertClosedRoot = (root) => {
    const rootTransitions = root.repositoryRevision -
        root.walletCheckpointAnchor.checkpointRepositoryRevision;
    const walletCredits = root.journalSequence -
        root.walletCheckpointAnchor.checkpointJournalSequence;
    const rollovers = rootTransitions - walletCredits;
    if (!root.walletCheckpointPromotionRequired ||
        rootTransitions < 1 ||
        rootTransitions > 16 ||
        walletCredits < 0 ||
        walletCredits > rootTransitions ||
        rollovers < 0 ||
        rollovers > 1 ||
        root.walletCheckpointLagRootTransitions !== rootTransitions ||
        (rootTransitions !== 16 && rollovers !== 1))
        return invalid();
    return { rootTransitions, walletCredits, rollovers };
};
/** Structural parser only; it does not admit checkpoint ancestry or current storage authority. */
const parseOwnerRepositoryWalletCheckpointV2 = (input) => {
    let request;
    try {
        request = readRecord(input, [
            "accountScopeHash",
            "checkpointRoot",
            "key",
            "raw",
            "walletStateBlob",
        ]);
    }
    catch {
        return indeterminate();
    }
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.key !== "string" ||
        typeof request.raw !== "string")
        return indeterminate();
    let detachedRoot;
    let root;
    let wallet;
    try {
        detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.checkpointRoot, "owner_repository_wallet_checkpoint_v2_indeterminate");
        if (!isRecord(detachedRoot))
            return indeterminate();
        root = (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3)(detachedRoot, request.accountScopeHash).root;
        const suppliedWallet = readRecord(request.walletStateBlob, [
            "ref",
            "encoded",
        ]);
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
        detached = (0, wallet_1.detachBoundedWalletJson)(JSON.parse(request.raw), "owner_repository_wallet_checkpoint_v2_indeterminate");
        if ((0, decision_registry_1.canonicalJsonV1)(detached) !== request.raw)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    if (!isRecord(detached) ||
        Reflect.ownKeys(detached).length !== KEYS.length ||
        !Reflect.ownKeys(detached).every((key) => typeof key === "string" && KEYS.includes(key)) ||
        detached.schemaVersion !==
            "learning-v2-owner-repository-wallet-checkpoint.v2" ||
        detached.checkpointKind !== "wallet_credit_only" ||
        detached.accountScopeHash !== request.accountScopeHash ||
        typeof detached.checkpointRootFingerprint !== "string" ||
        !HASH.test(detached.checkpointRootFingerprint) ||
        typeof detached.walletStateFingerprint !== "string" ||
        !HASH.test(detached.walletStateFingerprint) ||
        typeof detached.checkpointFingerprint !== "string" ||
        !HASH.test(detached.checkpointFingerprint))
        return indeterminate();
    const numbers = [
        "currentGeneration",
        "repositoryRevision",
        "journalSequence",
        "windowRootTransitions",
        "walletCreditTransitions",
        "generationRolloverTransitions",
        "walletRevision",
        "canonicalEffectCount",
        "operationEntryCount",
        "subjectEntryCount",
        "receiptEntryCount",
    ];
    if (numbers.some((key) => !safe(detached[key])))
        return indeterminate();
    let window;
    let expectedOperationEntryCount;
    try {
        window = assertClosedRoot(root);
        expectedOperationEntryCount = checkedDouble(root.journalSequence);
    }
    catch {
        return indeterminate();
    }
    const canonicalEffectCount = root.journalSequence;
    if (!same(detached.checkpointRoot, root) ||
        !same(detached.previousCheckpointAnchor, root.walletCheckpointAnchor) ||
        detached.checkpointRootFingerprint !== root.rootFingerprint ||
        detached.currentGeneration !== root.currentGeneration ||
        detached.repositoryRevision !== root.repositoryRevision ||
        detached.journalSequence !== root.journalSequence ||
        detached.windowRootTransitions !== window.rootTransitions ||
        detached.walletCreditTransitions !== window.walletCredits ||
        detached.generationRolloverTransitions !== window.rollovers ||
        detached.walletStateFingerprint !== wallet.state.stateFingerprint ||
        detached.walletRevision !== wallet.state.revision ||
        detached.walletRevision !== root.journalSequence ||
        detached.canonicalEffectCount !== canonicalEffectCount ||
        detached.operationEntryCount !== expectedOperationEntryCount ||
        detached.subjectEntryCount !== canonicalEffectCount ||
        detached.receiptEntryCount !== canonicalEffectCount ||
        request.key !==
            (0, exports.ownerRepositoryWalletCheckpointV2Key)(root.accountScopeHash, root.rootFingerprint)) {
        return indeterminate();
    }
    const body = { ...detached };
    delete body.checkpointFingerprint;
    if ((0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)) !== detached.checkpointFingerprint)
        return indeterminate();
    const result = deepFreeze({
        checkpoint: detached,
        key: request.key,
        encoded: request.raw,
        authority: "structural_candidate",
    });
    CHECKPOINTS.add(result);
    return result;
};
exports.parseOwnerRepositoryWalletCheckpointV2 = parseOwnerRepositoryWalletCheckpointV2;
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
/** Exact current projection match; still not a durable ancestry/storage admission. */
const matchOwnerRepositoryWalletCheckpointV2Projection = async (input) => {
    const request = readRecord(input, [
        "checkpoint",
        "walletStateBlob",
        "courseManifestBlob",
        "operationManifestBlob",
        "subjectManifestBlob",
        "receiptManifestBlob",
        "resolveNode",
    ]);
    if (!isRecord(request.checkpoint) ||
        !CHECKPOINTS.has(request.checkpoint) ||
        typeof request.resolveNode !== "function")
        return invalid();
    const checkpoint = request.checkpoint;
    const root = checkpoint.checkpoint.checkpointRoot;
    const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
    const courseBlob = readRecord(request.courseManifestBlob, ["ref", "encoded"]);
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
            raw = await request.resolveNode(ref);
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
            accountScopeHash: root.accountScopeHash,
            ref: walletBlob.ref,
            raw: walletBlob.encoded,
        });
        const course = await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: courseBlob.ref,
            raw: courseBlob.encoded,
            resolveNode,
        });
        const operation = await parseManifest(root.accountScopeHash, "operation", request.operationManifestBlob, resolveNode);
        const subject = await parseManifest(root.accountScopeHash, "subject", request.subjectManifestBlob, resolveNode);
        const receipt = await parseManifest(root.accountScopeHash, "receipt", request.receiptManifestBlob, resolveNode);
        const expected = checkpoint.checkpoint;
        if (!same(wallet.blob.ref, root.walletStateRef) ||
            !same(course.manifestBlob.ref, root.courseStateManifestRef) ||
            !same(operation.sourceManifestBlob.ref, root.operationIndexManifestRef) ||
            !same(subject.sourceManifestBlob.ref, root.subjectIndexManifestRef) ||
            !same(receipt.sourceManifestBlob.ref, root.receiptIndexManifestRef) ||
            wallet.state.stateFingerprint !== expected.walletStateFingerprint ||
            wallet.state.revision !== expected.walletRevision ||
            course.manifest.entryCount !== 0 ||
            operation.manifest.entryCount !== expected.operationEntryCount ||
            subject.manifest.entryCount !== expected.subjectEntryCount ||
            receipt.manifest.entryCount !== expected.receiptEntryCount)
            return mismatch();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("overflow"))
            throw error;
        return indeterminate();
    }
    PROJECTION_MATCHED.add(checkpoint);
    return checkpoint;
};
exports.matchOwnerRepositoryWalletCheckpointV2Projection = matchOwnerRepositoryWalletCheckpointV2Projection;
/**
 * Materializes and immediately projection-matches a closed RootV3 checkpoint candidate.
 * The result is still structural-only until the future bounded history verifier admits it.
 */
const materializeOwnerRepositoryWalletCheckpointV2 = async (input) => {
    const request = readRecord(input, [
        "checkpointRoot",
        "walletStateBlob",
        "courseManifestBlob",
        "operationManifestBlob",
        "subjectManifestBlob",
        "receiptManifestBlob",
        "resolveNode",
    ]);
    const rootCandidate = parseRootCandidate(request.checkpointRoot);
    const root = rootCandidate.root;
    const window = assertClosedRoot(root);
    const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
    let wallet;
    try {
        wallet = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: walletBlob.ref,
            raw: walletBlob.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (!same(wallet.blob.ref, root.walletStateRef) ||
        wallet.state.revision !== root.journalSequence) {
        return mismatch();
    }
    const canonicalEffectCount = root.journalSequence;
    const created = materializeBody({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v2",
        checkpointKind: "wallet_credit_only",
        accountScopeHash: root.accountScopeHash,
        checkpointRoot: root,
        checkpointRootFingerprint: root.rootFingerprint,
        previousCheckpointAnchor: root.walletCheckpointAnchor,
        currentGeneration: root.currentGeneration,
        repositoryRevision: root.repositoryRevision,
        journalSequence: root.journalSequence,
        windowRootTransitions: window.rootTransitions,
        walletCreditTransitions: window.walletCredits,
        generationRolloverTransitions: window.rollovers,
        walletStateFingerprint: wallet.state.stateFingerprint,
        walletRevision: wallet.state.revision,
        canonicalEffectCount,
        operationEntryCount: checkedDouble(canonicalEffectCount),
        subjectEntryCount: canonicalEffectCount,
        receiptEntryCount: canonicalEffectCount,
    });
    const parsed = (0, exports.parseOwnerRepositoryWalletCheckpointV2)({
        accountScopeHash: root.accountScopeHash,
        checkpointRoot: root,
        key: created.key,
        raw: created.encoded,
        walletStateBlob: request.walletStateBlob,
    });
    return (0, exports.matchOwnerRepositoryWalletCheckpointV2Projection)({
        checkpoint: parsed,
        walletStateBlob: request.walletStateBlob,
        courseManifestBlob: request.courseManifestBlob,
        operationManifestBlob: request.operationManifestBlob,
        subjectManifestBlob: request.subjectManifestBlob,
        receiptManifestBlob: request.receiptManifestBlob,
        resolveNode: request.resolveNode,
    });
};
exports.materializeOwnerRepositoryWalletCheckpointV2 = materializeOwnerRepositoryWalletCheckpointV2;
/** Converts only an exact projection-matched Checkpoint V2 into a RootV3 anchor candidate. */
const createOwnerRepositoryWalletCheckpointV2AnchorCandidate = (input) => {
    const request = readRecord(input, ["checkpoint"]);
    if (!isRecord(request.checkpoint) ||
        !CHECKPOINTS.has(request.checkpoint) ||
        !PROJECTION_MATCHED.has(request.checkpoint))
        return invalid();
    const checkpoint = request.checkpoint;
    const value = checkpoint.checkpoint;
    return (0, owner_repository_root_v3_1.materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate)({
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
        checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v2",
        checkpointKind: "wallet_credit_only",
        accountScopeHash: value.accountScopeHash,
        checkpointKey: checkpoint.key,
        checkpointRootFingerprint: value.checkpointRootFingerprint,
        checkpointFingerprint: value.checkpointFingerprint,
        checkpointCurrentGeneration: value.currentGeneration,
        checkpointRepositoryRevision: value.repositoryRevision,
        checkpointJournalSequence: value.journalSequence,
        bootstrapOrigin: null,
    });
};
exports.createOwnerRepositoryWalletCheckpointV2AnchorCandidate = createOwnerRepositoryWalletCheckpointV2AnchorCandidate;
/** Runtime capability predicate for the future repository-window verifier. */
const isOwnerRepositoryWalletCheckpointV2ProjectionMatched = (value) => isRecord(value) && CHECKPOINTS.has(value) && PROJECTION_MATCHED.has(value);
exports.isOwnerRepositoryWalletCheckpointV2ProjectionMatched = isOwnerRepositoryWalletCheckpointV2ProjectionMatched;
//# sourceMappingURL=owner_repository_wallet_checkpoint_v2.js.map