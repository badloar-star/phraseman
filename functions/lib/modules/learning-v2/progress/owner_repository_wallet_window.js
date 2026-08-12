"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnerRepositoryWalletWindowVerifiedCandidate = exports.verifyOwnerRepositoryWalletWindow = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_economic_manifest_1 = require("./owner_repository_economic_manifest");
const owner_repository_economic_effect_v2_1 = require("./owner_repository_economic_effect_v2");
const owner_repository_course_unlock_effect_v2_1 = require("./owner_repository_course_unlock_effect_v2");
const owner_repository_course_unlock_plan_1 = require("./owner_repository_course_unlock_plan");
const owner_repository_economic_checkpoint_v3_1 = require("./owner_repository_economic_checkpoint_v3");
const owner_repository_root_fold_1 = require("./owner_repository_root_fold");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_root_v3_1 = require("./owner_repository_root_v3");
const owner_repository_wallet_credit_plan_1 = require("./owner_repository_wallet_credit_plan");
const owner_repository_wallet_blob_1 = require("./owner_repository_wallet_blob");
const wallet_reducer_1 = require("./wallet_reducer");
const owner_repository_wallet_checkpoint_1 = require("./owner_repository_wallet_checkpoint");
const owner_repository_wallet_checkpoint_v2_1 = require("./owner_repository_wallet_checkpoint_v2");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_ROOT_BYTES = 64 * 1024;
const MAX_READS = 4096;
const MAX_BYTES = 128 * 1024 * 1024;
const VERIFIED = new WeakSet();
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = () => {
    throw new Error("owner_repository_wallet_window_indeterminate");
};
const budget = () => {
    throw new Error("owner_repository_wallet_window_budget_exceeded");
};
const readRecord = (input, keys) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return fail();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length ||
        own.some((key) => typeof key !== "string" || !keys.includes(key)) ||
        keys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        }))
        return fail();
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const historyKey = (account, fingerprint) => `learning_v2_owner_repository:v1:${account}:root-history:${fingerprint}`;
const isWalletCreditEffectV2 = (journal) => journal.record.schemaVersion ===
    "learning-v2-owner-repository-wallet-credit-effect-record.v2";
const isOperationAliasV2 = (journal) => journal.record.schemaVersion ===
    "learning-v2-owner-repository-operation-alias-record.v2";
const isCourseUnlockEffectV2 = (journal) => journal.record.schemaVersion ===
    "learning-v2-owner-repository-course-unlock-effect-record.v2";
