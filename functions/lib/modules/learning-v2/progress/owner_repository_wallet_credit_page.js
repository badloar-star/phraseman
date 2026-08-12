"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldOwnerRepositoryWalletCreditPage = exports.isOwnerRepositoryWalletCreditPageFoldResult = exports.OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const wallet_1 = require("../contracts/wallet");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_wallet_credit_plan_1 = require("./owner_repository_wallet_credit_plan");
const wallet_reducer_1 = require("./wallet_reducer");
exports.OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS = 128;
const VERIFIED_PAGE_FOLDS = new WeakSet();
/** Runtime capability check: only this module's completed, frozen fold result can pass. */
const isOwnerRepositoryWalletCreditPageFoldResult = (input) => typeof input === "object" && input !== null && VERIFIED_PAGE_FOLDS.has(input);
exports.isOwnerRepositoryWalletCreditPageFoldResult = isOwnerRepositoryWalletCreditPageFoldResult;
const DEFAULT_READ_BUDGET = Object.freeze({
    maxExternalReads: 4096,
    maxExternalBytes: 128 * 1024 * 1024,
});
const MAX_READS = 100000;
const MAX_BYTES = 1024 * 1024 * 1024;
const MAX_PAGE_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_PAGE_GENERATED_BYTES = 64 * 1024 * 1024;
const MAX_PAGE_BLOBS = 8192;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_wallet_credit_page_invalid");
};
const indeterminate = () => {
    throw new Error("owner_repository_wallet_credit_page_indeterminate");
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
const parseBudget = (input, present) => {
    if (!present)
        return DEFAULT_READ_BUDGET;
    if (input === undefined)
        return invalid();
    const value = readRecord(input, ["maxExternalReads", "maxExternalBytes"]);
    if (!safe(value.maxExternalReads, MAX_READS) ||
        !safe(value.maxExternalBytes, MAX_BYTES)) {
        return invalid();
    }
    return deepFreeze({
        maxExternalReads: Number(value.maxExternalReads),
        maxExternalBytes: Number(value.maxExternalBytes),
    });
};
const parseReceipts = (input) => {
    if (!Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Array.prototype ||
        input.length < 1 ||
        input.length > exports.OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS) {
        return invalid();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") ||
        keys.length !== input.length + 1 ||
        !Object.prototype.hasOwnProperty.call(descriptors, "length"))
        return invalid();
    const receipts = [];
    let inputBytes = 0;
    for (let index = 0; index < input.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            return invalid();
        try {
            const receipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(descriptor.value);
            inputBytes += (0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(receipt));
            if (!Number.isSafeInteger(inputBytes) ||
                inputBytes > MAX_PAGE_INPUT_BYTES) {
                throw new Error("page_input_overflow");
            }
            receipts.push(receipt);
        }
        catch {
            return invalid();
        }
    }
    return deepFreeze(receipts);
};
const manifestBlob = (blobs, indexKind) => {
    const kind = `${indexKind}_index_manifest`;
    const found = blobs.find((blob) => blob.ref.kind === kind);
    if (!found)
        return indeterminate();
    return found;
};
/**
 * Pure forward fold over one canonical wallet-credit page. The starting graph must already
 * be repository-verified. This function performs no storage writes and does not create a
 * checkpoint trust anchor; it only derives the exact next transitions and lifetime indexes.
 * Receipt hashes and the `trusted_server_boundary` label are not authentication: callers may
 * pass only receipts already established by repository journal/checkpoint verification.
 */
const foldOwnerRepositoryWalletCreditPage = async (input) => {
    const request = readRecord(input, [
        "startingRoot",
        "walletStateBeforeBlob",
        "operationManifestBlob",
        "subjectManifestBlob",
        "receiptManifestBlob",
        "canonicalAppliedReceipts",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.resolveNode !== "function")
        return invalid();
    const receipts = parseReceipts(request.canonicalAppliedReceipts);
    const hasBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const budget = parseBudget(request.readBudget, hasBudget);
    let startingRoot;
    try {
        const detachedRoot = (0, wallet_1.detachBoundedWalletJson)(request.startingRoot, "owner_repository_wallet_credit_page_invalid");
        if (!isRecord(detachedRoot) ||
            typeof detachedRoot.accountScopeHash !== "string") {
            return invalid();
        }
        startingRoot = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(detachedRoot, detachedRoot.accountScopeHash);
    }
    catch {
        return invalid();
    }
    const overlay = new Map();
    const externalCache = new Map();
    let externalReads = 0;
    let externalBytes = 0;
    let budgetExceeded = false;
    const resolveNode = async (ref) => {
        if (overlay.has(ref.blobKey))
            return overlay.get(ref.blobKey);
        if (externalCache.has(ref.blobKey))
            return externalCache.get(ref.blobKey);
        if (externalReads >= budget.maxExternalReads) {
            budgetExceeded = true;
            throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
        }
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
                externalBytes += (0, decision_registry_1.utf8ByteLengthV1)(raw);
            }
            catch {
                return indeterminate();
            }
            if (!Number.isSafeInteger(externalBytes) ||
                externalBytes > budget.maxExternalBytes) {
                budgetExceeded = true;
                throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
            }
        }
        externalCache.set(ref.blobKey, raw);
        return raw;
    };
    let currentRoot = startingRoot;
    let currentWallet = request.walletStateBeforeBlob;
    let currentOperation = request.operationManifestBlob;
    let currentSubject = request.subjectManifestBlob;
    let currentReceipt = request.receiptManifestBlob;
    const transitions = [];
    const immutable = new Map();
    const parentRootHistory = [];
    let generatedBytes = 0;
    let generatedBlobs = 0;
    const accountGenerated = (encoded) => {
        let bytes;
        try {
            bytes = (0, decision_registry_1.utf8ByteLengthV1)(encoded);
        }
        catch {
            throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
        }
        generatedBytes += bytes;
        generatedBlobs += 1;
        if (!Number.isSafeInteger(generatedBytes) ||
            generatedBytes > MAX_PAGE_GENERATED_BYTES ||
            !Number.isSafeInteger(generatedBlobs) ||
            generatedBlobs > MAX_PAGE_BLOBS) {
            throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
        }
    };
    for (const receipt of receipts) {
        let plan;
        try {
            plan = await (0, owner_repository_wallet_credit_plan_1.planOwnerRepositoryWalletCredit)({
                rootBefore: currentRoot.root,
                walletStateBeforeBlob: currentWallet,
                operationManifestBlob: currentOperation,
                subjectManifestBlob: currentSubject,
                receiptManifestBlob: currentReceipt,
                authorizedOperation: receipt.authorizedOperation,
                resolveNode,
            });
        }
        catch (error) {
            if (budgetExceeded ||
                (error instanceof Error && error.message.includes("budget_exceeded"))) {
                throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
            }
            return indeterminate();
        }
        if (plan.status !== "applied" ||
            plan.successorRoot.root.schemaVersion !==
                "learning-v2-owner-repository-root.v2" ||
            !same(plan.appliedReceipt, receipt))
            return indeterminate();
        accountGenerated(currentRoot.encoded);
        parentRootHistory.push(deepFreeze({
            rootFingerprint: currentRoot.root.rootFingerprint,
            encoded: currentRoot.encoded,
        }));
        for (const blob of plan.immutableBlobs) {
            const existing = immutable.get(blob.ref.blobKey);
            if (existing && existing.encoded !== blob.encoded)
                return indeterminate();
            if (!existing) {
                accountGenerated(blob.encoded);
                immutable.set(blob.ref.blobKey, blob);
            }
            if (blob.ref.kind === "index_radix_node")
                overlay.set(blob.ref.blobKey, blob.encoded);
        }
        transitions.push(plan);
        currentRoot = plan.successorRoot;
        currentWallet = plan.walletStateAfterBlob;
        currentOperation = manifestBlob(plan.immutableBlobs, "operation");
        currentSubject = manifestBlob(plan.immutableBlobs, "subject");
        currentReceipt = manifestBlob(plan.immutableBlobs, "receipt");
    }
    const result = deepFreeze({
        startingRoot,
        endingRoot: currentRoot,
        endingWalletStateBlob: currentWallet,
        endingOperationManifestBlob: currentOperation,
        endingSubjectManifestBlob: currentSubject,
        endingReceiptManifestBlob: currentReceipt,
        transitions,
        immutableBlobs: [...immutable.values()].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
        parentRootHistory,
    });
    VERIFIED_PAGE_FOLDS.add(result);
    return result;
};
exports.foldOwnerRepositoryWalletCreditPage = foldOwnerRepositoryWalletCreditPage;
//# sourceMappingURL=owner_repository_wallet_credit_page.js.map