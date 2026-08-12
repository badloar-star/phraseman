"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.planOwnerRepositoryWalletCreditV2 = exports.planOwnerRepositoryWalletCredit = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_economic_manifest_1 = require("./owner_repository_economic_manifest");
const owner_repository_economic_effect_v2_1 = require("./owner_repository_economic_effect_v2");
const owner_repository_journal_1 = require("./owner_repository_journal");
const owner_repository_root_fold_1 = require("./owner_repository_root_fold");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_wallet_blob_1 = require("./owner_repository_wallet_blob");
const wallet_reducer_1 = require("./wallet_reducer");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const DEFAULT_READ_BUDGET = Object.freeze({
    maxExternalReads: 256,
    maxExternalBytes: 64 * 1024 * 1024,
});
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_wallet_credit_plan_invalid");
};
const indeterminate = () => {
    throw new Error("owner_repository_wallet_credit_plan_indeterminate");
};
const readRecord = (input, requiredKeys, optionalKeys = []) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== "string") ||
        requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
        ownKeys.some((key) => typeof key !== "string" ||
            (!requiredKeys.includes(key) && !optionalKeys.includes(key))))
        return invalid();
    const result = Object.create(null);
    for (const key of ownKeys) {
        const descriptor = descriptors[key];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            return invalid();
        result[key] = descriptor.value;
    }
    return result;
};
const safe = (value, maximum) => Number.isSafeInteger(value) &&
    !Object.is(value, -0) &&
    Number(value) >= 0 &&
    Number(value) <= maximum;
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const parseBlobInput = (input) => {
    const value = readRecord(input, ["ref", "encoded"]);
    if (typeof value.encoded !== "string")
        return invalid();
    return { ref: value.ref, encoded: value.encoded };
};
const parseReadBudget = (input, present) => {
    if (!present)
        return DEFAULT_READ_BUDGET;
    if (input === undefined)
        return invalid();
    const value = readRecord(input, ["maxExternalReads", "maxExternalBytes"]);
    if (!safe(value.maxExternalReads, 100000) ||
        !safe(value.maxExternalBytes, 1024 * 1024 * 1024))
        return invalid();
    return deepFreeze({
        maxExternalReads: Number(value.maxExternalReads),
        maxExternalBytes: Number(value.maxExternalBytes),
    });
};
const createSharedResolver = (resolver, budget) => {
    if (typeof resolver !== "function")
        return invalid();
    const cache = new Map();
    let reads = 0;
    let bytes = 0;
    let budgetExceeded = false;
    const resolveNode = async (ref) => {
        if (cache.has(ref.blobKey))
            return cache.get(ref.blobKey);
        if (reads >= budget.maxExternalReads) {
            budgetExceeded = true;
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        let raw;
        try {
            raw = await resolver(ref);
        }
        catch {
            return indeterminate();
        }
        reads += 1;
        if (typeof raw === "string") {
            try {
                bytes += (0, decision_registry_1.utf8ByteLengthV1)(raw);
            }
            catch {
                return indeterminate();
            }
            if (!Number.isSafeInteger(bytes) || bytes > budget.maxExternalBytes) {
                budgetExceeded = true;
                throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
            }
        }
        cache.set(ref.blobKey, raw);
        return raw;
    };
    return {
        resolveNode,
        get budgetExceeded() {
            return budgetExceeded;
        },
    };
};
/**
 * Repository-internal pure plan. It accepts only a fully materialized server operation,
 * verifies every selected before projection, and performs no durable writes or CAS.
 * The authority label is not authentication; the server repository must own materialization.
 * `rootBefore` must already belong to a repository-verified current graph/checkpoint;
 * this selected-projection planner does not prove journal/course ancestry by itself.
 */
const planOwnerRepositoryWalletCredit = async (input) => {
    const request = readRecord(input, [
        "rootBefore",
        "walletStateBeforeBlob",
        "operationManifestBlob",
        "subjectManifestBlob",
        "receiptManifestBlob",
        "authorizedOperation",
        "resolveNode",
    ], ["readBudget", "promotedCheckpointAnchor"]);
    let detachedRoot;
    let detachedOperation;
    try {
        detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_wallet_credit_plan_invalid");
        detachedOperation = (0, wallet_1.detachBoundedWalletJson)(request.authorizedOperation, "owner_repository_wallet_credit_plan_invalid");
    }
    catch {
        return invalid();
    }
    if (!isRecord(detachedRoot) ||
        typeof detachedRoot.accountScopeHash !== "string" ||
        !ACCOUNT.test(detachedRoot.accountScopeHash) ||
        !isRecord(detachedOperation) ||
        !Object.prototype.hasOwnProperty.call(detachedOperation, "semanticFingerprint") ||
        !Object.prototype.hasOwnProperty.call(detachedOperation, "operationFingerprint"))
        return invalid();
    let root;
    let operation;
    try {
        if (detachedRoot.schemaVersion === "learning-v2-owner-repository-root.v2") {
            if (Object.prototype.hasOwnProperty.call(request, "promotedCheckpointAnchor")) {
                return invalid();
            }
            root = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(detachedRoot, detachedRoot.accountScopeHash).root;
        }
        else if (detachedRoot.schemaVersion === "learning-v2-owner-repository-root.v3") {
            if (!Object.prototype.hasOwnProperty.call(request, "promotedCheckpointAnchor")) {
                return invalid();
            }
            const { parseOwnerRepositoryRootV3 } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
            root = parseOwnerRepositoryRootV3(detachedRoot, detachedRoot.accountScopeHash).root;
        }
        else {
            return invalid();
        }
        operation = (0, wallet_1.createWalletAuthorizedOperation)(detachedOperation);
    }
    catch {
        return invalid();
    }
    if (operation.accountScopeHash !== root.accountScopeHash ||
        operation.accountGeneration > root.currentGeneration)
        return invalid();
    const walletBlobInput = parseBlobInput(request.walletStateBeforeBlob);
    const operationManifestBlob = parseBlobInput(request.operationManifestBlob);
    const subjectManifestBlob = parseBlobInput(request.subjectManifestBlob);
    const receiptManifestBlob = parseBlobInput(request.receiptManifestBlob);
    let walletBefore;
    try {
        walletBefore = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash: root.accountScopeHash,
            ref: walletBlobInput.ref,
            raw: walletBlobInput.encoded,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(walletBefore.blob.ref, root.walletStateRef) ||
        walletBefore.state.accountScopeHash !== root.accountScopeHash)
        return indeterminate();
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const budget = parseReadBudget(request.readBudget, hasReadBudget);
    const resolverSession = createSharedResolver(request.resolveNode, budget);
    const resolveNode = resolverSession.resolveNode;
    let operationManifest;
    let subjectManifest;
    let receiptManifest;
    try {
        operationManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "operation",
            ref: operationManifestBlob.ref,
            raw: operationManifestBlob.encoded,
            resolveNode,
            readBudget: budget,
        });
        subjectManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "subject",
            ref: subjectManifestBlob.ref,
            raw: subjectManifestBlob.encoded,
            resolveNode,
            readBudget: budget,
        });
        receiptManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "receipt",
            ref: receiptManifestBlob.ref,
            raw: receiptManifestBlob.encoded,
            resolveNode,
            readBudget: budget,
        });
    }
    catch (error) {
        if (resolverSession.budgetExceeded ||
            (error instanceof Error && error.message.includes("budget_exceeded"))) {
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        return indeterminate();
    }
    if (!same(operationManifest.sourceManifestBlob.ref, root.operationIndexManifestRef) ||
        !same(subjectManifest.sourceManifestBlob.ref, root.subjectIndexManifestRef) ||
        !same(receiptManifest.sourceManifestBlob.ref, root.receiptIndexManifestRef))
        return indeterminate();
    let closure;
    try {
        closure = await (0, owner_repository_economic_manifest_1.lookupOwnerRepositoryCanonicalEconomicLedgerClosure)({
            accountScopeHash: root.accountScopeHash,
            operationManifest: operationManifest.manifest,
            subjectManifest: subjectManifest.manifest,
            receiptManifest: receiptManifest.manifest,
            operationId: operation.operationId,
            operationFingerprint: operation.operationFingerprint,
            semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
            resolveNode,
            readBudget: budget,
        });
    }
    catch (error) {
        if (resolverSession.budgetExceeded ||
            (error instanceof Error && error.message.includes("budget_exceeded"))) {
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        return indeterminate();
    }
    // A new effect or alias must be fenced by the active generation. An exact
    // lifetime replay may retain its older issuance generation because the
    // complete immutable ledger closure below proves that no new value is being
    // minted under the stale fence.
    if ((closure.status === "absent" || closure.status === "subject_only") &&
        operation.accountGeneration !== root.currentGeneration) {
        return invalid();
    }
    let reduction;
    try {
        reduction = (0, wallet_reducer_1.reduceAuthorizedWalletOperation)(walletBefore.state, operation, closure.status === "canonical" || closure.status === "alias"
            ? {
                currentAccountGeneration: operation.accountGeneration,
                operationLedgerEntry: closure.operationLedgerEntry,
                subjectLedgerEntry: closure.subjectLedgerEntry,
            }
            : closure.status === "subject_only"
                ? {
                    currentAccountGeneration: root.currentGeneration,
                    subjectLedgerEntry: closure.subjectLedgerEntry,
                }
                : { currentAccountGeneration: root.currentGeneration });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "wallet_operation_out_of_order") {
            throw new Error("owner_repository_wallet_credit_plan_reauthorize_required");
        }
        if (error instanceof Error &&
            error.message === "wallet_operation_conflict") {
            throw new Error("owner_repository_wallet_credit_plan_conflict");
        }
        return indeterminate();
    }
    if (closure.status === "subject_only") {
        if (operation.operationId === closure.appliedReceipt.operationId ||
            operation.operationFingerprint ===
                closure.appliedReceipt.operationFingerprint ||
            reduction.operationLedgerEntry.operationId !== operation.operationId ||
            reduction.operationLedgerEntry.operationFingerprint !==
                operation.operationFingerprint ||
            reduction.operationLedgerEntry.canonicalOperationId !==
                closure.appliedReceipt.operationId ||
            reduction.changed ||
            !reduction.ledgerWriteRequired ||
            reduction.appliedReceipt.appliedReceiptFingerprint !==
                closure.appliedReceipt.appliedReceiptFingerprint)
            return indeterminate();
        return deepFreeze({
            status: "alias_repair_required",
            appliedReceipt: reduction.appliedReceipt,
            authorizedOperation: operation,
            root,
            immutableBlobs: [],
        });
    }
    if (!reduction.changed) {
        if (reduction.ledgerWriteRequired ||
            (closure.status !== "canonical" && closure.status !== "alias"))
            return indeterminate();
        return deepFreeze({
            status: "replayed",
            appliedReceipt: reduction.appliedReceipt,
            authorizedOperation: operation,
            root,
            immutableBlobs: [],
        });
    }
    if (closure.status !== "absent" ||
        !reduction.ledgerWriteRequired ||
        reduction.operationLedgerEntry.schemaVersion !==
            "learning-v2-wallet-operation-ledger-entry.v1" ||
        reduction.expectedRevision !== walletBefore.state.revision ||
        reduction.nextRevision !== walletBefore.state.revision + 1)
        return indeterminate();
    let closurePlan;
    try {
        closurePlan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryCanonicalEconomicClosure)({
            accountScopeHash: root.accountScopeHash,
            operationManifest: operationManifest.manifest,
            subjectManifest: subjectManifest.manifest,
            receiptManifest: receiptManifest.manifest,
            operationLedgerEntry: reduction.operationLedgerEntry,
            subjectLedgerEntry: reduction.subjectLedgerEntry,
            appliedReceipt: reduction.appliedReceipt,
            resolveNode,
            readBudget: budget,
        });
    }
    catch (error) {
        if (resolverSession.budgetExceeded ||
            (error instanceof Error && error.message.includes("budget_exceeded"))) {
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        return indeterminate();
    }
    if (!closurePlan.changed ||
        root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
        root.journalSequence === Number.MAX_SAFE_INTEGER)
        return indeterminate();
    const walletAfter = (0, owner_repository_wallet_blob_1.materializeOwnerRepositoryWalletStateBlob)(reduction.state);
    const record = (0, owner_repository_journal_1.createOwnerRepositoryWalletCreditJournalRecord)({
        accountScopeHash: root.accountScopeHash,
        journalSequence: root.journalSequence + 1,
        repositoryRevisionBefore: root.repositoryRevision,
        rootBeforeFingerprint: root.rootFingerprint,
        previousJournalRecordRef: root.journalHeadRef,
        walletStateBeforeRef: root.walletStateRef,
        walletStateAfterRef: walletAfter.blob.ref,
        operationIndexManifestBeforeRef: root.operationIndexManifestRef,
        operationIndexManifestAfterRef: closurePlan.operationManifestBlob.ref,
        subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
        subjectIndexManifestAfterRef: closurePlan.subjectManifestBlob.ref,
        receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
        receiptIndexManifestAfterRef: closurePlan.receiptManifestBlob.ref,
        appliedReceipt: reduction.appliedReceipt,
    });
    const journalRecordBlob = (0, owner_repository_root_fold_1.materializeOwnerRepositoryJournalRecordBlob)(record);
    const successorRoot = root.schemaVersion === "learning-v2-owner-repository-root.v2"
        ? (0, owner_repository_root_fold_1.bindOwnerRepositoryWalletCreditSuccessorRootV2)({
            rootBefore: root,
            journalRecordBlob,
        })
        : (await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")))).bindOwnerRepositoryWalletCreditSuccessorRootV3({
            rootBefore: root,
            journalRecordBlob,
            promotedCheckpointAnchor: request.promotedCheckpointAnchor,
        });
    const immutableBlobs = [
        walletAfter.blob,
        ...closurePlan.immutableNodeBlobs,
        closurePlan.operationManifestBlob,
        closurePlan.subjectManifestBlob,
        closurePlan.receiptManifestBlob,
        journalRecordBlob,
    ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
    if (!same(successorRoot.root.walletStateRef, walletAfter.blob.ref) ||
        successorRoot.root.repositoryRevision !== root.repositoryRevision + 1 ||
        successorRoot.root.journalSequence !== root.journalSequence + 1 ||
        successorRoot.root.previousRootFingerprint !== root.rootFingerprint)
        return indeterminate();
    return deepFreeze({
        status: "applied",
        appliedReceipt: reduction.appliedReceipt,
        authorizedOperation: operation,
        journalRecord: record,
        journalRecordBlob,
        walletStateAfterBlob: walletAfter.blob,
        successorRoot,
        immutableBlobs,
    });
};
exports.planOwnerRepositoryWalletCredit = planOwnerRepositoryWalletCredit;
/**
 * Cycle-free publication plan for an already admitted RootV3 graph. The
 * historical planner remains the closed reducer/replay authority; this layer
 * replaces only the new-effect journal and lifetime index representation.
 * It performs no writes and the supplied RootV3 must still be fenced by the
 * repository before any returned blob is staged.
 */