const parseRootRaw = (raw, account) => {
    if (typeof raw !== "string" || (0, decision_registry_1.utf8ByteLengthV1)(raw) > MAX_ROOT_BYTES)
        return fail();
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return fail();
    }
    if (!isRecord(parsed))
        return fail();
    try {
        if (parsed.schemaVersion === "learning-v2-owner-repository-root.v3") {
            return (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3Raw)(raw, account).root;
        }
        if (parsed.schemaVersion === "learning-v2-owner-repository-root.v2") {
            return (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(raw, account).root;
        }
    }
    catch {
        return fail();
    }
    return fail();
};
const refBlob = async (ref, resolve) => ({ ref, encoded: await resolve(ref.blobKey) });
const assertTransition = async (parent, child, resolve) => {
    if (child.accountScopeHash !== parent.accountScopeHash ||
        child.previousRootFingerprint !== parent.rootFingerprint ||
        child.repositoryRevision !== parent.repositoryRevision + 1)
        return fail();
    if (parent.schemaVersion === "learning-v2-owner-repository-root.v3") {
        if (child.schemaVersion !== "learning-v2-owner-repository-root.v3")
            return fail();
        if (!parent.walletCheckpointPromotionRequired) {
            if (!same(child.walletCheckpointAnchor, parent.walletCheckpointAnchor))
                return fail();
        }
        else if ((child.walletCheckpointAnchor.checkpointSchemaVersion !==
            "learning-v2-owner-repository-wallet-checkpoint.v2" &&
            child.walletCheckpointAnchor.checkpointSchemaVersion !==
                "learning-v2-owner-repository-economic-checkpoint.v3") ||
            child.walletCheckpointAnchor.checkpointRootFingerprint !==
                parent.rootFingerprint ||
            child.walletCheckpointAnchor.checkpointRepositoryRevision !==
                parent.repositoryRevision ||
            child.walletCheckpointAnchor.checkpointJournalSequence !==
                parent.journalSequence ||
            child.walletCheckpointAnchor.checkpointCurrentGeneration !==
                parent.currentGeneration) {
            return fail();
        }
    }
    else if (child.schemaVersion === "learning-v2-owner-repository-root.v3") {
        const expectedAnchorRootFingerprint = parent.journalSequence === 0
            ? parent.rootFingerprint
            : parent.previousRootFingerprint;
        const expectedAnchorRevision = parent.journalSequence === 0
            ? parent.repositoryRevision
            : parent.repositoryRevision - 1;
        if ((parent.journalSequence !== 0 && parent.journalSequence !== 1) ||
            expectedAnchorRootFingerprint === null ||
            child.walletCheckpointAnchor.checkpointSchemaVersion !==
                "learning-v2-owner-repository-wallet-checkpoint.v1" ||
            child.walletCheckpointAnchor.accountScopeHash !==
                parent.accountScopeHash ||
            child.walletCheckpointAnchor.checkpointRootFingerprint !==
                expectedAnchorRootFingerprint ||
            child.walletCheckpointAnchor.checkpointRepositoryRevision !==
                expectedAnchorRevision ||
            child.walletCheckpointAnchor.checkpointJournalSequence !== 0 ||
            child.walletCheckpointAnchor.checkpointCurrentGeneration !==
                parent.currentGeneration) {
            return fail();
        }
    }
    const sequenceDelta = child.journalSequence - parent.journalSequence;
    if (sequenceDelta === 0) {
        if (child.currentGeneration <= parent.currentGeneration ||
            !same(child.journalHeadRef, parent.journalHeadRef) ||
            !same(child.walletStateRef, parent.walletStateRef) ||
            !same(child.courseStateManifestRef, parent.courseStateManifestRef) ||
            !same(child.operationIndexManifestRef, parent.operationIndexManifestRef) ||
            !same(child.subjectIndexManifestRef, parent.subjectIndexManifestRef) ||
            !same(child.receiptIndexManifestRef, parent.receiptIndexManifestRef))
            return fail();
        return null;
    }
    if (sequenceDelta !== 1 ||
        child.currentGeneration !== parent.currentGeneration ||
        child.journalHeadRef === null)
        return fail();
    let journal;
    const journalRaw = await resolve(child.journalHeadRef.blobKey);
    try {
        journal = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
            accountScopeHash: child.accountScopeHash,
            ref: child.journalHeadRef,
            raw: journalRaw,
        });
    }
    catch {
        try {
            journal = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryWalletCreditEffectRecordBlobV2)({
                accountScopeHash: child.accountScopeHash,
                ref: child.journalHeadRef,
                raw: journalRaw,
            });
        }
        catch {
            try {
                journal = (0, owner_repository_course_unlock_effect_v2_1.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2)({
                    accountScopeHash: child.accountScopeHash,
                    ref: child.journalHeadRef,
                    raw: journalRaw,
                });
            }
            catch {
                try {
                    journal = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryOperationAliasRecordBlobV2)({
                        accountScopeHash: child.accountScopeHash,
                        ref: child.journalHeadRef,
                        raw: journalRaw,
                    });
                }
                catch {
                    return fail();
                }
            }
        }
    }
    const record = journal.record;
    if (record.repositoryRevisionBefore !== parent.repositoryRevision ||
        record.rootBeforeFingerprint !== parent.rootFingerprint ||
        record.journalSequence !== child.journalSequence ||
        record.acceptedAccountGeneration !== child.currentGeneration ||
        !same(record.previousJournalRecordRef, parent.journalHeadRef))
        return fail();
    if (isCourseUnlockEffectV2(journal)) {
        const effectRecord = journal.record;
        if (!same(effectRecord.walletStateBeforeRef, parent.walletStateRef) ||
            !same(effectRecord.walletStateAfterRef, child.walletStateRef) ||
            !same(effectRecord.courseStateManifestBeforeRef, parent.courseStateManifestRef) ||
            !same(effectRecord.courseStateManifestAfterRef, child.courseStateManifestRef) ||
            !same(effectRecord.operationIndexManifestBeforeRef, parent.operationIndexManifestRef) ||
            !same(effectRecord.subjectIndexManifestBeforeRef, parent.subjectIndexManifestRef) ||
            !same(effectRecord.receiptIndexManifestBeforeRef, parent.receiptIndexManifestRef)) {
            return fail();
        }
    }
    else if (!same(child.courseStateManifestRef, parent.courseStateManifestRef)) {
        return fail();
    }
    else if (isWalletCreditEffectV2(journal)) {
        const effectRecord = journal.record;
        if (!same(effectRecord.walletStateBeforeRef, parent.walletStateRef) ||
            !same(effectRecord.walletStateAfterRef, child.walletStateRef) ||
            !same(effectRecord.operationIndexManifestBeforeRef, parent.operationIndexManifestRef) ||
            !same(effectRecord.subjectIndexManifestBeforeRef, parent.subjectIndexManifestRef) ||
            !same(effectRecord.receiptIndexManifestBeforeRef, parent.receiptIndexManifestRef))
            return fail();
    }
    else if (isOperationAliasV2(journal)) {
        const aliasRecord = journal.record;
        if (!same(aliasRecord.walletStateRef, parent.walletStateRef) ||
            !same(child.walletStateRef, parent.walletStateRef) ||
            !same(aliasRecord.operationIndexManifestBeforeRef, parent.operationIndexManifestRef) ||
            !same(aliasRecord.operationIndexManifestAfterRef, child.operationIndexManifestRef) ||
            !same(aliasRecord.subjectIndexManifestRef, parent.subjectIndexManifestRef) ||
            !same(child.subjectIndexManifestRef, parent.subjectIndexManifestRef) ||
            !same(aliasRecord.receiptIndexManifestRef, parent.receiptIndexManifestRef) ||
            !same(child.receiptIndexManifestRef, parent.receiptIndexManifestRef)) {
            return fail();
        }
    }
    else if (journal.record.recordKind === "wallet_credit") {
        const legacyRecord = journal.record;
        if (!same(legacyRecord.walletStateBeforeRef, parent.walletStateRef) ||
            !same(legacyRecord.walletStateAfterRef, child.walletStateRef) ||
            !same(legacyRecord.operationIndexManifestBeforeRef, parent.operationIndexManifestRef) ||
            !same(legacyRecord.operationIndexManifestAfterRef, child.operationIndexManifestRef) ||
            !same(legacyRecord.subjectIndexManifestBeforeRef, parent.subjectIndexManifestRef) ||
            !same(legacyRecord.subjectIndexManifestAfterRef, child.subjectIndexManifestRef) ||
            !same(legacyRecord.receiptIndexManifestBeforeRef, parent.receiptIndexManifestRef) ||
            !same(legacyRecord.receiptIndexManifestAfterRef, child.receiptIndexManifestRef))
            return fail();
    }
    else if (journal.record.recordKind === "operation_alias") {
        const legacyRecord = journal.record;
        if (!same(legacyRecord.walletStateRef, parent.walletStateRef) ||
            !same(child.walletStateRef, parent.walletStateRef) ||
            !same(legacyRecord.operationIndexManifestBeforeRef, parent.operationIndexManifestRef) ||
            !same(legacyRecord.operationIndexManifestAfterRef, child.operationIndexManifestRef) ||
            !same(legacyRecord.subjectIndexManifestRef, parent.subjectIndexManifestRef) ||
            !same(child.subjectIndexManifestRef, parent.subjectIndexManifestRef) ||
            !same(legacyRecord.receiptIndexManifestRef, parent.receiptIndexManifestRef) ||
            !same(child.receiptIndexManifestRef, parent.receiptIndexManifestRef))
            return fail();
    }
    else if (journal.record.recordKind === "missing_index_entry") {
        const legacyRecord = journal.record;
        if (!same(legacyRecord.walletStateRef, parent.walletStateRef) ||
            !same(child.walletStateRef, parent.walletStateRef) ||
            !same(legacyRecord.operationIndexManifestBeforeRef, parent.operationIndexManifestRef) ||
            !same(legacyRecord.operationIndexManifestAfterRef, child.operationIndexManifestRef) ||
            !same(legacyRecord.subjectIndexManifestBeforeRef, parent.subjectIndexManifestRef) ||
            !same(legacyRecord.subjectIndexManifestAfterRef, child.subjectIndexManifestRef) ||
            !same(legacyRecord.receiptIndexManifestBeforeRef, parent.receiptIndexManifestRef) ||
            !same(legacyRecord.receiptIndexManifestAfterRef, child.receiptIndexManifestRef))
            return fail();
    }
    else
        return fail();
    return journal;
};
const parseEconomicManifest = async (accountScopeHash, indexKind, blob, resolveNode) => {
    if (typeof blob.encoded !== "string")
        return fail();
    try {
        return await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash,
            indexKind,
            ref: blob.ref,
            raw: blob.encoded,
            resolveNode,
        });
    }
    catch {
        return fail();
    }
};
const promotedAnchorForTransition = (transition) => {
    if (transition.parent.schemaVersion !== "learning-v2-owner-repository-root.v3" ||
        !transition.parent.walletCheckpointPromotionRequired)
        return null;
    if (transition.child.schemaVersion !== "learning-v2-owner-repository-root.v3") {
        return fail();
    }
    const anchor = transition.child.walletCheckpointAnchor;
    try {
        return anchor.checkpointSchemaVersion ===
            "learning-v2-owner-repository-economic-checkpoint.v3"
            ? (0, owner_repository_root_v3_1.materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate)(anchor)
            : (0, owner_repository_root_v3_1.materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate)(anchor);
    }
    catch {
        return fail();
    }
};
const assertCanonicalEffectReference = async (accountScopeHash, ref, embedded, resolve) => {
    let parsed;
    try {
        parsed = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
            accountScopeHash,
            ref,
            raw: await resolve(ref.blobKey),
        });
    }
    catch {
        return fail();
    }
    if (parsed.record.recordKind !== "wallet_credit" ||
        !same(parsed.record, embedded) || !same(parsed.blob.ref, ref))
        return fail();
};
const assertTailEconomics = async (transitions, starting, resolve, resolveNode) => {
    let wallet = starting.wallet;
    let course = starting.course;
    let operation = starting.operation;
    let subject = starting.subject;
    let receipt = starting.receipt;
    const seenJournalBlobKeys = new Set();
    if (starting.journalHeadRef !== null) {
        seenJournalBlobKeys.add(starting.journalHeadRef.blobKey);
    }
    for (const transition of transitions) {
        if (transition.journal === null)
            continue;
        const record = transition.journal.record;
        const promotedCheckpointAnchor = promotedAnchorForTransition(transition);
        if (isCourseUnlockEffectV2(transition.journal)) {
            if (transition.child.schemaVersion !==
                "learning-v2-owner-repository-root.v3") {
                return fail();
            }
            let adoptionBase;
            if (transition.parent.schemaVersion ===
                "learning-v2-owner-repository-root.v2") {
                if (transition.parent.repositoryRevision !== 0 ||
                    transition.parent.journalSequence !== 0 ||
                    starting.anchorCheckpoint.checkpoint.schemaVersion !==
                        "learning-v2-owner-repository-wallet-checkpoint.v1")
                    return fail();
                try {
                    const anchorCandidate = (0, owner_repository_root_v3_1.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate)({
                        checkpoint: starting.anchorCheckpoint,
                        checkpointRoot: transition.parent,
                        walletStateBlob: wallet,
                    });
                    adoptionBase = (0, owner_repository_root_v3_1.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2)({
                        rootBefore: (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(transition.parent, transition.parent.accountScopeHash),
                        checkpointAnchorCandidate: anchorCandidate,
                    });
                }
                catch {
                    return fail();
                }
            }
            let plan;
            try {
                plan = await (0, owner_repository_course_unlock_plan_1.planOwnerRepositoryCourseUnlock)({
                    accountScopeHash: transition.parent.accountScopeHash,
                    rootBefore: transition.parent,
                    walletStateBlob: wallet,
                    courseManifestBlob: course,
                    operationManifestBlob: operation,
                    subjectManifestBlob: subject,
                    receiptManifestBlob: receipt,
                    authorizedRequest: transition.journal.record.appliedReceipt.authorizedRequest,
                    resolveNode,
                    resolveBlob: (ref) => resolve(ref.blobKey),
                    ...(transition.parent.schemaVersion ===
                        "learning-v2-owner-repository-root.v2"
                        ? { adoptionBase }
                        : {}),
                });
            }
            catch {
                return fail();
            }
            if (plan.status !== "planned" ||
                !same(plan.journalRecordBlob, transition.journal) ||
                !same(plan.successorRoot.root, transition.child)) {
                return fail();
            }
            for (const blob of plan.immutableBlobs) {
                if ((await resolve(blob.ref.blobKey)) !== blob.encoded)
                    return fail();
            }
        }
        else if (isWalletCreditEffectV2(transition.journal)) {
            const effectRecord = transition.journal.record;
            if (transition.child.schemaVersion !==
                "learning-v2-owner-repository-root.v3")
                return fail();
            let walletBefore;
            let walletAfter;
            try {
                walletBefore = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
                    accountScopeHash: effectRecord.accountScopeHash,
                    ref: wallet.ref,
                    raw: wallet.encoded,
                });
                const rebuilt = (0, wallet_reducer_1.rebuildWalletStateFromAppliedReceipts)({
                    startingState: walletBefore.state,
                    canonicalAppliedReceipts: [effectRecord.appliedReceipt],
                });
                walletAfter = (0, owner_repository_wallet_blob_1.materializeOwnerRepositoryWalletStateBlob)(rebuilt);
            }
            catch {
                return fail();
            }
            const operationParsed = await parseEconomicManifest(effectRecord.accountScopeHash, "operation", operation, resolveNode);
            const subjectParsed = await parseEconomicManifest(effectRecord.accountScopeHash, "subject", subject, resolveNode);
            const receiptParsed = await parseEconomicManifest(effectRecord.accountScopeHash, "receipt", receipt, resolveNode);
            let closurePlan;
            try {
                closurePlan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryCanonicalEconomicClosureV2)({
                    accountScopeHash: effectRecord.accountScopeHash,
                    operationManifest: operationParsed.manifest,
                    subjectManifest: subjectParsed.manifest,
                    receiptManifest: receiptParsed.manifest,
                    journalRecordBlob: transition.journal,
                    resolveNode,
                });
            }
            catch {
                return fail();
            }
            if (!closurePlan.changed ||
                !same(walletAfter.blob.ref, transition.child.walletStateRef) ||
                !same(closurePlan.operationManifestBlob.ref, transition.child.operationIndexManifestRef) ||
                !same(closurePlan.subjectManifestBlob.ref, transition.child.subjectIndexManifestRef) ||
                !same(closurePlan.receiptManifestBlob.ref, transition.child.receiptIndexManifestRef) ||
                (await resolve(walletAfter.blob.ref.blobKey)) !==
                    walletAfter.blob.encoded ||
                (await resolve(closurePlan.operationManifestBlob.ref.blobKey)) !==
                    closurePlan.operationManifestBlob.encoded ||
                (await resolve(closurePlan.subjectManifestBlob.ref.blobKey)) !==
                    closurePlan.subjectManifestBlob.encoded ||
                (await resolve(closurePlan.receiptManifestBlob.ref.blobKey)) !==
                    closurePlan.receiptManifestBlob.encoded)
                return fail();
            for (const blob of closurePlan.immutableNodeBlobs) {
                if ((await resolve(blob.ref.blobKey)) !== blob.encoded)
                    return fail();
            }
            if (transition.parent.schemaVersion ===
                "learning-v2-owner-repository-root.v3") {
                let successor;
                try {
                    successor = (0, owner_repository_root_v3_1.bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3)({
                        rootBefore: transition.parent,
                        journalRecordBlob: transition.journal,
                        operationIndexManifestAfterRef: closurePlan.operationManifestBlob.ref,
                        subjectIndexManifestAfterRef: closurePlan.subjectManifestBlob.ref,
                        receiptIndexManifestAfterRef: closurePlan.receiptManifestBlob.ref,
                        promotedCheckpointAnchor,
                    });
                }
                catch {
                    return fail();
                }
                if (!same(successor.root, transition.child))
                    return fail();
            }
        }
        else if (isOperationAliasV2(transition.journal)) {
            const aliasRecord = transition.journal.record;
            const effectRef = aliasRecord.canonicalEffectBinding.canonicalEffectJournalRecordRef;
            if (!seenJournalBlobKeys.has(effectRef.blobKey))
                return fail();
            try {
                (0, owner_repository_economic_effect_v2_1.assertOwnerRepositoryCanonicalEffectBindingV2)({
                    effectBinding: aliasRecord.canonicalEffectBinding,
                    raw: await resolve(effectRef.blobKey),
                });
            }
            catch {
                return fail();
            }
            const operationParsed = await parseEconomicManifest(aliasRecord.accountScopeHash, "operation", operation, resolveNode);
            const subjectParsed = await parseEconomicManifest(aliasRecord.accountScopeHash, "subject", subject, resolveNode);
            const receiptParsed = await parseEconomicManifest(aliasRecord.accountScopeHash, "receipt", receipt, resolveNode);
            let aliasPlan;
            try {
                aliasPlan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryOperationAliasV2)({
                    accountScopeHash: aliasRecord.accountScopeHash,
                    operationManifest: operationParsed.manifest,
                    subjectManifest: subjectParsed.manifest,
                    receiptManifest: receiptParsed.manifest,
                    authorizedAliasOperation: aliasRecord.aliasValue.ledgerEntry.authorizedAliasOperation,
                    resolveNode,
                });
            }
            catch {
                return fail();
            }
            if (!aliasPlan.changed ||
                !same(aliasPlan.aliasValue, aliasRecord.aliasValue) ||
                !same(aliasPlan.operationManifestBlob.ref, transition.child.operationIndexManifestRef) ||
                (await resolve(aliasPlan.operationManifestBlob.ref.blobKey)) !==
                    aliasPlan.operationManifestBlob.encoded)
                return fail();
            for (const blob of aliasPlan.immutableNodeBlobs) {
                if ((await resolve(blob.ref.blobKey)) !== blob.encoded)
                    return fail();
            }
            let successor;
            try {
                successor = (0, owner_repository_root_v3_1.bindOwnerRepositoryOperationAliasV2SuccessorRootV3)({
                    rootBefore: transition.parent,
                    journalRecordBlob: transition.journal,
                    promotedCheckpointAnchor,
                });
            }
            catch {
                return fail();
            }
            if (!same(successor.root, transition.child))
                return fail();
        }
        else if (record.recordKind === "wallet_credit") {
            let plan;
            try {
                plan = await (0, owner_repository_wallet_credit_plan_1.planOwnerRepositoryWalletCredit)({
                    rootBefore: transition.parent,
                    walletStateBeforeBlob: wallet,
                    operationManifestBlob: operation,
                    subjectManifestBlob: subject,
                    receiptManifestBlob: receipt,
                    authorizedOperation: record.appliedReceipt.authorizedOperation,
                    resolveNode,
                    ...(transition.parent.schemaVersion ===
                        "learning-v2-owner-repository-root.v3"
                        ? { promotedCheckpointAnchor }
                        : {}),
                });
            }
            catch {
                return fail();
            }
            if (plan.status !== "applied" ||
                !same(plan.appliedReceipt, record.appliedReceipt) ||
                !same(plan.journalRecordBlob, transition.journal.blob) ||
                !same(plan.successorRoot.root.walletStateRef, transition.child.walletStateRef) ||
                !same(plan.successorRoot.root.operationIndexManifestRef, transition.child.operationIndexManifestRef) ||
                !same(plan.successorRoot.root.subjectIndexManifestRef, transition.child.subjectIndexManifestRef) ||
                !same(plan.successorRoot.root.receiptIndexManifestRef, transition.child.receiptIndexManifestRef))
                return fail();
            if (transition.parent.schemaVersion === "learning-v2-owner-repository-root.v3" &&
                (plan.successorRoot.root.schemaVersion !== "learning-v2-owner-repository-root.v3" ||
                    !same(plan.successorRoot.root, transition.child)))
                return fail();
            for (const blob of plan.immutableBlobs) {
                if ((await resolve(blob.ref.blobKey)) !== blob.encoded)
                    return fail();
            }
        }
        else if (record.recordKind === "operation_alias") {
            const legacyJournal = transition.journal;
            const legacyRecord = legacyJournal.record;
            if (legacyRecord.recordKind !== "operation_alias")
                return fail();
            await assertCanonicalEffectReference(legacyRecord.accountScopeHash, legacyRecord.canonicalEffectJournalRecordRef, legacyRecord.canonicalEffectRecord, resolve);
            const operationParsed = await parseEconomicManifest(legacyRecord.accountScopeHash, "operation", operation, resolveNode);
            const subjectParsed = await parseEconomicManifest(legacyRecord.accountScopeHash, "subject", subject, resolveNode);
            const receiptParsed = await parseEconomicManifest(legacyRecord.accountScopeHash, "receipt", receipt, resolveNode);
            let plan;
            try {
                plan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryOperationAlias)({
                    accountScopeHash: legacyRecord.accountScopeHash,
                    operationManifest: operationParsed.manifest,
                    subjectManifest: subjectParsed.manifest,
                    receiptManifest: receiptParsed.manifest,
                    authorizedAliasOperation: legacyRecord.aliasEntry.authorizedAliasOperation,
                    resolveNode,
                });
            }
            catch {
                return fail();
            }
            if (!plan.changed || !same(plan.aliasEntry, legacyRecord.aliasEntry) ||
                !same(plan.operationManifestBlob.ref, legacyRecord.operationIndexManifestAfterRef) ||
                (await resolve(plan.operationManifestBlob.ref.blobKey)) !==
                    plan.operationManifestBlob.encoded)
                return fail();
            for (const blob of plan.immutableNodeBlobs) {
                if ((await resolve(blob.ref.blobKey)) !== blob.encoded)
                    return fail();
            }
            if (transition.parent.schemaVersion === "learning-v2-owner-repository-root.v3") {
                let successor;
                try {
                    successor = (0, owner_repository_root_v3_1.bindOwnerRepositoryOperationAliasSuccessorRootV3)({
                        rootBefore: transition.parent,
                        journalRecordBlob: legacyJournal.blob,
                        promotedCheckpointAnchor,
                    });
                }
                catch {
                    return fail();
                }
                if (!same(successor.root, transition.child))
                    return fail();
            }
        }
        else if (record.recordKind === "missing_index_entry") {
            await assertCanonicalEffectReference(record.accountScopeHash, record.canonicalEffectJournalRecordRef, record.canonicalEffectRecord, resolve);
            const operationParsed = await parseEconomicManifest(record.accountScopeHash, "operation", operation, resolveNode);
            const subjectParsed = await parseEconomicManifest(record.accountScopeHash, "subject", subject, resolveNode);
            const receiptParsed = await parseEconomicManifest(record.accountScopeHash, "receipt", receipt, resolveNode);
            let plan;
            try {
                plan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryCanonicalIndexRepair)({
                    accountScopeHash: record.accountScopeHash,
                    operationManifest: operationParsed.manifest,
                    subjectManifest: subjectParsed.manifest,
                    receiptManifest: receiptParsed.manifest,
                    appliedReceipt: record.canonicalEffectRecord.appliedReceipt,
                    repairKeyKind: record.repairKeyKind,
                    resolveNode,
                });
            }
            catch {
                return fail();
            }
            const expectedAfter = record.repairIndexKind === "operation"
                ? record.operationIndexManifestAfterRef
                : record.repairIndexKind === "subject"
                    ? record.subjectIndexManifestAfterRef
                    : record.receiptIndexManifestAfterRef;
            if (!plan.changed || plan.indexKind !== record.repairIndexKind ||
                plan.keyKind !== record.repairKeyKind ||
                plan.logicalKey !== record.repairLogicalKey ||
                plan.valueFingerprint !== record.repairValueFingerprint ||
                !same(plan.manifestBlob.ref, expectedAfter) ||
                (await resolve(plan.manifestBlob.ref.blobKey)) !== plan.manifestBlob.encoded) {
                return fail();
            }
            for (const blob of plan.immutableNodeBlobs) {
                if ((await resolve(blob.ref.blobKey)) !== blob.encoded)
                    return fail();
            }
            if (transition.parent.schemaVersion === "learning-v2-owner-repository-root.v3") {
                let successor;
                try {
                    successor = (0, owner_repository_root_v3_1.bindOwnerRepositoryMissingIndexRepairSuccessorRootV3)({
                        rootBefore: transition.parent,
                        journalRecordBlob: transition.journal.blob,
                        promotedCheckpointAnchor,
                    });
                }
                catch {
                    return fail();
                }
                if (!same(successor.root, transition.child))
                    return fail();
            }
        }
        else
            return fail();
        seenJournalBlobKeys.add(isWalletCreditEffectV2(transition.journal) ||
            isCourseUnlockEffectV2(transition.journal) ||
            isOperationAliasV2(transition.journal)
            ? transition.journal.ref.blobKey
            : transition.journal.blob.ref.blobKey);
        wallet = await refBlob(transition.child.walletStateRef, resolve);
        course = await refBlob(transition.child.courseStateManifestRef, resolve);
        operation = await refBlob(transition.child.operationIndexManifestRef, resolve);
        subject = await refBlob(transition.child.subjectIndexManifestRef, resolve);
        receipt = await refBlob(transition.child.receiptIndexManifestRef, resolve);
    }
};
/**
 * Verifies an exact bounded backward window. The result is not current-storage/CAS authority;
 * owner_repository must combine it with the same fenced current-root read.
 */
