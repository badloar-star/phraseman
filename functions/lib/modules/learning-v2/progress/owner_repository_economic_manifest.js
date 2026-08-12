"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnerRepositoryEconomicClosureAuditCursor = exports.auditOwnerRepositoryEconomicClosurePage = exports.auditOwnerRepositoryEconomicManifestPage = exports.assertOwnerRepositoryEconomicClosureForReceipt = exports.planOwnerRepositoryCanonicalIndexRepair = exports.planOwnerRepositoryOperationAlias = exports.planOwnerRepositoryOperationAliasV2 = exports.planOwnerRepositoryCourseUnlockEconomicClosureV2 = exports.planOwnerRepositoryCanonicalEconomicClosureV2 = exports.planOwnerRepositoryCanonicalEconomicClosure = exports.lookupOwnerRepositoryCanonicalEconomicLedgerClosure = exports.lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2 = exports.lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2 = exports.parseOwnerRepositoryEconomicManifestBlob = exports.createEmptyOwnerRepositoryEconomicManifest = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const wallet_1 = require("../contracts/wallet");
const owner_repository_radix_1 = require("./owner_repository_radix");
const wallet_reducer_1 = require("./wallet_reducer");
const owner_repository_economic_effect_v2_1 = require("./owner_repository_economic_effect_v2");
const owner_repository_course_unlock_economic_values_v2_1 = require("./owner_repository_course_unlock_economic_values_v2");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MANIFEST_MAX_BYTES = 64 * 1024;
const REF_KEYS = [
    "schemaVersion",
    "kind",
    "blobKey",
    "blobFingerprint",
];
const ENVELOPE_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "kind",
    "payload",
];
const DEFAULT_READ_BUDGET = Object.freeze({
    maxExternalReads: 132,
    maxExternalBytes: 64 * 1024 * 1024,
});
const ECONOMIC_AUDIT_CURSORS = new WeakSet();
const HASH_MODULUS = 1n << 256n;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => {
    const ownKeys = Reflect.ownKeys(value);
    return (ownKeys.length === keys.length &&
        ownKeys.every((key) => typeof key === "string" && keys.includes(key)));
};
const deepFreeze = (value) => {
    const stack = [value];
    const seen = new Set();
    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current !== "object" || current === null || seen.has(current))
            continue;
        seen.add(current);
        Object.freeze(current);
        for (const child of Object.values(current))
            stack.push(child);
    }
    return value;
};
const readRecord = (input, requiredKeys, optionalKeys = [], code = "owner_economic_manifest_invalid") => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        throw new Error(code);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") ||
        requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
        keys.some((key) => typeof key !== "string" ||
            (!requiredKeys.includes(key) && !optionalKeys.includes(key))))
        throw new Error(code);
    const result = Object.create(null);
    for (const key of keys) {
        const descriptor = descriptors[key];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            throw new Error(code);
        result[key] = descriptor.value;
    }
    return result;
};
const safe = (value, maximum) => Number.isSafeInteger(value) &&
    !Object.is(value, -0) &&
    Number(value) >= 0 &&
    Number(value) <= maximum;
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const economicKind = (value) => value === "operation" || value === "subject" || value === "receipt";
const manifestBlobKind = (indexKind) => (indexKind === "operation"
    ? "operation_index_manifest"
    : indexKind === "subject"
        ? "subject_index_manifest"
        : "receipt_index_manifest");
const legacyEmptyManifest = (indexKind) => ({
    schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
    indexKind,
    shardBits: 8,
    shards: [],
});
const parseReadBudget = (input) => {
    if (input === undefined)
        return DEFAULT_READ_BUDGET;
    const value = readRecord(input, ["maxExternalReads", "maxExternalBytes"], [], "owner_economic_manifest_invalid");
    if (!safe(value.maxExternalReads, 100000) ||
        !safe(value.maxExternalBytes, 1024 * 1024 * 1024)) {
        throw new Error("owner_economic_manifest_invalid");
    }
    return deepFreeze({
        maxExternalReads: Number(value.maxExternalReads),
        maxExternalBytes: Number(value.maxExternalBytes),
    });
};
const createSharedResolverSession = (resolver, budgetInput, budgetPresent = false) => {
    if (typeof resolver !== "function")
        throw new Error("owner_economic_manifest_invalid");
    if (budgetPresent && budgetInput === undefined)
        throw new Error("owner_economic_manifest_invalid");
    const readBudget = parseReadBudget(budgetInput);
    const cache = new Map();
    let externalReads = 0;
    let externalBytes = 0;
    let budgetExceeded = false;
    const resolveNode = async (ref) => {
        if (cache.has(ref.blobKey))
            return cache.get(ref.blobKey);
        if (externalReads >= readBudget.maxExternalReads) {
            budgetExceeded = true;
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        }
        let raw;
        try {
            raw = await resolver(ref);
        }
        catch {
            throw new Error("owner_economic_manifest_indeterminate");
        }
        externalReads += 1;
        if (typeof raw === "string") {
            let bytes;
            try {
                bytes = (0, decision_registry_1.utf8ByteLengthV1)(raw);
            }
            catch {
                throw new Error("owner_economic_manifest_indeterminate");
            }
            externalBytes += bytes;
            if (!Number.isSafeInteger(externalBytes) ||
                externalBytes > readBudget.maxExternalBytes) {
                budgetExceeded = true;
                throw new Error("owner_economic_manifest_read_budget_exceeded");
            }
        }
        cache.set(ref.blobKey, raw);
        return raw;
    };
    return deepFreeze({
        resolveNode,
        readBudget,
        get budgetExceeded() {
            return budgetExceeded;
        },
    });
};
const parseManifestRef = (input, accountScopeHash, indexKind) => {
    const value = readRecord(input, REF_KEYS, [], "owner_economic_manifest_indeterminate");
    const kind = manifestBlobKind(indexKind);
    if (value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        value.kind !== kind ||
        typeof value.blobFingerprint !== "string" ||
        !HASH.test(value.blobFingerprint) ||
        value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
        kind,
        blobKey: value.blobKey,
        blobFingerprint: value.blobFingerprint,
    });
};
const materializeManifestBlob = (accountScopeHash, indexKind, manifest) => {
    const kind = manifestBlobKind(indexKind);
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash,
        kind,
        payload: manifest,
    };
    let encoded;
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MANIFEST_MAX_BYTES) {
        throw new Error("owner_economic_manifest_overflow");
    }
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        encoded,
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind,
            blobKey: blobKey(accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
    });
};
const normalizeManifest = async (input) => (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
    accountScopeHash: input.accountScopeHash,
    indexKind: input.indexKind,
    manifest: input.manifest,
    mutations: [],
    resolveNode: input.session.resolveNode,
    readBudget: input.session.readBudget,
});
const createEmptyOwnerRepositoryEconomicManifest = async (accountScopeHash, indexKind) => {
    if (typeof accountScopeHash !== "string" ||
        !ACCOUNT.test(accountScopeHash) ||
        !economicKind(indexKind)) {
        throw new Error("owner_economic_manifest_invalid");
    }
    const session = createSharedResolverSession(() => null, undefined);
    const plan = await normalizeManifest({
        accountScopeHash,
        indexKind,
        manifest: legacyEmptyManifest(indexKind),
        session,
    });
    const manifest = plan.manifest;
    return deepFreeze({
        manifest,
        manifestBlob: materializeManifestBlob(accountScopeHash, indexKind, manifest),
        immutableNodeBlobs: plan.immutableBlobs,
    });
};
exports.createEmptyOwnerRepositoryEconomicManifest = createEmptyOwnerRepositoryEconomicManifest;
/**
 * Verifies the persisted manifest envelope and the canonical root path only.
 * It is not a full-tree economic audit: callers must use the typed closure lookup below,
 * or the future paged checkpoint audit, before treating values as authoritative.
 */
