"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planOwnerRepositoryCourseUnlock = exports.lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2 = void 0;
const course_unlock_1 = require("../contracts/course_unlock");
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_course_blob_1 = require("./owner_repository_course_blob");
const owner_repository_course_unlock_effect_v2_1 = require("./owner_repository_course_unlock_effect_v2");
const owner_repository_course_unlock_economic_values_v2_1 = require("./owner_repository_course_unlock_economic_values_v2");
const owner_repository_course_manifest_1 = require("./owner_repository_course_manifest");
const owner_repository_economic_manifest_1 = require("./owner_repository_economic_manifest");
const owner_repository_radix_1 = require("./owner_repository_radix");
const owner_repository_root_v3_1 = require("./owner_repository_root_v3");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_wallet_blob_1 = require("./owner_repository_wallet_blob");
const course_unlock_reducer_1 = require("./course_unlock_reducer");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_course_unlock_plan_invalid");
};
const indeterminate = () => {
    throw new Error("owner_repository_course_unlock_plan_indeterminate");
};
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const deepFreeze = (value) => {
    const stack = [value];
    const seen = new Set();
    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current !== "object" || current === null || seen.has(current)) {
            continue;
        }
        seen.add(current);
        Object.freeze(current);
        for (const child of Object.values(current)) {
            stack.push(child);
        }
    }
    return value;
};
const readRecord = (input, keys, optionalKeys = []) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        return invalid();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length < keys.length ||
        own.length > keys.length + optionalKeys.length ||
        own.some((key) => typeof key !== "string" ||
            (!keys.includes(key) && !optionalKeys.includes(key))) ||
        own.some((key) => {
            if (typeof key !== "string")
                return true;
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        }) ||
        keys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key))) {
        return invalid();
    }
    const result = Object.create(null);
    for (const key of own) {
        if (typeof key !== "string")
            return invalid();
        result[key] = descriptors[key].value;
    }
    return result;
};
const requireRaw = async (resolver, ref) => {
    let raw;
    try {
        raw = await resolver(ref);
    }
    catch {
        return indeterminate();
    }
    if (typeof raw !== "string")
        return indeterminate();
    return raw;
};
const uniqueBlobs = (blobs) => {
    const sorted = [...blobs].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
    const result = [];
    for (const blob of sorted) {
        const previous = result[result.length - 1];
        if (previous?.ref.blobKey === blob.ref.blobKey) {
            if (previous.encoded !== blob.encoded || !same(previous.ref, blob.ref)) {
                return indeterminate();
            }
            continue;
        }
        result.push(blob);
    }
    return deepFreeze(result);
};
const parseEconomicManifests = async (input) => {
    const operationBlob = readRecord(input.operationManifestBlob, ["ref", "encoded"]);
    const subjectBlob = readRecord(input.subjectManifestBlob, ["ref", "encoded"]);
    const receiptBlob = readRecord(input.receiptManifestBlob, ["ref", "encoded"]);
    try {
        const operation = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "operation",
            ref: operationBlob.ref,
            raw: operationBlob.encoded,
            resolveNode: input.resolveNode,
        });
        const subject = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "subject",
            ref: subjectBlob.ref,
            raw: subjectBlob.encoded,
            resolveNode: input.resolveNode,
        });
        const receipt = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "receipt",
            ref: receiptBlob.ref,
            raw: receiptBlob.encoded,
            resolveNode: input.resolveNode,
        });
        const legacyV2Genesis = input.root.schemaVersion ===
            "learning-v2-owner-repository-root.v2" &&
            operation.manifest.entryCount === 0 &&
            subject.manifest.entryCount === 0 &&
            receipt.manifest.entryCount === 0;
        if ((!legacyV2Genesis && (operation.legacy || subject.legacy || receipt.legacy)) ||
            (input.root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
                (!same(operation.normalizedManifestBlob.ref, input.root.operationIndexManifestRef) ||
                    !same(subject.normalizedManifestBlob.ref, input.root.subjectIndexManifestRef) ||
                    !same(receipt.normalizedManifestBlob.ref, input.root.receiptIndexManifestRef)))) {
            return indeterminate();
        }
        return deepFreeze({
            operation: operation.manifest,
            subject: subject.manifest,
            receipt: receipt.manifest,
        });
    }
    catch {
        return indeterminate();
    }
};
const lookupCourseLedger = async (input) => {
    const request = input.authorizedRequest;
    let byId;
    let byFingerprint;
    let subject;
    try {
        byId = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "operation",
            manifest: input.operationManifest,
            keyKind: "operation_id",
            logicalKey: request.operationId,
            resolveNode: input.resolveNode,
        });
        byFingerprint = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "operation",
            manifest: input.operationManifest,
            keyKind: "operation_fingerprint",
            logicalKey: request.operationFingerprint,
            resolveNode: input.resolveNode,
        });
        subject = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "subject",
            manifest: input.subjectManifest,
            keyKind: "semantic_subject",
            logicalKey: request.semanticSubjectFingerprint,
            resolveNode: input.resolveNode,
        });
    }
    catch {
        return indeterminate();
    }
    if (!byId && !byFingerprint && !subject)
        return deepFreeze({});
    if (!byId || !byFingerprint || !subject)
        return indeterminate();
    let operationById;
    let operationByFingerprint;
    let subjectValue;
    try {
        operationById = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "operation",
            keyKind: "operation_id",
            logicalKey: request.operationId,
            value: byId.value,
        });
        operationByFingerprint =
            (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
                accountScopeHash: input.accountScopeHash,
                indexKind: "operation",
                keyKind: "operation_fingerprint",
                logicalKey: request.operationFingerprint,
                value: byFingerprint.value,
            });
        subjectValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "subject",
            keyKind: "semantic_subject",
            logicalKey: request.semanticSubjectFingerprint,
            value: subject.value,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(operationById, operationByFingerprint) ||
        !same(operationById.effectBinding, subjectValue.effectBinding)) {
        return indeterminate();
    }
    const binding = operationById.effectBinding;
    let receiptEntry;
    try {
        receiptEntry = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "receipt",
            manifest: input.receiptManifest,
            keyKind: "applied_receipt",
            logicalKey: binding.appliedReceiptFingerprint,
            resolveNode: input.resolveNode,
        });
    }
    catch {
        return indeterminate();
    }
    if (!receiptEntry)
        return indeterminate();
    let receiptValue;
    try {
        receiptValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash: input.accountScopeHash,
            indexKind: "receipt",
            keyKind: "applied_receipt",
            logicalKey: binding.appliedReceiptFingerprint,
            value: receiptEntry.value,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(receiptValue.effectBinding, binding))
        return indeterminate();
    const journalRaw = await requireRaw(input.resolveBlob, binding.canonicalEffectJournalRecordRef);
    let journal;
    try {
        journal = (0, owner_repository_course_unlock_effect_v2_1.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2)({
            accountScopeHash: input.accountScopeHash,
            ref: binding.canonicalEffectJournalRecordRef,
            raw: journalRaw,
        });
    }
    catch {
        return indeterminate();
    }
    if (journal.record.journalRecordFingerprint !==
        binding.canonicalEffectJournalRecordFingerprint ||
        journal.record.appliedReceiptFingerprint !==
            binding.appliedReceiptFingerprint ||
        !same(journal.record.appliedReceipt, receiptValue.appliedReceipt)) {
        return indeterminate();
    }
    return deepFreeze({
        operationLedgerEntry: operationById.ledgerEntry,
        subjectLedgerEntry: subjectValue.ledgerEntry,
        repositoryVerifiedAncestry: {
            schemaVersion: "learning-v2-course-unlock-repository-ancestry.v1",
            canonicalAppliedReceiptFingerprint: binding.appliedReceiptFingerprint,
            currentWalletStateFingerprint: input.walletState.stateFingerprint,
            currentCourseStateFingerprint: input.courseState.stateFingerprint,
            proofSource: "authoritative_compound_journal",
        },
    });
};
/**
 * Resolves one already-committed course purchase through all four typed
 * economic coordinates and the immutable compound journal. A lone operation
 * row is never enough authority for replay.
 */
const lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2 = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationId",
        "resolveNode",
        "resolveBlob",
    ]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !(0, wallet_1.isWalletIdentifier)(request.operationId) ||
        typeof request.resolveNode !== "function" ||
        typeof request.resolveBlob !== "function") {
        return invalid();
    }
    const accountScopeHash = request.accountScopeHash;
    const operationId = request.operationId;
    const operationManifest = request.operationManifest;
    const subjectManifest = request.subjectManifest;
    const receiptManifest = request.receiptManifest;
    const resolveNode = request.resolveNode;
    const resolveBlob = request.resolveBlob;
    let byId;
    try {
        byId = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash,
            indexKind: "operation",
            manifest: operationManifest,
            keyKind: "operation_id",
            logicalKey: operationId,
            resolveNode,
        });
    }
    catch {
        return indeterminate();
    }
    if (!byId)
        return undefined;
    let operationValue;
    try {
        operationValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash,
            indexKind: "operation",
            keyKind: "operation_id",
            logicalKey: operationId,
            value: byId.value,
        });
    }
    catch {
        return indeterminate();
    }
    const binding = operationValue.effectBinding;
    const ledger = operationValue.ledgerEntry;
    let byFingerprint;
    let subject;
    let receipt;
    try {
        [byFingerprint, subject, receipt] = await Promise.all([
            (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
                accountScopeHash,
                indexKind: "operation",
                manifest: operationManifest,
                keyKind: "operation_fingerprint",
                logicalKey: ledger.operationFingerprint,
                resolveNode,
            }),
            (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
                accountScopeHash,
                indexKind: "subject",
                manifest: subjectManifest,
                keyKind: "semantic_subject",
                logicalKey: ledger.semanticSubjectFingerprint,
                resolveNode,
            }),
            (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
                accountScopeHash,
                indexKind: "receipt",
                manifest: receiptManifest,
                keyKind: "applied_receipt",
                logicalKey: binding.appliedReceiptFingerprint,
                resolveNode,
            }),
        ]);
    }
    catch {
        return indeterminate();
    }
    if (!byFingerprint || !subject || !receipt)
        return indeterminate();
    let fingerprintValue;
    let subjectValue;
    let receiptValue;
    try {
        fingerprintValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash,
            indexKind: "operation",
            keyKind: "operation_fingerprint",
            logicalKey: ledger.operationFingerprint,
            value: byFingerprint.value,
        });
        subjectValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash,
            indexKind: "subject",
            keyKind: "semantic_subject",
            logicalKey: ledger.semanticSubjectFingerprint,
            value: subject.value,
        });
        receiptValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash,
            indexKind: "receipt",
            keyKind: "applied_receipt",
            logicalKey: binding.appliedReceiptFingerprint,
            value: receipt.value,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(fingerprintValue, operationValue) ||
        !same(subjectValue.effectBinding, binding) ||
        !same(receiptValue.effectBinding, binding) ||
        receiptValue.appliedReceipt.authorizedRequest.operationId !== operationId ||
        !same(receiptValue.appliedReceipt, ledger.appliedReceipt) ||
        !same(subjectValue.ledgerEntry.appliedReceipt, ledger.appliedReceipt)) {
        return indeterminate();
    }
    const journalRaw = await requireRaw(resolveBlob, binding.canonicalEffectJournalRecordRef);
    let journal;
    try {
        journal = (0, owner_repository_course_unlock_effect_v2_1.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2)({
            accountScopeHash,
            ref: binding.canonicalEffectJournalRecordRef,
            raw: journalRaw,
        });
    }
    catch {
        return indeterminate();
    }
    if (journal.record.journalRecordFingerprint !==
        binding.canonicalEffectJournalRecordFingerprint ||
        journal.record.appliedReceiptFingerprint !==
            binding.appliedReceiptFingerprint ||
        !same(journal.record.appliedReceipt, receiptValue.appliedReceipt)) {
        return indeterminate();
    }
    return receiptValue.appliedReceipt;
};
exports.lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2 = lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2;
const planOwnerRepositoryCourseUnlock = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "rootBefore",
        "walletStateBlob",
        "courseManifestBlob",
        "operationManifestBlob",
        "subjectManifestBlob",
        "receiptManifestBlob",
        "authorizedRequest",
        "resolveNode",
        "resolveBlob",
    ], ["promotedCheckpointAnchor", "adoptionBase"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function" ||
        typeof request.resolveBlob !== "function") {
        return invalid();
    }
    const accountScopeHash = request.accountScopeHash;
    let root;
    let walletState;
    let walletStateBlob;
    let courseManifest;
    let courseManifestBlob;
    let authorizedRequest;
    try {
        const detachedRoot = request.rootBefore;
        root = detachedRoot.schemaVersion ===
            "learning-v2-owner-repository-root.v3"
            ? (0, owner_repository_root_v3_1.parseOwnerRepositoryRootV3)(detachedRoot, accountScopeHash).root
            : (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2)(detachedRoot, accountScopeHash).root;
        const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
        const parsedWallet = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
            accountScopeHash,
            ref: walletBlob.ref,
            raw: walletBlob.encoded,
        });
        walletStateBlob = parsedWallet.blob;
        walletState = parsedWallet.state;
        const courseBlob = readRecord(request.courseManifestBlob, ["ref", "encoded"]);
        const parsedCourseManifest = await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
            accountScopeHash,
            ref: courseBlob.ref,
            raw: courseBlob.encoded,
            resolveNode: request.resolveNode,
        });
        courseManifest = parsedCourseManifest.manifest;
        courseManifestBlob = parsedCourseManifest.manifestBlob;
        authorizedRequest = (0, course_unlock_1.createAuthorizedCourseUnlockRequest)(request.authorizedRequest);
    }
    catch {
        return indeterminate();
    }
    if (root.currentGeneration !== authorizedRequest.accountGeneration ||
        root.accountScopeHash !== authorizedRequest.accountScopeHash ||
        !same(root.walletStateRef, walletStateBlob.ref) ||
        !same(root.courseStateManifestRef, courseManifestBlob.ref)) {
        return indeterminate();
    }
    const hasPromotedCheckpointAnchor = Object.prototype.hasOwnProperty.call(request, "promotedCheckpointAnchor");
    const hasAdoptionBase = Object.prototype.hasOwnProperty.call(request, "adoptionBase");
    if (root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
        root.walletCheckpointPromotionRequired &&
        !hasPromotedCheckpointAnchor) {
        throw new Error("owner_repository_course_unlock_checkpoint_promotion_required");
    }
    if ((root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
        hasAdoptionBase) ||
        (root.schemaVersion === "learning-v2-owner-repository-root.v2" &&
            !hasAdoptionBase) ||
        (root.schemaVersion === "learning-v2-owner-repository-root.v2" &&
            hasPromotedCheckpointAnchor))
        return invalid();
    let courseEntry;
    try {
        const courseIdentityFingerprint = (0, course_unlock_reducer_1.createCourseUnlockState)({
            accountScopeHash,
            courseId: authorizedRequest.courseId,
            studyTarget: authorizedRequest.studyTarget,
        }).courseIdentityFingerprint;
        courseEntry = await (0, owner_repository_course_manifest_1.lookupOwnerRepositoryCourseState)({
            accountScopeHash,
            manifest: courseManifest,
            courseIdentityFingerprint,
            resolveNode: request.resolveNode,
        });
    }
    catch {
        return indeterminate();
    }
    let courseState;
    let courseStateBeforeBlob;
    if (!courseEntry) {
        courseState = (0, course_unlock_reducer_1.createCourseUnlockState)({
            accountScopeHash,
            courseId: authorizedRequest.courseId,
            studyTarget: authorizedRequest.studyTarget,
        });
    }
    else {
        const raw = await requireRaw(request.resolveBlob, courseEntry.stateRef);
        try {
            courseStateBeforeBlob = (0, owner_repository_course_blob_1.parseOwnerRepositoryCourseUnlockStateBlob)({
                accountScopeHash,
                ref: courseEntry.stateRef,
                raw,
            });
            courseState = courseStateBeforeBlob.state;
        }
        catch {
            return indeterminate();
        }
    }
    const manifests = await parseEconomicManifests({
        accountScopeHash,
        root,
        operationManifestBlob: request.operationManifestBlob,
        subjectManifestBlob: request.subjectManifestBlob,
        receiptManifestBlob: request.receiptManifestBlob,
        resolveNode: request.resolveNode,
    });
    const ledger = await lookupCourseLedger({
        accountScopeHash,
        operationManifest: manifests.operation,
        subjectManifest: manifests.subject,
        receiptManifest: manifests.receipt,
        authorizedRequest,
        walletState,
        courseState,
        resolveNode: request.resolveNode,
        resolveBlob: request.resolveBlob,
    });
    let reduction;
    try {
        reduction = (0, course_unlock_reducer_1.reduceAuthorizedCourseUnlock)({
            walletState,
            courseUnlockState: courseState,
            authorizedRequest,
            lookup: {
                currentAccountGeneration: root.currentGeneration,
                ...ledger,
            },
        });
    }
    catch {
        return indeterminate();
    }
    if (reduction.status === "insufficient_balance") {
        return deepFreeze({
            status: "insufficient_balance",
            requiredSubunits: reduction.requiredSubunits,
            currentBalanceSubunits: reduction.currentBalanceSubunits,
            root,
            walletState,
            courseUnlockState: courseState,
        });
    }
    if (!reduction.ledgerWriteRequired) {
        if (reduction.walletState.stateFingerprint !== walletState.stateFingerprint ||
            reduction.courseUnlockState.stateFingerprint !== courseState.stateFingerprint) {
            return indeterminate();
        }
        return deepFreeze({
            status: "replayed",
            appliedReceipt: reduction.appliedReceipt,
            root,
            walletState,
            courseUnlockState: courseState,
        });
    }
    if (ledger.operationLedgerEntry || ledger.subjectLedgerEntry) {
        return indeterminate();
    }
    const walletAfter = (0, owner_repository_wallet_blob_1.materializeOwnerRepositoryWalletStateBlob)(reduction.walletState);
    const courseAfter = (0, owner_repository_course_blob_1.materializeOwnerRepositoryCourseUnlockStateBlob)(reduction.courseUnlockState);
    if (!same(walletAfter.state, reduction.walletState))
        return indeterminate();
    const nextCourseEntry = deepFreeze({
        schemaVersion: "learning-v2-owner-repository-course-entry.v1",
        courseIdentityFingerprint: reduction.courseUnlockState.courseIdentityFingerprint,
        stateRef: courseAfter.blob.ref,
    });
    const coursePlan = await (0, owner_repository_course_manifest_1.planOwnerRepositoryCourseStateMutation)({
        accountScopeHash,
        manifest: courseManifest,
        expectedEntry: courseEntry ?? null,
        nextEntry: nextCourseEntry,
        resolveNode: request.resolveNode,
    });
    if (!coursePlan.changed)
        return indeterminate();
    const record = (0, owner_repository_course_unlock_effect_v2_1.createOwnerRepositoryCourseUnlockEffectRecordV2)({
        accountScopeHash,
        journalSequence: root.journalSequence + 1,
        repositoryRevisionBefore: root.repositoryRevision,
        rootBeforeFingerprint: root.rootFingerprint,
        previousJournalRecordRef: root.journalHeadRef,
        walletStateBeforeRef: walletStateBlob.ref,
        walletStateAfterRef: walletAfter.blob.ref,
        courseStateBeforeRef: courseStateBeforeBlob
            ? {
                schemaVersion: "learning-v2-owner-repository-course-ref.v1",
                courseIdentityFingerprint: courseState.courseIdentityFingerprint,
                stateRef: courseStateBeforeBlob.blob.ref,
            }
            : null,
        courseStateAfterRef: {
            schemaVersion: "learning-v2-owner-repository-course-ref.v1",
            courseIdentityFingerprint: reduction.courseUnlockState.courseIdentityFingerprint,
            stateRef: courseAfter.blob.ref,
        },
        courseStateManifestBeforeRef: root.courseStateManifestRef,
        courseStateManifestAfterRef: coursePlan.manifestBlob.ref,
        operationIndexManifestBeforeRef: root.operationIndexManifestRef,
        subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
        receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
        appliedReceipt: reduction.appliedReceipt,
    });
    const journalRecordBlob = (0, owner_repository_course_unlock_effect_v2_1.materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2)(record);
    const economicClosure = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryCourseUnlockEconomicClosureV2)({
        accountScopeHash,
        operationManifest: manifests.operation,
        subjectManifest: manifests.subject,
        receiptManifest: manifests.receipt,
        journalRecordBlob,
        resolveNode: request.resolveNode,
    });
    if (!economicClosure.changed)
        return indeterminate();
    const successorInput = {
        journalRecordBlob,
        operationIndexManifestAfterRef: economicClosure.operationManifestBlob.ref,
        subjectIndexManifestAfterRef: economicClosure.subjectManifestBlob.ref,
        receiptIndexManifestAfterRef: economicClosure.receiptManifestBlob.ref,
    };
    const successorRoot = root.schemaVersion ===
        "learning-v2-owner-repository-root.v3"
        ? (0, owner_repository_root_v3_1.bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3)({
            rootBefore: root,
            ...successorInput,
            promotedCheckpointAnchor: hasPromotedCheckpointAnchor
                ? request.promotedCheckpointAnchor
                : null,
        })
        : (0, owner_repository_root_v3_1.bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2)({
            adoptionBase: request.adoptionBase,
            ...successorInput,
        });
    const immutableBlobs = uniqueBlobs([
        ...(walletAfter.blob.ref.blobKey === walletStateBlob.ref.blobKey
            ? []
            : [walletAfter.blob]),
        courseAfter.blob,
        coursePlan.manifestBlob,
        ...coursePlan.immutableNodeBlobs,
        journalRecordBlob,
        economicClosure.operationManifestBlob,
        economicClosure.subjectManifestBlob,
        economicClosure.receiptManifestBlob,
        ...economicClosure.immutableNodeBlobs,
    ]);
    return deepFreeze({
        status: "planned",
        appliedReceipt: reduction.appliedReceipt,
        rootBefore: root,
        successorRoot,
        walletStateAfterBlob: walletAfter.blob,
        courseStateAfterBlob: courseAfter.blob,
        courseManifestAfterBlob: coursePlan.manifestBlob,
        journalRecordBlob,
        economicClosure,
        immutableBlobs,
    });
};
exports.planOwnerRepositoryCourseUnlock = planOwnerRepositoryCourseUnlock;
//# sourceMappingURL=owner_repository_course_unlock_plan.js.map