const planOwnerRepositoryWalletCreditV2 = async (input) => {
    const request = readRecord(input, [
        "rootBefore",
        "walletStateBeforeBlob",
        "operationManifestBlob",
        "subjectManifestBlob",
        "receiptManifestBlob",
        "authorizedOperation",
        "resolveNode",
        "promotedCheckpointAnchor",
    ], ["readBudget"]);
    if (typeof request.resolveNode !== "function")
        return invalid();
    let stableRoot;
    let stableWalletBlob;
    let stableOperationManifestBlob;
    let stableSubjectManifestBlob;
    let stableReceiptManifestBlob;
    let stableOperation;
    let stableReadBudget;
    try {
        stableRoot = (0, wallet_1.detachBoundedWalletJson)(request.rootBefore, "owner_repository_wallet_credit_plan_invalid");
        stableWalletBlob = (0, wallet_1.detachBoundedWalletJson)(request.walletStateBeforeBlob, "owner_repository_wallet_credit_plan_invalid");
        stableOperationManifestBlob = (0, wallet_1.detachBoundedWalletJson)(request.operationManifestBlob, "owner_repository_wallet_credit_plan_invalid");
        stableSubjectManifestBlob = (0, wallet_1.detachBoundedWalletJson)(request.subjectManifestBlob, "owner_repository_wallet_credit_plan_invalid");
        stableReceiptManifestBlob = (0, wallet_1.detachBoundedWalletJson)(request.receiptManifestBlob, "owner_repository_wallet_credit_plan_invalid");
        stableOperation = (0, wallet_1.detachBoundedWalletJson)(request.authorizedOperation, "owner_repository_wallet_credit_plan_invalid");
        if (Object.prototype.hasOwnProperty.call(request, "readBudget")) {
            stableReadBudget = (0, wallet_1.detachBoundedWalletJson)(request.readBudget, "owner_repository_wallet_credit_plan_invalid");
        }
    }
    catch {
        return invalid();
    }
    if (!isRecord(stableRoot) ||
        stableRoot.schemaVersion !== "learning-v2-owner-repository-root.v3" ||
        typeof stableRoot.accountScopeHash !== "string" ||
        !ACCOUNT.test(stableRoot.accountScopeHash))
        return invalid();
    const { parseOwnerRepositoryRootV3, bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3 } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
    let root;
    try {
        root = parseOwnerRepositoryRootV3(stableRoot, stableRoot.accountScopeHash).root;
    }
    catch {
        return invalid();
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const readBudget = parseReadBudget(stableReadBudget, hasReadBudget);
    const externalResolver = createSharedResolver(request.resolveNode, readBudget);
    const stableInput = {
        rootBefore: root,
        walletStateBeforeBlob: stableWalletBlob,
        operationManifestBlob: stableOperationManifestBlob,
        subjectManifestBlob: stableSubjectManifestBlob,
        receiptManifestBlob: stableReceiptManifestBlob,
        authorizedOperation: stableOperation,
        promotedCheckpointAnchor: request.promotedCheckpointAnchor,
        resolveNode: externalResolver.resolveNode,
        readBudget,
    };
    let legacyPlan;
    try {
        legacyPlan = await (0, exports.planOwnerRepositoryWalletCredit)(stableInput);
    }
    catch (error) {
        if (externalResolver.budgetExceeded) {
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        throw error;
    }
    if (legacyPlan.status !== "applied") {
        if (legacyPlan.root.schemaVersion !==
            "learning-v2-owner-repository-root.v3")
            return indeterminate();
        return legacyPlan;
    }
    const operationBlob = parseBlobInput(stableOperationManifestBlob);
    const subjectBlob = parseBlobInput(stableSubjectManifestBlob);
    const receiptBlob = parseBlobInput(stableReceiptManifestBlob);
    let operationManifest;
    let subjectManifest;
    let receiptManifest;
    try {
        operationManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "operation",
            ref: operationBlob.ref,
            raw: operationBlob.encoded,
            resolveNode: externalResolver.resolveNode,
            readBudget,
        });
        subjectManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "subject",
            ref: subjectBlob.ref,
            raw: subjectBlob.encoded,
            resolveNode: externalResolver.resolveNode,
            readBudget,
        });
        receiptManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: root.accountScopeHash,
            indexKind: "receipt",
            ref: receiptBlob.ref,
            raw: receiptBlob.encoded,
            resolveNode: externalResolver.resolveNode,
            readBudget,
        });
    }
    catch (error) {
        if (externalResolver.budgetExceeded ||
            (error instanceof Error && error.message.includes("budget_exceeded"))) {
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        return indeterminate();
    }
    if (!same(operationManifest.sourceManifestBlob.ref, root.operationIndexManifestRef) ||
        !same(subjectManifest.sourceManifestBlob.ref, root.subjectIndexManifestRef) ||
        !same(receiptManifest.sourceManifestBlob.ref, root.receiptIndexManifestRef))
        return indeterminate();
    const record = (0, owner_repository_economic_effect_v2_1.createOwnerRepositoryWalletCreditEffectRecordV2)({
        accountScopeHash: root.accountScopeHash,
        journalSequence: root.journalSequence + 1,
        repositoryRevisionBefore: root.repositoryRevision,
        rootBeforeFingerprint: root.rootFingerprint,
        previousJournalRecordRef: root.journalHeadRef,
        walletStateBeforeRef: root.walletStateRef,
        walletStateAfterRef: legacyPlan.walletStateAfterBlob.ref,
        operationIndexManifestBeforeRef: root.operationIndexManifestRef,
        subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
        receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
        appliedReceipt: legacyPlan.appliedReceipt,
    });
    const journalRecordBlob = (0, owner_repository_economic_effect_v2_1.materializeOwnerRepositoryWalletCreditEffectRecordBlobV2)(record);
    let closurePlan;
    try {
        closurePlan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryCanonicalEconomicClosureV2)({
            accountScopeHash: root.accountScopeHash,
            operationManifest: operationManifest.manifest,
            subjectManifest: subjectManifest.manifest,
            receiptManifest: receiptManifest.manifest,
            journalRecordBlob,
            resolveNode: externalResolver.resolveNode,
            readBudget,
        });
    }
    catch (error) {
        if (externalResolver.budgetExceeded ||
            (error instanceof Error && error.message.includes("budget_exceeded"))) {
            throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
        }
        return indeterminate();
    }
    if (!closurePlan.changed)
        return indeterminate();
    let successorRoot;
    try {
        successorRoot = bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3({
            rootBefore: root,
            journalRecordBlob,
            operationIndexManifestAfterRef: closurePlan.operationManifestBlob.ref,
            subjectIndexManifestAfterRef: closurePlan.subjectManifestBlob.ref,
            receiptIndexManifestAfterRef: closurePlan.receiptManifestBlob.ref,
            promotedCheckpointAnchor: request.promotedCheckpointAnchor,
        });
    }
    catch {
        return indeterminate();
    }
    const immutableBlobs = [
        legacyPlan.walletStateAfterBlob,
        ...closurePlan.immutableNodeBlobs,
        closurePlan.operationManifestBlob,
        closurePlan.subjectManifestBlob,
        closurePlan.receiptManifestBlob,
        journalRecordBlob,
    ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
    return deepFreeze({
        status: "applied",
        appliedReceipt: legacyPlan.appliedReceipt,
        authorizedOperation: legacyPlan.authorizedOperation,
        journalRecord: record,
        journalRecordBlob,
        walletStateAfterBlob: legacyPlan.walletStateAfterBlob,
        successorRoot,
        immutableBlobs,
    });
};
exports.planOwnerRepositoryWalletCreditV2 = planOwnerRepositoryWalletCreditV2;
//# sourceMappingURL=owner_repository_wallet_credit_plan.js.map