const parseOwnerRepositoryEconomicManifestBlob = async (input) => {
    let request;
    try {
        request = readRecord(input, ["accountScopeHash", "indexKind", "ref", "raw", "resolveNode"], ["readBudget"], "owner_economic_manifest_indeterminate");
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_economic_manifest_read_budget_exceeded") {
            throw error;
        }
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !economicKind(request.indexKind) ||
        typeof request.raw !== "string" ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const accountScopeHash = request.accountScopeHash;
    const indexKind = request.indexKind;
    let ref;
    try {
        ref = parseManifestRef(request.ref, accountScopeHash, indexKind);
    }
    catch {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MANIFEST_MAX_BYTES ||
            (0, decision_registry_1.sha256Utf8)(request.raw) !== ref.blobFingerprint)
            throw new Error("raw_mismatch");
    }
    catch {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    let envelope;
    try {
        envelope = JSON.parse(request.raw);
        if ((0, decision_registry_1.canonicalJsonV1)(envelope) !== request.raw)
            throw new Error("noncanonical");
    }
    catch {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const kind = manifestBlobKind(indexKind);
    if (!isRecord(envelope) ||
        !exactKeys(envelope, ENVELOPE_KEYS) ||
        envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        envelope.accountScopeHash !== accountScopeHash ||
        envelope.kind !== kind) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const legacy = isRecord(envelope.payload) &&
        envelope.payload.schemaVersion ===
            "learning-v2-owner-repository-index-manifest.v1";
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    let session;
    try {
        session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    let normalized;
    try {
        normalized = await normalizeManifest({
            accountScopeHash,
            indexKind,
            manifest: envelope.payload,
            session,
        });
    }
    catch (error) {
        if (session.budgetExceeded ||
            (error instanceof Error &&
                error.message === "owner_index_read_budget_exceeded")) {
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        }
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if ((!legacy && normalized.changed) ||
        (!legacy &&
            (0, decision_registry_1.canonicalJsonV1)(normalized.manifest) !==
                (0, decision_registry_1.canonicalJsonV1)(envelope.payload)) ||
        (legacy && normalized.manifest.entryCount !== 0)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const sourceManifest = JSON.parse((0, decision_registry_1.canonicalJsonV1)(envelope.payload));
    const manifest = normalized.manifest;
    return deepFreeze({
        sourceManifest,
        manifest,
        legacy,
        sourceManifestBlob: { ref, encoded: request.raw },
        normalizedManifestBlob: materializeManifestBlob(accountScopeHash, indexKind, manifest),
    });
};
exports.parseOwnerRepositoryEconomicManifestBlob = parseOwnerRepositoryEconomicManifestBlob;
const parseTypedEconomicValue = (accountScopeHash, indexKind, entry) => {
    if (isRecord(entry.value) &&
        [
            "learning-v2-owner-repository-canonical-operation-index-value.v2",
            "learning-v2-owner-repository-operation-alias-index-value.v2",
            "learning-v2-owner-repository-canonical-subject-index-value.v2",
            "learning-v2-owner-repository-canonical-receipt-index-value.v2",
        ].includes(String(entry.value.schemaVersion))) {
        let bound;
        try {
            bound = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
                accountScopeHash,
                indexKind,
                keyKind: entry.keyKind,
                logicalKey: entry.logicalKey,
                value: entry.value,
            });
        }
        catch {
            throw new Error("owner_economic_manifest_indeterminate");
        }
        return bound.valueKind === "canonical_receipt"
            ? bound.appliedReceipt
            : bound.ledgerEntry;
    }
    let parsed;
    try {
        if (indexKind === "operation") {
            parsed =
                isRecord(entry.value) &&
                    entry.value.schemaVersion ===
                        "learning-v2-wallet-operation-alias-ledger-entry.v2"
                    ? (0, wallet_reducer_1.parseWalletOperationAliasLedgerEntry)(entry.value)
                    : (0, wallet_reducer_1.parseWalletOperationLedgerEntry)(entry.value);
            if ((entry.keyKind === "operation_id" &&
                parsed.operationId !== entry.logicalKey) ||
                (entry.keyKind === "operation_fingerprint" &&
                    parsed.operationFingerprint !== entry.logicalKey) ||
                (entry.keyKind !== "operation_id" &&
                    entry.keyKind !== "operation_fingerprint") ||
                (parsed.schemaVersion ===
                    "learning-v2-wallet-operation-ledger-entry.v1" &&
                    (parsed.operationId !== parsed.canonicalOperationId ||
                        parsed.operationFingerprint !==
                            parsed.appliedReceipt.operationFingerprint))) {
                throw new Error("binding_mismatch");
            }
        }
        else if (indexKind === "subject") {
            parsed = (0, wallet_reducer_1.parseWalletSubjectLedgerEntry)(entry.value);
            if (entry.keyKind !== "semantic_subject" ||
                parsed.semanticSubjectFingerprint !== entry.logicalKey)
                throw new Error("binding_mismatch");
        }
        else {
            parsed = (0, wallet_reducer_1.parseWalletAppliedReceipt)(entry.value);
            if (entry.keyKind !== "applied_receipt" ||
                parsed.appliedReceiptFingerprint !== entry.logicalKey)
                throw new Error("binding_mismatch");
        }
        const receipt = indexKind === "receipt"
            ? parsed
            : parsed
                .appliedReceipt;
        if (receipt.accountScopeHash !== accountScopeHash ||
            (0, decision_registry_1.canonicalJsonV1)(parsed) !== (0, decision_registry_1.canonicalJsonV1)(entry.value))
            throw new Error("binding_mismatch");
    }
    catch {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    return parsed;
};
const sameCanonical = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const assertLedgerCrosslinks = (operationEntry, subjectEntry, receipt) => {
    if (subjectEntry.canonicalOperationId !== receipt.operationId ||
        subjectEntry.semanticSubjectFingerprint !==
            receipt.semanticSubjectFingerprint ||
        subjectEntry.semanticFingerprint !== receipt.semanticFingerprint ||
        !sameCanonical(subjectEntry.appliedReceipt, receipt) ||
        (operationEntry !== undefined &&
            (operationEntry.canonicalOperationId !== receipt.operationId ||
                operationEntry.semanticSubjectFingerprint !==
                    receipt.semanticSubjectFingerprint ||
                operationEntry.semanticFingerprint !== receipt.semanticFingerprint ||
                !sameCanonical(operationEntry.appliedReceipt, receipt) ||
                (operationEntry.schemaVersion ===
                    "learning-v2-wallet-operation-ledger-entry.v1" &&
                    (operationEntry.operationId !== receipt.operationId ||
                        operationEntry.operationFingerprint !==
                            receipt.operationFingerprint)))))
        throw new Error("owner_economic_manifest_indeterminate");
};
const lookupTypedEntry = async (accountScopeHash, indexKind, manifest, keyKind, logicalKey, session) => {
    let found;
    try {
        found = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash,
            indexKind,
            manifest,
            keyKind,
            logicalKey,
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded ||
            (error instanceof Error &&
                error.message === "owner_index_read_budget_exceeded")) {
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        }
        throw new Error("owner_economic_manifest_indeterminate");
    }
    return found === undefined
        ? undefined
        : parseTypedEconomicValue(accountScopeHash, indexKind, found);
};
const lookupCanonicalV2Entry = async (accountScopeHash, indexKind, manifest, keyKind, logicalKey, session) => {
    let found;
    try {
        found = await (0, owner_repository_radix_1.lookupOwnerRepositoryRadix)({
            accountScopeHash,
            indexKind,
            manifest,
            keyKind,
            logicalKey,
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded ||
            (error instanceof Error &&
                error.message === "owner_index_read_budget_exceeded")) {
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        }
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (found === undefined)
        return undefined;
    try {
        return (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
            accountScopeHash,
            indexKind,
            keyKind,
            logicalKey,
            value: found.value,
        });
    }
    catch {
        throw new Error("owner_economic_manifest_indeterminate");
    }
};
const lookupCanonicalV2ClosureWithSession = async (input) => {
    const operationById = await lookupCanonicalV2Entry(input.accountScopeHash, "operation", input.operationManifest, "operation_id", input.operationId, input.session);
    const operationByFingerprint = await lookupCanonicalV2Entry(input.accountScopeHash, "operation", input.operationManifest, "operation_fingerprint", input.operationFingerprint, input.session);
    const subject = await lookupCanonicalV2Entry(input.accountScopeHash, "subject", input.subjectManifest, "semantic_subject", input.semanticSubjectFingerprint, input.session);
    if ((operationById === undefined) !==
        (operationByFingerprint === undefined) ||
        (operationById !== undefined &&
            !sameCanonical(operationById, operationByFingerprint)) ||
        (operationById !== undefined && subject === undefined)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (operationById === undefined && subject === undefined) {
        return deepFreeze({ status: "absent" });
    }
    if (subject?.valueKind !== "canonical_subject" ||
        (operationById !== undefined &&
            operationById.valueKind !== "canonical_operation" &&
            operationById.valueKind !== "operation_alias")) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const receiptFingerprint = subject.ledgerEntry.appliedReceipt
        .appliedReceiptFingerprint;
    const receipt = await lookupCanonicalV2Entry(input.accountScopeHash, "receipt", input.receiptManifest, "applied_receipt", receiptFingerprint, input.session);
    if (receipt?.valueKind !== "canonical_receipt" ||
        !sameCanonical(subject.effectBinding, receipt.effectBinding)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (operationById === undefined && operationByFingerprint === undefined) {
        return deepFreeze({
            status: "subject_only",
            subjectValue: subject,
            receiptValue: receipt,
            effectBinding: receipt.effectBinding,
        });
    }
    if ((operationById?.valueKind !== "canonical_operation" &&
        operationById?.valueKind !== "operation_alias") ||
        operationByFingerprint?.valueKind !== operationById.valueKind ||
        !sameCanonical(operationById.effectBinding, receipt.effectBinding)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (operationById.valueKind === "operation_alias") {
        return deepFreeze({
            status: "alias",
            operationValue: operationById,
            subjectValue: subject,
            receiptValue: receipt,
            effectBinding: receipt.effectBinding,
        });
    }
    return deepFreeze({
        status: "canonical",
        operationValue: operationById,
        subjectValue: subject,
        receiptValue: receipt,
        effectBinding: receipt.effectBinding,
    });
};
/**
 * Looks up only cycle-free V2 canonical values. Historical V1 values remain
 * readable through the legacy lookup but cannot authorize lifetime aliases.
 */
const lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2 = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationId",
        "operationFingerprint",
        "semanticSubjectFingerprint",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !(0, wallet_1.isWalletIdentifier)(request.operationId) ||
        ![
            request.operationFingerprint,
            request.semanticSubjectFingerprint,
        ].every((value) => typeof value === "string" && HASH.test(value)) ||
        typeof request.resolveNode !== "function")
        throw new Error("owner_economic_manifest_invalid");
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    return lookupCanonicalV2ClosureWithSession({
        accountScopeHash: request.accountScopeHash,
        operationManifest: request.operationManifest,
        subjectManifest: request.subjectManifest,
        receiptManifest: request.receiptManifest,
        operationId: request.operationId,
        operationFingerprint: request.operationFingerprint,
        semanticSubjectFingerprint: request.semanticSubjectFingerprint,
        session,
    });
};
exports.lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2 = lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2;
/**
 * Resolves a lifetime canonical receipt by operation id and proves its full
 * operation/subject/receipt closure before returning it. This is the safe
 * restart seam for protected server settlements older than the journal head.
 */
const lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2 = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationId",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !(0, wallet_1.isWalletIdentifier)(request.operationId) ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    const operation = (await lookupTypedEntry(request.accountScopeHash, "operation", request.operationManifest, "operation_id", request.operationId, session));
    if (operation === undefined)
        return undefined;
    const closure = await lookupClosureWithSession({
        accountScopeHash: request.accountScopeHash,
        operationManifest: request.operationManifest,
        subjectManifest: request.subjectManifest,
        receiptManifest: request.receiptManifest,
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        session,
    });
    if (closure.status !== "canonical" && closure.status !== "alias") {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    return closure.appliedReceipt;
};
exports.lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2 = lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2;
const lookupClosureWithSession = async (input) => {
    const operationById = (await lookupTypedEntry(input.accountScopeHash, "operation", input.operationManifest, "operation_id", input.operationId, input.session));
    const operationByFingerprint = (await lookupTypedEntry(input.accountScopeHash, "operation", input.operationManifest, "operation_fingerprint", input.operationFingerprint, input.session));
    if ((operationById === undefined) !== (operationByFingerprint === undefined) ||
        (operationById !== undefined &&
            !sameCanonical(operationById, operationByFingerprint))) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const subject = (await lookupTypedEntry(input.accountScopeHash, "subject", input.subjectManifest, "semantic_subject", input.semanticSubjectFingerprint, input.session));
    if (operationById !== undefined && subject === undefined) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (operationById === undefined && subject === undefined)
        return deepFreeze({ status: "absent" });
    const receiptFingerprint = (subject ?? operationById).appliedReceipt
        .appliedReceiptFingerprint;
    const receipt = (await lookupTypedEntry(input.accountScopeHash, "receipt", input.receiptManifest, "applied_receipt", receiptFingerprint, input.session));
    if (receipt === undefined || subject === undefined) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    assertLedgerCrosslinks(operationById, subject, receipt);
    if (operationById === undefined) {
        return deepFreeze({
            status: "subject_only",
            subjectLedgerEntry: subject,
            appliedReceipt: receipt,
        });
    }
    if (operationById.schemaVersion ===
        "learning-v2-wallet-operation-alias-ledger-entry.v2") {
        return deepFreeze({
            status: "alias",
            operationLedgerEntry: operationById,
            subjectLedgerEntry: subject,
            appliedReceipt: receipt,
        });
    }
    return deepFreeze({
        status: "canonical",
        operationLedgerEntry: operationById,
        subjectLedgerEntry: subject,
        appliedReceipt: receipt,
    });
};
const preflightCanonicalClosurePlan = async (input) => {
    const operationById = (await lookupTypedEntry(input.accountScopeHash, "operation", input.operationManifest, "operation_id", input.operationId, input.session));
    const operationByFingerprint = (await lookupTypedEntry(input.accountScopeHash, "operation", input.operationManifest, "operation_fingerprint", input.operationFingerprint, input.session));
    const subject = (await lookupTypedEntry(input.accountScopeHash, "subject", input.subjectManifest, "semantic_subject", input.semanticSubjectFingerprint, input.session));
    const receipt = (await lookupTypedEntry(input.accountScopeHash, "receipt", input.receiptManifest, "applied_receipt", input.appliedReceiptFingerprint, input.session));
    const present = [
        operationById,
        operationByFingerprint,
        subject,
        receipt,
    ].filter((value) => value !== undefined).length;
    if (present === 0)
        return deepFreeze({ status: "absent" });
    if (present !== 4 ||
        operationById?.schemaVersion !==
            "learning-v2-wallet-operation-ledger-entry.v1" ||
        operationByFingerprint?.schemaVersion !==
            "learning-v2-wallet-operation-ledger-entry.v1" ||
        !sameCanonical(operationById, operationByFingerprint)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    assertLedgerCrosslinks(operationById, subject, receipt);
    return deepFreeze({
        status: "canonical",
        operationLedgerEntry: operationById,
        subjectLedgerEntry: subject,
        appliedReceipt: receipt,
    });
};
/** Typed lookup for canonical, subject-only and fully verifiable V2 alias rows. */
const lookupOwnerRepositoryCanonicalEconomicLedgerClosure = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationId",
        "operationFingerprint",
        "semanticSubjectFingerprint",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !(0, wallet_1.isWalletIdentifier)(request.operationId) ||
        typeof request.operationFingerprint !== "string" ||
        !HASH.test(request.operationFingerprint) ||
        typeof request.semanticSubjectFingerprint !== "string" ||
        !HASH.test(request.semanticSubjectFingerprint) ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    return lookupClosureWithSession({
        accountScopeHash: request.accountScopeHash,
        operationManifest: request.operationManifest,
        subjectManifest: request.subjectManifest,
        receiptManifest: request.receiptManifest,
        operationId: request.operationId,
        operationFingerprint: request.operationFingerprint,
        semanticSubjectFingerprint: request.semanticSubjectFingerprint,
        session,
    });
};
exports.lookupOwnerRepositoryCanonicalEconomicLedgerClosure = lookupOwnerRepositoryCanonicalEconomicLedgerClosure;
const mapPlanError = (error) => {
    const message = error instanceof Error ? error.message : "";
    if (message === "owner_index_read_budget_exceeded" ||
        message === "owner_economic_manifest_read_budget_exceeded") {
        throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    if (message === "owner_index_key_conflict" ||
        message === "owner_index_digest_collision") {
        throw new Error("owner_economic_manifest_conflict");
    }
    if (message === "owner_index_key_invalid" ||
        message === "owner_index_value_invalid" ||
        message === "owner_index_batch_invalid" ||
        message === "owner_index_manifest_invalid" ||
        message === "owner_index_read_budget_invalid") {
        throw new Error("owner_economic_manifest_invalid");
    }
    throw new Error("owner_economic_manifest_indeterminate");
};
const planOwnerRepositoryCanonicalEconomicClosure = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationLedgerEntry",
        "subjectLedgerEntry",
        "appliedReceipt",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function")
        throw new Error("owner_economic_manifest_invalid");
    let operationEntry;
    let subjectEntry;
    let receipt;
    try {
        operationEntry = (0, wallet_reducer_1.parseWalletOperationLedgerEntry)(request.operationLedgerEntry);
        subjectEntry = (0, wallet_reducer_1.parseWalletSubjectLedgerEntry)(request.subjectLedgerEntry);
        receipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(request.appliedReceipt);
        if (operationEntry.operationId !== operationEntry.canonicalOperationId ||
            operationEntry.operationFingerprint !==
                operationEntry.appliedReceipt.operationFingerprint ||
            receipt.accountScopeHash !== request.accountScopeHash ||
            !sameCanonical(operationEntry.appliedReceipt, receipt)) {
            throw new Error("canonical_binding_invalid");
        }
        assertLedgerCrosslinks(operationEntry, subjectEntry, receipt);
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    let existing;
    try {
        existing = await preflightCanonicalClosurePlan({
            accountScopeHash: request.accountScopeHash,
            operationManifest: request.operationManifest,
            subjectManifest: request.subjectManifest,
            receiptManifest: request.receiptManifest,
            operationId: operationEntry.operationId,
            operationFingerprint: operationEntry.operationFingerprint,
            semanticSubjectFingerprint: subjectEntry.semanticSubjectFingerprint,
            appliedReceiptFingerprint: receipt.appliedReceiptFingerprint,
            session,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_economic_manifest_read_budget_exceeded") {
            throw error;
        }
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (existing.status === "canonical" &&
        (!sameCanonical(existing.operationLedgerEntry, operationEntry) ||
            !sameCanonical(existing.subjectLedgerEntry, subjectEntry) ||
            !sameCanonical(existing.appliedReceipt, receipt))) {
        throw new Error("owner_economic_manifest_conflict");
    }
    let operationPlan;
    let subjectPlan;
    let receiptPlan;
    try {
        operationPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "operation",
            manifest: request.operationManifest,
            mutations: [
                {
                    keyKind: "operation_id",
                    logicalKey: operationEntry.operationId,
                    value: operationEntry,
                },
                {
                    keyKind: "operation_fingerprint",
                    logicalKey: operationEntry.operationFingerprint,
                    value: operationEntry,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
        subjectPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "subject",
            manifest: request.subjectManifest,
            mutations: [
                {
                    keyKind: "semantic_subject",
                    logicalKey: subjectEntry.semanticSubjectFingerprint,
                    value: subjectEntry,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
        receiptPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "receipt",
            manifest: request.receiptManifest,
            mutations: [
                {
                    keyKind: "applied_receipt",
                    logicalKey: receipt.appliedReceiptFingerprint,
                    value: receipt,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded)
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        return mapPlanError(error);
    }
    const changed = [
        operationPlan.changed,
        subjectPlan.changed,
        receiptPlan.changed,
    ];
    if (!changed.every(Boolean) && changed.some(Boolean)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const operationManifest = operationPlan.manifest;
    const subjectManifest = subjectPlan.manifest;
    const receiptManifest = receiptPlan.manifest;
    return deepFreeze({
        operationManifest,
        subjectManifest,
        receiptManifest,
        operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", operationManifest),
        subjectManifestBlob: materializeManifestBlob(request.accountScopeHash, "subject", subjectManifest),
        receiptManifestBlob: materializeManifestBlob(request.accountScopeHash, "receipt", receiptManifest),
        immutableNodeBlobs: [
            ...operationPlan.immutableBlobs,
            ...subjectPlan.immutableBlobs,
            ...receiptPlan.immutableBlobs,
        ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
        changed: changed[0],
    });
};
exports.planOwnerRepositoryCanonicalEconomicClosure = planOwnerRepositoryCanonicalEconomicClosure;
/**
 * Inserts the four cycle-free V2 canonical values. Every value commits the
 * exact pre-COW journal blob, so a future alias can resolve the canonical
 * effect without trusting a client-supplied journal reference.
 */
const planOwnerRepositoryCanonicalEconomicClosureV2 = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "journalRecordBlob",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function")
        throw new Error("owner_economic_manifest_invalid");
    let derivedValues;
    try {
        derivedValues = (0, owner_repository_economic_effect_v2_1.createOwnerRepositoryCanonicalEconomicIndexValuesV2)({
            journalRecordBlob: request.journalRecordBlob,
        });
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const valueBundle = readRecord(derivedValues, [
        "effectBinding",
        "operationValue",
        "subjectValue",
        "receiptValue",
    ]);
    const operationCandidate = readRecord(valueBundle.operationValue, [
        "schemaVersion",
        "valueKind",
        "ledgerEntry",
        "effectBinding",
        "valueFingerprint",
    ]);
    const subjectCandidate = readRecord(valueBundle.subjectValue, [
        "schemaVersion",
        "valueKind",
        "ledgerEntry",
        "effectBinding",
        "valueFingerprint",
    ]);
    const receiptCandidate = readRecord(valueBundle.receiptValue, [
        "schemaVersion",
        "valueKind",
        "appliedReceipt",
        "effectBinding",
        "valueFingerprint",
    ]);
    let operationLedger;
    let subjectLedger;
    let appliedReceipt;
    try {
        operationLedger = (0, wallet_reducer_1.parseWalletOperationLedgerEntry)(operationCandidate.ledgerEntry);
        subjectLedger = (0, wallet_reducer_1.parseWalletSubjectLedgerEntry)(subjectCandidate.ledgerEntry);
        appliedReceipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(receiptCandidate.appliedReceipt);
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const operationValue = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
        accountScopeHash: request.accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_id",
        logicalKey: operationLedger.operationId,
        value: valueBundle.operationValue,
    });
    const subjectValue = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
        accountScopeHash: request.accountScopeHash,
        indexKind: "subject",
        keyKind: "semantic_subject",
        logicalKey: subjectLedger.semanticSubjectFingerprint,
        value: valueBundle.subjectValue,
    });
    const receiptValue = (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
        accountScopeHash: request.accountScopeHash,
        indexKind: "receipt",
        keyKind: "applied_receipt",
        logicalKey: appliedReceipt.appliedReceiptFingerprint,
        value: valueBundle.receiptValue,
    });
    if (!sameCanonical(valueBundle.effectBinding, operationValue.effectBinding) ||
        !sameCanonical(operationValue.effectBinding, subjectValue.effectBinding) ||
        !sameCanonical(operationValue.effectBinding, receiptValue.effectBinding))
        throw new Error("owner_economic_manifest_invalid");
    const values = deepFreeze({
        effectBinding: operationValue.effectBinding,
        operationValue,
        subjectValue,
        receiptValue,
    });
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    let existing;
    try {
        existing = await lookupCanonicalV2ClosureWithSession({
            accountScopeHash: request.accountScopeHash,
            operationManifest: request.operationManifest,
            subjectManifest: request.subjectManifest,
            receiptManifest: request.receiptManifest,
            operationId: operationValue.ledgerEntry.operationId,
            operationFingerprint: operationValue.ledgerEntry.operationFingerprint,
            semanticSubjectFingerprint: subjectValue.ledgerEntry.semanticSubjectFingerprint,
            session,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_economic_manifest_read_budget_exceeded")
            throw error;
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (existing.status === "subject_only") {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (existing.status === "canonical" &&
        (!sameCanonical(existing.operationValue, operationValue) ||
            !sameCanonical(existing.subjectValue, subjectValue) ||
            !sameCanonical(existing.receiptValue, receiptValue)))
        throw new Error("owner_economic_manifest_conflict");
    let operationPlan;
    let subjectPlan;
    let receiptPlan;
    try {
        operationPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "operation",
            manifest: request.operationManifest,
            mutations: [
                {
                    keyKind: "operation_id",
                    logicalKey: operationValue.ledgerEntry.operationId,
                    value: operationValue,
                },
                {
                    keyKind: "operation_fingerprint",
                    logicalKey: operationValue.ledgerEntry.operationFingerprint,
                    value: operationValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
        subjectPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "subject",
            manifest: request.subjectManifest,
            mutations: [
                {
                    keyKind: "semantic_subject",
                    logicalKey: subjectValue.ledgerEntry.semanticSubjectFingerprint,
                    value: subjectValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
        receiptPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "receipt",
            manifest: request.receiptManifest,
            mutations: [
                {
                    keyKind: "applied_receipt",
                    logicalKey: receiptValue.appliedReceipt.appliedReceiptFingerprint,
                    value: receiptValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded)
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        return mapPlanError(error);
    }
    const changed = [
        operationPlan.changed,
        subjectPlan.changed,
        receiptPlan.changed,
    ];
    if (!changed.every(Boolean) && changed.some(Boolean)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const operationManifest = operationPlan.manifest;
    const subjectManifest = subjectPlan.manifest;
    const receiptManifest = receiptPlan.manifest;
    return deepFreeze({
        values,
        operationManifest,
        subjectManifest,
        receiptManifest,
        operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", operationManifest),
        subjectManifestBlob: materializeManifestBlob(request.accountScopeHash, "subject", subjectManifest),
        receiptManifestBlob: materializeManifestBlob(request.accountScopeHash, "receipt", receiptManifest),
        immutableNodeBlobs: [
            ...operationPlan.immutableBlobs,
            ...subjectPlan.immutableBlobs,
            ...receiptPlan.immutableBlobs,
        ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
        changed: changed[0],
    });
};
exports.planOwnerRepositoryCanonicalEconomicClosureV2 = planOwnerRepositoryCanonicalEconomicClosureV2;
/**
 * Inserts the exact four canonical compound-unlock coordinates into the same
 * lifetime radix manifests used by wallet credits. The value schema remains
 * effect-specific, while the radix key space stays account-global.
 */
const planOwnerRepositoryCourseUnlockEconomicClosureV2 = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "journalRecordBlob",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_economic_manifest_invalid");
    }
    let derivedValues;
    try {
        derivedValues = (0, owner_repository_course_unlock_economic_values_v2_1.createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2)({
            journalRecordBlob: request.journalRecordBlob,
        });
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const valueBundle = readRecord(derivedValues, [
        "effectBinding",
        "operationValue",
        "subjectValue",
        "receiptValue",
    ]);
    const operationCandidate = readRecord(valueBundle.operationValue, [
        "schemaVersion",
        "valueKind",
        "ledgerEntry",
        "effectBinding",
        "valueFingerprint",
    ]);
    const subjectCandidate = readRecord(valueBundle.subjectValue, [
        "schemaVersion",
        "valueKind",
        "ledgerEntry",
        "effectBinding",
        "valueFingerprint",
    ]);
    const receiptCandidate = readRecord(valueBundle.receiptValue, [
        "schemaVersion",
        "valueKind",
        "appliedReceipt",
        "effectBinding",
        "valueFingerprint",
    ]);
    const operationLedger = operationCandidate.ledgerEntry;
    const subjectLedger = subjectCandidate.ledgerEntry;
    const appliedReceipt = receiptCandidate.appliedReceipt;
    let operationValue;
    let subjectValue;
    let receiptValue;
    try {
        operationValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "operation",
            keyKind: "operation_id",
            logicalKey: operationLedger.operationId,
            value: valueBundle.operationValue,
        });
        subjectValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "subject",
            keyKind: "semantic_subject",
            logicalKey: subjectLedger.semanticSubjectFingerprint,
            value: valueBundle.subjectValue,
        });
        receiptValue = (0, owner_repository_course_unlock_economic_values_v2_1.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "receipt",
            keyKind: "applied_receipt",
            logicalKey: appliedReceipt.appliedReceiptFingerprint,
            value: valueBundle.receiptValue,
        });
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    if (!sameCanonical(valueBundle.effectBinding, operationValue.effectBinding) ||
        !sameCanonical(operationValue.effectBinding, subjectValue.effectBinding) ||
        !sameCanonical(operationValue.effectBinding, receiptValue.effectBinding)) {
        throw new Error("owner_economic_manifest_invalid");
    }
    const values = deepFreeze({
        effectBinding: operationValue.effectBinding,
        operationValue,
        subjectValue,
        receiptValue,
    });
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    let operationPlan;
    let subjectPlan;
    let receiptPlan;
    try {
        operationPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "operation",
            manifest: request.operationManifest,
            mutations: [
                {
                    keyKind: "operation_id",
                    logicalKey: operationValue.ledgerEntry.operationId,
                    value: operationValue,
                },
                {
                    keyKind: "operation_fingerprint",
                    logicalKey: operationValue.ledgerEntry.operationFingerprint,
                    value: operationValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
        subjectPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "subject",
            manifest: request.subjectManifest,
            mutations: [
                {
                    keyKind: "semantic_subject",
                    logicalKey: subjectValue.ledgerEntry.semanticSubjectFingerprint,
                    value: subjectValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
        receiptPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "receipt",
            manifest: request.receiptManifest,
            mutations: [
                {
                    keyKind: "applied_receipt",
                    logicalKey: receiptValue.appliedReceipt.appliedReceiptFingerprint,
                    value: receiptValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded) {
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        }
        return mapPlanError(error);
    }
    const changed = [
        operationPlan.changed,
        subjectPlan.changed,
        receiptPlan.changed,
    ];
    if (!changed.every(Boolean) && changed.some(Boolean)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const operationManifest = operationPlan.manifest;
    const subjectManifest = subjectPlan.manifest;
    const receiptManifest = receiptPlan.manifest;
    return deepFreeze({
        values,
        operationManifest,
        subjectManifest,
        receiptManifest,
        operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", operationManifest),
        subjectManifestBlob: materializeManifestBlob(request.accountScopeHash, "subject", subjectManifest),
        receiptManifestBlob: materializeManifestBlob(request.accountScopeHash, "receipt", receiptManifest),
        immutableNodeBlobs: [
            ...operationPlan.immutableBlobs,
            ...subjectPlan.immutableBlobs,
            ...receiptPlan.immutableBlobs,
        ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
        changed: changed[0],
    });
};
exports.planOwnerRepositoryCourseUnlockEconomicClosureV2 = planOwnerRepositoryCourseUnlockEconomicClosureV2;
/** Inserts the two alias keys while retaining the canonical effect binding. */
const planOwnerRepositoryOperationAliasV2 = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "authorizedAliasOperation",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function")
        throw new Error("owner_economic_manifest_invalid");
    let operation;
    try {
        operation = (0, wallet_1.createWalletAuthorizedOperation)(request.authorizedAliasOperation);
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    if (operation.accountScopeHash !== request.accountScopeHash) {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    let closure;
    try {
        closure = await lookupCanonicalV2ClosureWithSession({
            accountScopeHash: request.accountScopeHash,
            operationManifest: request.operationManifest,
            subjectManifest: request.subjectManifest,
            receiptManifest: request.receiptManifest,
            operationId: operation.operationId,
            operationFingerprint: operation.operationFingerprint,
            semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
            session,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_economic_manifest_read_budget_exceeded")
            throw error;
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (closure.status === "absent") {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (closure.status === "canonical") {
        throw new Error("owner_economic_manifest_conflict");
    }
    const receiptValue = closure.receiptValue;
    let aliasValue;
    try {
        aliasValue = (0, owner_repository_economic_effect_v2_1.createOwnerRepositoryOperationAliasIndexValueV2)({
            accountScopeHash: request.accountScopeHash,
            authorizedAliasOperation: operation,
            receiptValue,
        });
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    if (closure.status === "alias") {
        if (!sameCanonical(closure.operationValue, aliasValue)) {
            throw new Error("owner_economic_manifest_conflict");
        }
        return deepFreeze({
            aliasValue,
            operationManifest: request.operationManifest,
            operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", request.operationManifest),
            immutableNodeBlobs: [],
            changed: false,
        });
    }
    let operationPlan;
    try {
        operationPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "operation",
            manifest: request.operationManifest,
            mutations: [
                {
                    keyKind: "operation_id",
                    logicalKey: aliasValue.ledgerEntry.operationId,
                    value: aliasValue,
                },
                {
                    keyKind: "operation_fingerprint",
                    logicalKey: aliasValue.ledgerEntry.operationFingerprint,
                    value: aliasValue,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded)
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        return mapPlanError(error);
    }
    if (!operationPlan.changed) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const operationManifest = operationPlan.manifest;
    return deepFreeze({
        aliasValue,
        operationManifest,
        operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", operationManifest),
        immutableNodeBlobs: operationPlan.immutableBlobs,
        changed: true,
    });
};
exports.planOwnerRepositoryOperationAliasV2 = planOwnerRepositoryOperationAliasV2;
/**
 * Adds only the two verifiable transport-alias operation keys. The canonical
 * subject and receipt must already exist and remain byte-identical.
 */
const planOwnerRepositoryOperationAlias = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "authorizedAliasOperation",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function")
        throw new Error("owner_economic_manifest_invalid");
    let operation;
    try {
        operation = (0, wallet_1.createWalletAuthorizedOperation)(request.authorizedAliasOperation);
        if (operation.accountScopeHash !== request.accountScopeHash)
            throw new Error("scope_mismatch");
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    let closure;
    try {
        closure = await lookupClosureWithSession({
            accountScopeHash: request.accountScopeHash,
            operationManifest: request.operationManifest,
            subjectManifest: request.subjectManifest,
            receiptManifest: request.receiptManifest,
            operationId: operation.operationId,
            operationFingerprint: operation.operationFingerprint,
            semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
            session,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_economic_manifest_read_budget_exceeded")
            throw error;
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (closure.status === "absent" || closure.status === "canonical") {
        throw new Error("owner_economic_manifest_conflict");
    }
    let aliasEntry;
    try {
        aliasEntry = (0, wallet_reducer_1.createWalletOperationAliasLedgerEntry)({
            authorizedAliasOperation: operation,
            appliedReceipt: closure.appliedReceipt,
        });
    }
    catch {
        throw new Error("owner_economic_manifest_conflict");
    }
    if (closure.status === "alias") {
        if (!sameCanonical(closure.operationLedgerEntry, aliasEntry))
            throw new Error("owner_economic_manifest_conflict");
        return deepFreeze({
            aliasEntry,
            operationManifest: request.operationManifest,
            operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", request.operationManifest),
            immutableNodeBlobs: [],
            changed: false,
        });
    }
    let operationPlan;
    try {
        operationPlan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "operation",
            manifest: request.operationManifest,
            mutations: [
                {
                    keyKind: "operation_id",
                    logicalKey: aliasEntry.operationId,
                    value: aliasEntry,
                },
                {
                    keyKind: "operation_fingerprint",
                    logicalKey: aliasEntry.operationFingerprint,
                    value: aliasEntry,
                },
            ],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded)
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        return mapPlanError(error);
    }
    if (!operationPlan.changed)
        throw new Error("owner_economic_manifest_indeterminate");
    const operationManifest = operationPlan.manifest;
    return deepFreeze({
        aliasEntry,
        operationManifest,
        operationManifestBlob: materializeManifestBlob(request.accountScopeHash, "operation", operationManifest),
        immutableNodeBlobs: [...operationPlan.immutableBlobs].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
        changed: true,
    });
};
exports.planOwnerRepositoryOperationAlias = planOwnerRepositoryOperationAlias;
/**
 * Plans exactly one canonical missing-key insertion. This is a recovery
 * primitive, not corruption authority: repository history validation must prove
 * the referenced effect and the missing-key condition before publication.
 */
const planOwnerRepositoryCanonicalIndexRepair = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash", "operationManifest", "subjectManifest",
        "receiptManifest", "appliedReceipt", "repairKeyKind", "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function" ||
        !["operation_id", "operation_fingerprint", "semantic_subject", "applied_receipt"]
            .includes(request.repairKeyKind)) {
        throw new Error("owner_economic_manifest_invalid");
    }
    let entries;
    try {
        entries = (0, wallet_reducer_1.createWalletCanonicalLedgerEntriesFromAppliedReceipt)(request.appliedReceipt);
        if (entries.appliedReceipt.accountScopeHash !== request.accountScopeHash) {
            throw new Error("scope_mismatch");
        }
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const keyKind = request.repairKeyKind;
    const target = keyKind === "operation_id"
        ? {
            indexKind: "operation",
            logicalKey: entries.operationLedgerEntry.operationId,
            value: entries.operationLedgerEntry,
            manifest: request.operationManifest,
        }
        : keyKind === "operation_fingerprint"
            ? {
                indexKind: "operation",
                logicalKey: entries.operationLedgerEntry.operationFingerprint,
                value: entries.operationLedgerEntry,
                manifest: request.operationManifest,
            }
            : keyKind === "semantic_subject"
                ? {
                    indexKind: "subject",
                    logicalKey: entries.subjectLedgerEntry.semanticSubjectFingerprint,
                    value: entries.subjectLedgerEntry,
                    manifest: request.subjectManifest,
                }
                : {
                    indexKind: "receipt",
                    logicalKey: entries.appliedReceipt.appliedReceiptFingerprint,
                    value: entries.appliedReceipt,
                    manifest: request.receiptManifest,
                };
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const session = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    let existing;
    try {
        existing = await lookupTypedEntry(request.accountScopeHash, target.indexKind, target.manifest, keyKind, target.logicalKey, session);
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "owner_economic_manifest_read_budget_exceeded")
            throw error;
        throw new Error("owner_economic_manifest_indeterminate");
    }
    if (existing !== undefined) {
        if (!sameCanonical(existing, target.value)) {
            throw new Error("owner_economic_manifest_conflict");
        }
        return deepFreeze({
            indexKind: target.indexKind,
            keyKind,
            logicalKey: target.logicalKey,
            valueFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(target.value)),
            manifest: target.manifest,
            manifestBlob: materializeManifestBlob(request.accountScopeHash, target.indexKind, target.manifest),
            immutableNodeBlobs: [],
            changed: false,
        });
    }
    let plan;
    try {
        plan = await (0, owner_repository_radix_1.planOwnerRepositoryRadixBatch)({
            accountScopeHash: request.accountScopeHash,
            indexKind: target.indexKind,
            manifest: target.manifest,
            mutations: [{ keyKind, logicalKey: target.logicalKey, value: target.value }],
            resolveNode: session.resolveNode,
            readBudget: session.readBudget,
        });
    }
    catch (error) {
        if (session.budgetExceeded) {
            throw new Error("owner_economic_manifest_read_budget_exceeded");
        }
        return mapPlanError(error);
    }
    if (!plan.changed)
        throw new Error("owner_economic_manifest_indeterminate");
    const manifest = plan.manifest;
    return deepFreeze({
        indexKind: target.indexKind,
        keyKind,
        logicalKey: target.logicalKey,
        valueFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(target.value)),
        manifest,
        manifestBlob: materializeManifestBlob(request.accountScopeHash, target.indexKind, manifest),
        immutableNodeBlobs: [...plan.immutableBlobs].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
        changed: true,
    });
};
exports.planOwnerRepositoryCanonicalIndexRepair = planOwnerRepositoryCanonicalIndexRepair;
const assertOwnerRepositoryEconomicClosureForReceipt = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "appliedReceipt",
        "resolveNode",
    ], ["readBudget"]);
    let receipt;
    try {
        receipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(request.appliedReceipt);
    }
    catch {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const closure = await (0, exports.lookupOwnerRepositoryCanonicalEconomicLedgerClosure)({
        accountScopeHash: request.accountScopeHash,
        operationManifest: request.operationManifest,
        subjectManifest: request.subjectManifest,
        receiptManifest: request.receiptManifest,
        operationId: receipt.operationId,
        operationFingerprint: receipt.operationFingerprint,
        semanticSubjectFingerprint: receipt.semanticSubjectFingerprint,
        resolveNode: request.resolveNode,
        ...(hasReadBudget
            ? { readBudget: request.readBudget }
            : {}),
    });
    if (closure.status !== "canonical" ||
        !sameCanonical(closure.appliedReceipt, receipt)) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    return deepFreeze({
        operationLedgerEntry: closure.operationLedgerEntry,
        subjectLedgerEntry: closure.subjectLedgerEntry,
        appliedReceipt: closure.appliedReceipt,
    });
};
exports.assertOwnerRepositoryEconomicClosureForReceipt = assertOwnerRepositoryEconomicClosureForReceipt;
/** Typed bounded page over the complete economic radix graph. */
const auditOwnerRepositoryEconomicManifestPage = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "indexKind",
        "manifest",
        "cursor",
        "maxNodes",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !economicKind(request.indexKind) ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    let radix;
    try {
        radix = await (0, owner_repository_radix_1.auditOwnerRepositoryRadixPage)({
            accountScopeHash: request.accountScopeHash,
            indexKind: request.indexKind,
            manifest: request.manifest,
            cursor: request.cursor,
            maxNodes: request.maxNodes,
            resolveNode: request.resolveNode,
            ...(hasReadBudget
                ? { readBudget: request.readBudget }
                : {}),
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("budget"))
            throw error;
        if (error instanceof Error &&
            error.message === "owner_index_audit_invalid") {
            throw new Error("owner_economic_manifest_invalid");
        }
        throw new Error("owner_economic_manifest_indeterminate");
    }
    const typedValues = radix.entries.map((entry) => parseTypedEconomicValue(request.accountScopeHash, request.indexKind, entry));
    return deepFreeze({ radix, typedValues });
};
exports.auditOwnerRepositoryEconomicManifestPage = auditOwnerRepositoryEconomicManifestPage;
const zeroEconomicAuditSums = () => deepFreeze({
    operationIdCount: 0,
    operationFingerprintCount: 0,
    aliasOperationIdCount: 0,
    aliasOperationFingerprintCount: 0,
    subjectCount: 0,
    receiptCount: 0,
    operationIdSum: "0".repeat(64),
    operationFingerprintSum: "0".repeat(64),
    aliasOperationIdSum: "0".repeat(64),
    aliasOperationFingerprintSum: "0".repeat(64),
    subjectSum: "0".repeat(64),
    receiptSum: "0".repeat(64),
});
const addAuditHash = (left, right) => ((BigInt(`0x${left}`) + BigInt(`0x${right}`)) % HASH_MODULUS)
    .toString(16)
    .padStart(64, "0");
const checkedAuditCount = (value) => {
    if (!Number.isSafeInteger(value) || value > Number.MAX_SAFE_INTEGER) {
        throw new Error("owner_economic_manifest_indeterminate");
    }
    return value;
};
const receiptForAuditValue = (value) => value.schemaVersion === "learning-v2-wallet-applied-receipt.v1"
    ? value
    : value.appliedReceipt;
const manifestsAuditFingerprint = (operationManifest, subjectManifest, receiptManifest) => (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)({ operationManifest, subjectManifest, receiptManifest }));
/**
 * O(1)-memory cross-index audit. Commutative receipt-binding sums prove that the
 * operation-id, operation-fingerprint, subject and receipt families describe the
 * same lifetime set while the underlying radix pages prove every stored value.
 */
const auditOwnerRepositoryEconomicClosurePage = async (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "cursor",
        "maxNodes",
        "resolveNode",
    ], ["readBudget"]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_economic_manifest_invalid");
    }
    const operationManifest = request.operationManifest;
    const subjectManifest = request.subjectManifest;
    const receiptManifest = request.receiptManifest;
    const manifestsFingerprint = manifestsAuditFingerprint(operationManifest, subjectManifest, receiptManifest);
    let phase = "operation";
    let radixCursor = null;
    let sums = zeroEconomicAuditSums();
    if (request.cursor !== null) {
        if (!isRecord(request.cursor) ||
            !ECONOMIC_AUDIT_CURSORS.has(request.cursor)) {
            throw new Error("owner_economic_manifest_invalid");
        }
        const cursor = request.cursor;
        if (cursor.accountScopeHash !== request.accountScopeHash ||
            cursor.manifestsFingerprint !== manifestsFingerprint ||
            !economicKind(cursor.phase)) {
            throw new Error("owner_economic_manifest_invalid");
        }
        phase = cursor.phase;
        radixCursor = cursor.radixCursor;
        sums = cursor.sums;
    }
    const manifest = phase === "operation"
        ? operationManifest
        : phase === "subject"
            ? subjectManifest
            : receiptManifest;
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    const audited = await (0, exports.auditOwnerRepositoryEconomicManifestPage)({
        accountScopeHash: request.accountScopeHash,
        indexKind: phase,
        manifest,
        cursor: radixCursor,
        maxNodes: request.maxNodes,
        resolveNode: request.resolveNode,
        ...(hasReadBudget
            ? { readBudget: request.readBudget }
            : {}),
    });
    const mutable = { ...sums };
    const aliasLookupSession = createSharedResolverSession(request.resolveNode, hasReadBudget ? request.readBudget : undefined, hasReadBudget);
    for (let index = 0; index < audited.typedValues.length; index += 1) {
        const entry = audited.radix.entries[index];
        const typedValue = audited.typedValues[index];
        const receipt = receiptForAuditValue(typedValue);
        const bindingHash = (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(receipt));
        if (phase === "operation" &&
            typedValue.schemaVersion ===
                "learning-v2-wallet-operation-alias-ledger-entry.v2") {
            let storedSubject;
            let storedReceipt;
            try {
                storedSubject = await lookupTypedEntry(request.accountScopeHash, "subject", subjectManifest, "semantic_subject", typedValue.semanticSubjectFingerprint, aliasLookupSession);
                storedReceipt = await lookupTypedEntry(request.accountScopeHash, "receipt", receiptManifest, "applied_receipt", receipt.appliedReceiptFingerprint, aliasLookupSession);
            }
            catch (error) {
                if (error instanceof Error && error.message.includes("budget"))
                    throw error;
                throw new Error("owner_economic_manifest_indeterminate");
            }
            if (storedSubject === undefined ||
                storedReceipt === undefined ||
                !sameCanonical(storedSubject.appliedReceipt, receipt) ||
                !sameCanonical(storedReceipt, receipt))
                throw new Error("owner_economic_manifest_indeterminate");
            if (entry.keyKind === "operation_id") {
                mutable.aliasOperationIdCount = checkedAuditCount(mutable.aliasOperationIdCount + 1);
                mutable.aliasOperationIdSum = addAuditHash(mutable.aliasOperationIdSum, typedValue.aliasEntryFingerprint);
            }
            else if (entry.keyKind === "operation_fingerprint") {
                mutable.aliasOperationFingerprintCount = checkedAuditCount(mutable.aliasOperationFingerprintCount + 1);
                mutable.aliasOperationFingerprintSum = addAuditHash(mutable.aliasOperationFingerprintSum, typedValue.aliasEntryFingerprint);
            }
            else {
                throw new Error("owner_economic_manifest_indeterminate");
            }
        }
        else if (phase === "operation" && entry.keyKind === "operation_id") {
            mutable.operationIdCount = checkedAuditCount(mutable.operationIdCount + 1);
            mutable.operationIdSum = addAuditHash(mutable.operationIdSum, bindingHash);
        }
        else if (phase === "operation" &&
            entry.keyKind === "operation_fingerprint") {
            mutable.operationFingerprintCount = checkedAuditCount(mutable.operationFingerprintCount + 1);
            mutable.operationFingerprintSum = addAuditHash(mutable.operationFingerprintSum, bindingHash);
        }
        else if (phase === "subject") {
            mutable.subjectCount = checkedAuditCount(mutable.subjectCount + 1);
            mutable.subjectSum = addAuditHash(mutable.subjectSum, bindingHash);
        }
        else if (phase === "receipt") {
            mutable.receiptCount = checkedAuditCount(mutable.receiptCount + 1);
            mutable.receiptSum = addAuditHash(mutable.receiptSum, bindingHash);
        }
        else {
            throw new Error("owner_economic_manifest_indeterminate");
        }
    }
    sums = deepFreeze(mutable);
    let done = false;
    let nextPhase = phase;
    let nextRadixCursor = audited.radix.cursor;
    if (audited.radix.done) {
        if (phase === "operation")
            nextPhase = "subject";
        else if (phase === "subject")
            nextPhase = "receipt";
        else
            done = true;
        nextRadixCursor = null;
    }
    if (done) {
        const expected = sums.receiptCount;
        if (sums.operationIdCount !== expected ||
            sums.operationFingerprintCount !== expected ||
            sums.subjectCount !== expected ||
            sums.operationIdSum !== sums.receiptSum ||
            sums.operationFingerprintSum !== sums.receiptSum ||
            sums.subjectSum !== sums.receiptSum ||
            sums.aliasOperationIdCount !== sums.aliasOperationFingerprintCount ||
            sums.aliasOperationIdSum !== sums.aliasOperationFingerprintSum) {
            throw new Error("owner_economic_manifest_indeterminate");
        }
        return deepFreeze({
            done: true,
            cursor: null,
            auditedPhase: phase,
            radix: audited.radix,
        });
    }
    const cursor = deepFreeze({
        schemaVersion: "learning-v2-owner-economic-closure-audit-cursor.v1",
        accountScopeHash: request.accountScopeHash,
        manifestsFingerprint,
        phase: nextPhase,
        authority: "in_process_economic_audit_cursor",
        radixCursor: nextRadixCursor,
        sums,
    });
    ECONOMIC_AUDIT_CURSORS.add(cursor);
    return deepFreeze({
        done: false,
        cursor,
        auditedPhase: phase,
        radix: audited.radix,
    });
};
exports.auditOwnerRepositoryEconomicClosurePage = auditOwnerRepositoryEconomicClosurePage;
const isOwnerRepositoryEconomicClosureAuditCursor = (value) => isRecord(value) && ECONOMIC_AUDIT_CURSORS.has(value);
exports.isOwnerRepositoryEconomicClosureAuditCursor = isOwnerRepositoryEconomicClosureAuditCursor;
//# sourceMappingURL=owner_repository_economic_manifest.js.map