const verifyOwnerRepositoryWalletWindow = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "currentRootRaw",
        "resolveRaw",
        "resolveNode",
    ]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.currentRootRaw !== "string" ||
        typeof request.resolveRaw !== "function" ||
        typeof request.resolveNode !== "function")
        return fail();
    const account = request.accountScopeHash;
    let reads = 0;
    let bytes = 0;
    const cache = new Map();
    const resolve = async (key) => {
        if (cache.has(key))
            return cache.get(key);
        if (reads >= MAX_READS)
            return budget();
        let value;
        try {
            value = await request.resolveRaw(key);
        }
        catch {
            return fail();
        }
        reads += 1;
        if (typeof value === "string") {
            try {
                bytes += (0, decision_registry_1.utf8ByteLengthV1)(value);
            }
            catch {
                return fail();
            }
            if (!Number.isSafeInteger(bytes) || bytes > MAX_BYTES)
                return budget();
        }
        cache.set(key, value);
        return value;
    };
    let current;
    try {
        current = (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3Raw)(request.currentRootRaw, account);
    }
    catch {
        return fail();
    }
    const anchor = current.root.walletCheckpointAnchor;
    let child = current.root;
    let parent;
    const reverseTransitions = [];
    for (let ordinal = 0; ordinal < current.root.walletCheckpointLagRootTransitions; ordinal += 1) {
        const expected = child.previousRootFingerprint;
        if (expected === null || !HASH.test(expected))
            return fail();
        parent = parseRootRaw(await resolve(historyKey(account, expected)), account);
        if (parent.rootFingerprint !== expected)
            return fail();
        const journal = await assertTransition(parent, child, resolve);
        reverseTransitions.push({ parent, child, journal });
        child = parent;
    }
    if (!parent ||
        child.rootFingerprint !== anchor.checkpointRootFingerprint ||
        child.repositoryRevision !== anchor.checkpointRepositoryRevision ||
        child.journalSequence !== anchor.checkpointJournalSequence ||
        child.currentGeneration !== anchor.checkpointCurrentGeneration)
        return fail();
    const wallet = await refBlob(child.walletStateRef, resolve);
    const course = await refBlob(child.courseStateManifestRef, resolve);
    const operation = await refBlob(child.operationIndexManifestRef, resolve);
    const subject = await refBlob(child.subjectIndexManifestRef, resolve);
    const receipt = await refBlob(child.receiptIndexManifestRef, resolve);
    const checkpointRaw = await resolve(anchor.checkpointKey);
    const resolveNode = async (ref) => resolve(ref.blobKey);
    let checkpoint;
    try {
        if (anchor.checkpointSchemaVersion ===
            "learning-v2-owner-repository-economic-checkpoint.v3") {
            checkpoint = await (0, owner_repository_economic_checkpoint_v3_1.parseOwnerRepositoryEconomicCheckpointV3)({
                accountScopeHash: account,
                checkpointRoot: child,
                key: anchor.checkpointKey,
                raw: checkpointRaw,
                walletStateBlob: wallet,
                courseManifestBlob: course,
                operationManifestBlob: operation,
                subjectManifestBlob: subject,
                receiptManifestBlob: receipt,
                resolveNode,
            });
            if (!(0, owner_repository_economic_checkpoint_v3_1.isOwnerRepositoryEconomicCheckpointV3ProjectionMatched)(checkpoint)) {
                return fail();
            }
        }
        else if (anchor.checkpointSchemaVersion ===
            "learning-v2-owner-repository-wallet-checkpoint.v2") {
            const parsed = (0, owner_repository_wallet_checkpoint_v2_1.parseOwnerRepositoryWalletCheckpointV2)({
                accountScopeHash: account,
                checkpointRoot: child,
                key: anchor.checkpointKey,
                raw: checkpointRaw,
                walletStateBlob: wallet,
            });
            checkpoint = await (0, owner_repository_wallet_checkpoint_v2_1.matchOwnerRepositoryWalletCheckpointV2Projection)({
                checkpoint: parsed,
                walletStateBlob: wallet,
                courseManifestBlob: course,
                operationManifestBlob: operation,
                subjectManifestBlob: subject,
                receiptManifestBlob: receipt,
                resolveNode,
            });
            if (!(0, owner_repository_wallet_checkpoint_v2_1.isOwnerRepositoryWalletCheckpointV2ProjectionMatched)(checkpoint))
                return fail();
        }
        else {
            const parsed = (0, owner_repository_wallet_checkpoint_1.parseOwnerRepositoryWalletCheckpoint)({
                accountScopeHash: account,
                checkpointRoot: child,
                key: anchor.checkpointKey,
                raw: checkpointRaw,
                walletStateBlob: wallet,
            });
            checkpoint = await (0, owner_repository_wallet_checkpoint_1.matchOwnerRepositoryWalletCheckpointProjection)({
                checkpoint: parsed,
                checkpointRoot: child,
                walletStateBlob: wallet,
                courseManifestBlob: course,
                operationManifestBlob: operation,
                subjectManifestBlob: subject,
                receiptManifestBlob: receipt,
                resolveNode,
            });
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("budget"))
            return budget();
        return fail();
    }
    if (checkpoint.checkpoint.checkpointFingerprint !== anchor.checkpointFingerprint)
        return fail();
    await assertTailEconomics(reverseTransitions.reverse(), {
        journalHeadRef: child.journalHeadRef,
        wallet,
        course,
        operation,
        subject,
        receipt,
        anchorCheckpoint: checkpoint,
    }, resolve, resolveNode);
    const result = Object.freeze({
        currentRoot: current,
        anchorRoot: child.schemaVersion === "learning-v2-owner-repository-root.v3"
            ? (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3)(child, account)
            : (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(child, account),
        anchorCheckpoint: checkpoint,
        verifiedRootTransitions: current.root.walletCheckpointLagRootTransitions,
        authority: "window_verified_candidate",
    });
    VERIFIED.add(result);
    return result;
};
exports.verifyOwnerRepositoryWalletWindow = verifyOwnerRepositoryWalletWindow;
const isOwnerRepositoryWalletWindowVerifiedCandidate = (value) => isRecord(value) && VERIFIED.has(value);
exports.isOwnerRepositoryWalletWindowVerifiedCandidate = isOwnerRepositoryWalletWindowVerifiedCandidate;
//# sourceMappingURL=owner_repository_wallet_window.js.map