"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnerRepositoryOperationAliasRecordBlobV2 = exports.materializeOwnerRepositoryOperationAliasRecordBlobV2 = exports.parseOwnerRepositoryOperationAliasRecordV2 = exports.createOwnerRepositoryOperationAliasRecordV2 = exports.assertOwnerRepositoryCanonicalEffectBindingV2 = exports.parseOwnerRepositoryCanonicalEconomicIndexValueV2 = exports.createOwnerRepositoryOperationAliasIndexValueV2 = exports.createOwnerRepositoryCanonicalEconomicIndexValuesV2 = exports.parseOwnerRepositoryWalletCreditEffectRecordBlobV2 = exports.materializeOwnerRepositoryWalletCreditEffectRecordBlobV2 = exports.parseOwnerRepositoryWalletCreditEffectRecordV2 = exports.createOwnerRepositoryWalletCreditEffectRecordV2 = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const wallet_reducer_1 = require("./wallet_reducer");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BLOB_BYTES = 512 * 1024;
const REF_KEYS = [
    "schemaVersion",
    "kind",
    "blobKey",
    "blobFingerprint",
];
const CREATE_KEYS = [
    "accountScopeHash",
    "journalSequence",
    "repositoryRevisionBefore",
    "rootBeforeFingerprint",
    "previousJournalRecordRef",
    "walletStateBeforeRef",
    "walletStateAfterRef",
    "operationIndexManifestBeforeRef",
    "subjectIndexManifestBeforeRef",
    "receiptIndexManifestBeforeRef",
    "appliedReceipt",
];
const RECORD_KEYS = [
    "schemaVersion",
    "recordKind",
    "accountScopeHash",
    "acceptedAccountGeneration",
    "journalSequence",
    "repositoryRevisionBefore",
    "rootBeforeFingerprint",
    "previousJournalRecordRef",
    "canonicalOperationId",
    "operationFingerprint",
    "semanticSubjectFingerprint",
    "semanticFingerprint",
    "appliedReceiptFingerprint",
    "walletStateBeforeFingerprint",
    "walletStateAfterFingerprint",
    "walletStateBeforeRef",
    "walletStateAfterRef",
    "operationIndexManifestBeforeRef",
    "subjectIndexManifestBeforeRef",
    "receiptIndexManifestBeforeRef",
    "appliedReceipt",
    "journalRecordFingerprint",
];
const ENVELOPE_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "kind",
    "payload",
];
const BINDING_KEYS = [
    "schemaVersion",
    "effectKind",
    "accountScopeHash",
    "acceptedAccountGeneration",
    "effectJournalSequence",
    "canonicalEffectJournalRecordRef",
    "canonicalEffectJournalRecordFingerprint",
    "canonicalOperationId",
    "operationFingerprint",
    "semanticSubjectFingerprint",
    "semanticFingerprint",
    "appliedReceiptFingerprint",
    "bindingFingerprint",
];
const OPERATION_VALUE_KEYS = [
    "schemaVersion",
    "valueKind",
    "ledgerEntry",
    "effectBinding",
    "valueFingerprint",
];
const ALIAS_VALUE_KEYS = OPERATION_VALUE_KEYS;
const SUBJECT_VALUE_KEYS = OPERATION_VALUE_KEYS;
const RECEIPT_VALUE_KEYS = [
    "schemaVersion",
    "valueKind",
    "appliedReceipt",
    "effectBinding",
    "valueFingerprint",
];
const ALIAS_RECORD_CREATE_KEYS = [
    "accountScopeHash",
    "journalSequence",
    "repositoryRevisionBefore",
    "rootBeforeFingerprint",
    "previousJournalRecordRef",
    "walletStateRef",
    "operationIndexManifestBeforeRef",
    "operationIndexManifestAfterRef",
    "subjectIndexManifestRef",
    "receiptIndexManifestRef",
    "aliasValue",
];
const ALIAS_RECORD_KEYS = [
    "schemaVersion",
    "recordKind",
    "accountScopeHash",
    "acceptedAccountGeneration",
    "journalSequence",
    "repositoryRevisionBefore",
    "rootBeforeFingerprint",
    "previousJournalRecordRef",
    "walletStateRef",
    "operationIndexManifestBeforeRef",
    "operationIndexManifestAfterRef",
    "subjectIndexManifestRef",
    "receiptIndexManifestRef",
    "canonicalEffectBinding",
    "aliasValue",
    "journalRecordFingerprint",
];
const invalid = () => {
    throw new Error("owner_repository_economic_effect_v2_invalid");
};
const indeterminate = () => {
    throw new Error("owner_repository_economic_effect_v2_indeterminate");
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => {
    const own = Reflect.ownKeys(value);
    return (own.length === keys.length &&
        own.every((key) => typeof key === "string" && keys.includes(key)));
};
const safe = (value, minimum = 0) => Number.isSafeInteger(value) &&
    !Object.is(value, -0) &&
    Number(value) >= minimum;
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const deepFreeze = (value) => {
    const stack = [value];
    const seen = new Set();
    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current !== "object" ||
            current === null ||
            seen.has(current))
            continue;
        seen.add(current);
        Object.freeze(current);
        for (const child of Object.values(current)) {
            stack.push(child);
        }
    }
    return value;
};
const readRecord = (input, keys, code = "invalid") => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        return code === "invalid" ? invalid() : indeterminate();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length ||
        own.some((key) => typeof key !== "string" || !keys.includes(key)) ||
        keys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        })) {
        return code === "invalid" ? invalid() : indeterminate();
    }
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const detachRecord = (input, keys, stored = false) => {
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, stored
            ? "owner_repository_economic_effect_v2_indeterminate"
            : "owner_repository_economic_effect_v2_invalid");
    }
    catch {
        return stored ? indeterminate() : invalid();
    }
    return readRecord(detached, keys, stored ? "indeterminate" : "invalid");
};
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseRef = (input, accountScopeHash, kind, stored = false) => {
    const value = readRecord(input, REF_KEYS, stored ? "indeterminate" : "invalid");
    if (value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        value.kind !== kind ||
        typeof value.blobFingerprint !== "string" ||
        !HASH.test(value.blobFingerprint) ||
        value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)) {
        return stored ? indeterminate() : invalid();
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
        kind,
        blobKey: value.blobKey,
        blobFingerprint: value.blobFingerprint,
    });
};
const parseCoordinates = (input, stored) => {
    const value = detachRecord(input, stored ? RECORD_KEYS : CREATE_KEYS, stored);
    if (typeof value.accountScopeHash !== "string" ||
        !ACCOUNT.test(value.accountScopeHash) ||
        !safe(value.journalSequence, 1) ||
        !safe(value.repositoryRevisionBefore) ||
        value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
        typeof value.rootBeforeFingerprint !== "string" ||
        !HASH.test(value.rootBeforeFingerprint)) {
        return stored ? indeterminate() : invalid();
    }
    const accountScopeHash = value.accountScopeHash;
    const journalSequence = Number(value.journalSequence);
    const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
    if (journalSequence - 1 > repositoryRevisionBefore) {
        return stored ? indeterminate() : invalid();
    }
    const previousJournalRecordRef = value.previousJournalRecordRef === null
        ? null
        : parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record", stored);
    if ((journalSequence === 1) !== (previousJournalRecordRef === null)) {
        return stored ? indeterminate() : invalid();
    }
    return {
        value,
        accountScopeHash,
        journalSequence,
        repositoryRevisionBefore,
        rootBeforeFingerprint: value.rootBeforeFingerprint,
        previousJournalRecordRef,
        walletStateBeforeRef: parseRef(value.walletStateBeforeRef, accountScopeHash, "wallet_state", stored),
        walletStateAfterRef: parseRef(value.walletStateAfterRef, accountScopeHash, "wallet_state", stored),
        operationIndexManifestBeforeRef: parseRef(value.operationIndexManifestBeforeRef, accountScopeHash, "operation_index_manifest", stored),
        subjectIndexManifestBeforeRef: parseRef(value.subjectIndexManifestBeforeRef, accountScopeHash, "subject_index_manifest", stored),
        receiptIndexManifestBeforeRef: parseRef(value.receiptIndexManifestBeforeRef, accountScopeHash, "receipt_index_manifest", stored),
    };
};
const createOwnerRepositoryWalletCreditEffectRecordV2 = (input) => {
    const parsed = parseCoordinates(input, false);
    let appliedReceipt;
    try {
        appliedReceipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(parsed.value.appliedReceipt);
    }
    catch {
        return invalid();
    }
    const refs = [
        parsed.walletStateBeforeRef,
        parsed.walletStateAfterRef,
        parsed.operationIndexManifestBeforeRef,
        parsed.subjectIndexManifestBeforeRef,
        parsed.receiptIndexManifestBeforeRef,
        ...(parsed.previousJournalRecordRef
            ? [parsed.previousJournalRecordRef]
            : []),
    ];
    if (appliedReceipt.accountScopeHash !== parsed.accountScopeHash ||
        parsed.walletStateBeforeRef.blobFingerprint ===
            parsed.walletStateAfterRef.blobFingerprint ||
        new Set(refs.map((ref) => ref.blobFingerprint)).size !== refs.length)
        return invalid();
    const body = {
        schemaVersion: "learning-v2-owner-repository-wallet-credit-effect-record.v2",
        recordKind: "wallet_credit",
        accountScopeHash: parsed.accountScopeHash,
        acceptedAccountGeneration: appliedReceipt.accountGeneration,
        journalSequence: parsed.journalSequence,
        repositoryRevisionBefore: parsed.repositoryRevisionBefore,
        rootBeforeFingerprint: parsed.rootBeforeFingerprint,
        previousJournalRecordRef: parsed.previousJournalRecordRef,
        canonicalOperationId: appliedReceipt.operationId,
        operationFingerprint: appliedReceipt.operationFingerprint,
        semanticSubjectFingerprint: appliedReceipt.semanticSubjectFingerprint,
        semanticFingerprint: appliedReceipt.semanticFingerprint,
        appliedReceiptFingerprint: appliedReceipt.appliedReceiptFingerprint,
        walletStateBeforeFingerprint: appliedReceipt.stateBeforeFingerprint,
        walletStateAfterFingerprint: appliedReceipt.stateAfterFingerprint,
        walletStateBeforeRef: parsed.walletStateBeforeRef,
        walletStateAfterRef: parsed.walletStateAfterRef,
        operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
        subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
        receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
        appliedReceipt,
    };
    return deepFreeze({
        ...body,
        journalRecordFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.createOwnerRepositoryWalletCreditEffectRecordV2 = createOwnerRepositoryWalletCreditEffectRecordV2;
const parseOwnerRepositoryWalletCreditEffectRecordV2 = (input) => {
    const parsed = parseCoordinates(input, true);
    const value = parsed.value;
    if (value.schemaVersion !==
        "learning-v2-owner-repository-wallet-credit-effect-record.v2" ||
        value.recordKind !== "wallet_credit" ||
        !safe(value.acceptedAccountGeneration) ||
        !(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId) ||
        ![
            value.operationFingerprint,
            value.semanticSubjectFingerprint,
            value.semanticFingerprint,
            value.appliedReceiptFingerprint,
            value.walletStateBeforeFingerprint,
            value.walletStateAfterFingerprint,
            value.journalRecordFingerprint,
        ].every((candidate) => typeof candidate === "string" && HASH.test(candidate)))
        return indeterminate();
    let rebuilt;
    try {
        rebuilt = (0, exports.createOwnerRepositoryWalletCreditEffectRecordV2)({
            accountScopeHash: parsed.accountScopeHash,
            journalSequence: parsed.journalSequence,
            repositoryRevisionBefore: parsed.repositoryRevisionBefore,
            rootBeforeFingerprint: parsed.rootBeforeFingerprint,
            previousJournalRecordRef: parsed.previousJournalRecordRef,
            walletStateBeforeRef: parsed.walletStateBeforeRef,
            walletStateAfterRef: parsed.walletStateAfterRef,
            operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
            subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
            receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
            appliedReceipt: value.appliedReceipt,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(rebuilt, value))
        return indeterminate();
    return rebuilt;
};
exports.parseOwnerRepositoryWalletCreditEffectRecordV2 = parseOwnerRepositoryWalletCreditEffectRecordV2;
const materializeOwnerRepositoryWalletCreditEffectRecordBlobV2 = (recordInput) => {
    let record;
    try {
        record = (0, exports.parseOwnerRepositoryWalletCreditEffectRecordV2)(recordInput);
    }
    catch {
        return invalid();
    }
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash: record.accountScopeHash,
        kind: "journal_record",
        payload: record,
    };
    let encoded;
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
        if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BLOB_BYTES)
            return invalid();
    }
    catch {
        return invalid();
    }
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "journal_record",
            blobKey: blobKey(record.accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
        encoded,
        record,
    });
};
exports.materializeOwnerRepositoryWalletCreditEffectRecordBlobV2 = materializeOwnerRepositoryWalletCreditEffectRecordBlobV2;
const parseOwnerRepositoryWalletCreditEffectRecordBlobV2 = (input) => {
    const request = readRecord(input, ["accountScopeHash", "ref", "raw"], "indeterminate");
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.raw !== "string")
        return indeterminate();
    const ref = parseRef(request.ref, request.accountScopeHash, "journal_record", true);
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MAX_BLOB_BYTES ||
            (0, decision_registry_1.sha256Utf8)(request.raw) !== ref.blobFingerprint)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    let envelope;
    try {
        envelope = JSON.parse(request.raw);
        if ((0, decision_registry_1.canonicalJsonV1)(envelope) !== request.raw)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    if (!isRecord(envelope) ||
        !exactKeys(envelope, ENVELOPE_KEYS) ||
        envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        envelope.accountScopeHash !== request.accountScopeHash ||
        envelope.kind !== "journal_record")
        return indeterminate();
    const record = (0, exports.parseOwnerRepositoryWalletCreditEffectRecordV2)(envelope.payload);
    const rebuilt = (0, exports.materializeOwnerRepositoryWalletCreditEffectRecordBlobV2)(record);
    if (rebuilt.encoded !== request.raw || !same(rebuilt.ref, ref)) {
        return indeterminate();
    }
    return rebuilt;
};
exports.parseOwnerRepositoryWalletCreditEffectRecordBlobV2 = parseOwnerRepositoryWalletCreditEffectRecordBlobV2;
const createBinding = (blob) => {
    const record = blob.record;
    const body = {
        schemaVersion: "learning-v2-owner-repository-canonical-effect-binding.v2",
        effectKind: "wallet_credit",
        accountScopeHash: record.accountScopeHash,
        acceptedAccountGeneration: record.acceptedAccountGeneration,
        effectJournalSequence: record.journalSequence,
        canonicalEffectJournalRecordRef: blob.ref,
        canonicalEffectJournalRecordFingerprint: record.journalRecordFingerprint,
        canonicalOperationId: record.canonicalOperationId,
        operationFingerprint: record.operationFingerprint,
        semanticSubjectFingerprint: record.semanticSubjectFingerprint,
        semanticFingerprint: record.semanticFingerprint,
        appliedReceiptFingerprint: record.appliedReceiptFingerprint,
    };
    return deepFreeze({
        ...body,
        bindingFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
const valueWithFingerprint = (body) => deepFreeze({ ...body, valueFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
const createOwnerRepositoryCanonicalEconomicIndexValuesV2 = (input) => {
    const request = readRecord(input, ["journalRecordBlob"]);
    const wrapper = readRecord(request.journalRecordBlob, ["ref", "encoded", "record"]);
    let blob;
    try {
        const detachedRecord = detachRecord(wrapper.record, RECORD_KEYS);
        if (typeof detachedRecord.accountScopeHash !== "string" ||
            !ACCOUNT.test(detachedRecord.accountScopeHash))
            return invalid();
        blob = (0, exports.parseOwnerRepositoryWalletCreditEffectRecordBlobV2)({
            accountScopeHash: detachedRecord.accountScopeHash,
            ref: wrapper.ref,
            raw: wrapper.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (!same(blob.record, wrapper.record))
        return invalid();
    const entries = (0, wallet_reducer_1.createWalletCanonicalLedgerEntriesFromAppliedReceipt)(blob.record.appliedReceipt);
    const binding = createBinding(blob);
    const operationValue = valueWithFingerprint({
        schemaVersion: "learning-v2-owner-repository-canonical-operation-index-value.v2",
        valueKind: "canonical_operation",
        ledgerEntry: entries.operationLedgerEntry,
        effectBinding: binding,
    });
    const subjectValue = valueWithFingerprint({
        schemaVersion: "learning-v2-owner-repository-canonical-subject-index-value.v2",
        valueKind: "canonical_subject",
        ledgerEntry: entries.subjectLedgerEntry,
        effectBinding: binding,
    });
    const receiptValue = valueWithFingerprint({
        schemaVersion: "learning-v2-owner-repository-canonical-receipt-index-value.v2",
        valueKind: "canonical_receipt",
        appliedReceipt: blob.record.appliedReceipt,
        effectBinding: binding,
    });
    return deepFreeze({
        effectBinding: binding,
        operationValue,
        subjectValue,
        receiptValue,
    });
};
exports.createOwnerRepositoryCanonicalEconomicIndexValuesV2 = createOwnerRepositoryCanonicalEconomicIndexValuesV2;
const createOwnerRepositoryOperationAliasIndexValueV2 = (input) => {
    const request = readRecord(input, [
        "accountScopeHash",
        "authorizedAliasOperation",
        "receiptValue",
    ]);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash))
        return invalid();
    const receiptCandidate = readRecord(request.receiptValue, RECEIPT_VALUE_KEYS);
    let receipt;
    let authorizedAliasOperation;
    try {
        receipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(receiptCandidate.appliedReceipt);
        authorizedAliasOperation = (0, wallet_1.createWalletAuthorizedOperation)(request.authorizedAliasOperation);
    }
    catch {
        return invalid();
    }
    let parsedReceipt;
    try {
        parsedReceipt = (0, exports.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
            accountScopeHash: request.accountScopeHash,
            indexKind: "receipt",
            keyKind: "applied_receipt",
            logicalKey: receipt.appliedReceiptFingerprint,
            value: request.receiptValue,
        });
    }
    catch {
        return invalid();
    }
    let ledgerEntry;
    try {
        ledgerEntry = (0, wallet_reducer_1.createWalletOperationAliasLedgerEntry)({
            authorizedAliasOperation,
            appliedReceipt: parsedReceipt.appliedReceipt,
        });
    }
    catch {
        return invalid();
    }
    return valueWithFingerprint({
        schemaVersion: "learning-v2-owner-repository-operation-alias-index-value.v2",
        valueKind: "operation_alias",
        ledgerEntry,
        effectBinding: parsedReceipt.effectBinding,
    });
};
exports.createOwnerRepositoryOperationAliasIndexValueV2 = createOwnerRepositoryOperationAliasIndexValueV2;
const parseBinding = (input, receipt) => {
    const value = detachRecord(input, BINDING_KEYS, true);
    if (value.schemaVersion !==
        "learning-v2-owner-repository-canonical-effect-binding.v2" ||
        value.effectKind !== "wallet_credit" ||
        typeof value.accountScopeHash !== "string" ||
        !ACCOUNT.test(value.accountScopeHash) ||
        !safe(value.acceptedAccountGeneration) ||
        !safe(value.effectJournalSequence, 1) ||
        !(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId) ||
        ![
            value.canonicalEffectJournalRecordFingerprint,
            value.operationFingerprint,
            value.semanticSubjectFingerprint,
            value.semanticFingerprint,
            value.appliedReceiptFingerprint,
            value.bindingFingerprint,
        ].every((candidate) => typeof candidate === "string" && HASH.test(candidate)))
        return indeterminate();
    const ref = parseRef(value.canonicalEffectJournalRecordRef, value.accountScopeHash, "journal_record", true);
    const body = {
        schemaVersion: value.schemaVersion,
        effectKind: value.effectKind,
        accountScopeHash: value.accountScopeHash,
        acceptedAccountGeneration: value.acceptedAccountGeneration,
        effectJournalSequence: value.effectJournalSequence,
        canonicalEffectJournalRecordRef: ref,
        canonicalEffectJournalRecordFingerprint: value.canonicalEffectJournalRecordFingerprint,
        canonicalOperationId: value.canonicalOperationId,
        operationFingerprint: value.operationFingerprint,
        semanticSubjectFingerprint: value.semanticSubjectFingerprint,
        semanticFingerprint: value.semanticFingerprint,
        appliedReceiptFingerprint: value.appliedReceiptFingerprint,
    };
    if (value.bindingFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body) ||
        value.accountScopeHash !== receipt.accountScopeHash ||
        value.acceptedAccountGeneration !== receipt.accountGeneration ||
        value.canonicalOperationId !== receipt.operationId ||
        value.operationFingerprint !== receipt.operationFingerprint ||
        value.semanticSubjectFingerprint !== receipt.semanticSubjectFingerprint ||
        value.semanticFingerprint !== receipt.semanticFingerprint ||
        value.appliedReceiptFingerprint !== receipt.appliedReceiptFingerprint)
        return indeterminate();
    return deepFreeze({
        ...body,
        bindingFingerprint: value.bindingFingerprint,
    });
};
const parseOwnerRepositoryCanonicalEconomicIndexValueV2 = (input) => {
    const request = readRecord(input, ["accountScopeHash", "indexKind", "keyKind", "logicalKey", "value"], "indeterminate");
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.logicalKey !== "string")
        return indeterminate();
    let value;
    let receipt;
    let parsedLedger;
    let keys;
    if (request.indexKind === "operation") {
        const operationShape = readRecord(request.value, OPERATION_VALUE_KEYS, "indeterminate");
        keys =
            operationShape.schemaVersion ===
                "learning-v2-owner-repository-operation-alias-index-value.v2"
                ? ALIAS_VALUE_KEYS
                : OPERATION_VALUE_KEYS;
    }
    else if (request.indexKind === "subject")
        keys = SUBJECT_VALUE_KEYS;
    else if (request.indexKind === "receipt")
        keys = RECEIPT_VALUE_KEYS;
    else
        return indeterminate();
    value = detachRecord(request.value, keys, true);
    try {
        if (request.indexKind === "operation") {
            if ((request.keyKind !== "operation_id" &&
                request.keyKind !== "operation_fingerprint") ||
                (value.schemaVersion !==
                    "learning-v2-owner-repository-canonical-operation-index-value.v2" &&
                    value.schemaVersion !==
                        "learning-v2-owner-repository-operation-alias-index-value.v2"))
                return indeterminate();
            if (value.schemaVersion ===
                "learning-v2-owner-repository-operation-alias-index-value.v2") {
                if (value.valueKind !== "operation_alias")
                    return indeterminate();
                parsedLedger = (0, wallet_reducer_1.parseWalletOperationAliasLedgerEntry)(value.ledgerEntry);
            }
            else {
                if (value.valueKind !== "canonical_operation")
                    return indeterminate();
                parsedLedger = (0, wallet_reducer_1.parseWalletOperationLedgerEntry)(value.ledgerEntry);
            }
            receipt = parsedLedger.appliedReceipt;
            if ((request.keyKind === "operation_id" &&
                parsedLedger.operationId !== request.logicalKey) ||
                (request.keyKind === "operation_fingerprint" &&
                    parsedLedger.operationFingerprint !== request.logicalKey))
                return indeterminate();
        }
        else if (request.indexKind === "subject") {
            if (value.schemaVersion !==
                "learning-v2-owner-repository-canonical-subject-index-value.v2" ||
                value.valueKind !== "canonical_subject" ||
                request.keyKind !== "semantic_subject")
                return indeterminate();
            parsedLedger = (0, wallet_reducer_1.parseWalletSubjectLedgerEntry)(value.ledgerEntry);
            receipt = parsedLedger.appliedReceipt;
            if (parsedLedger.semanticSubjectFingerprint !== request.logicalKey) {
                return indeterminate();
            }
        }
        else {
            if (value.schemaVersion !==
                "learning-v2-owner-repository-canonical-receipt-index-value.v2" ||
                value.valueKind !== "canonical_receipt" ||
                request.keyKind !== "applied_receipt")
                return indeterminate();
            receipt = (0, wallet_reducer_1.parseWalletAppliedReceipt)(value.appliedReceipt);
            parsedLedger = (0, wallet_reducer_1.createWalletCanonicalLedgerEntriesFromAppliedReceipt)(receipt).subjectLedgerEntry;
            if (receipt.appliedReceiptFingerprint !== request.logicalKey) {
                return indeterminate();
            }
        }
    }
    catch {
        return indeterminate();
    }
    if (receipt.accountScopeHash !== request.accountScopeHash) {
        return indeterminate();
    }
    const binding = parseBinding(value.effectBinding, receipt);
    const body = request.indexKind === "receipt"
        ? {
            schemaVersion: value.schemaVersion,
            valueKind: value.valueKind,
            appliedReceipt: receipt,
            effectBinding: binding,
        }
        : {
            schemaVersion: value.schemaVersion,
            valueKind: value.valueKind,
            ledgerEntry: parsedLedger,
            effectBinding: binding,
        };
    if (typeof value.valueFingerprint !== "string" ||
        value.valueFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body) ||
        !same(value, { ...body, valueFingerprint: value.valueFingerprint }))
        return indeterminate();
    return deepFreeze({
        ...body,
        valueFingerprint: value.valueFingerprint,
    });
};
exports.parseOwnerRepositoryCanonicalEconomicIndexValueV2 = parseOwnerRepositoryCanonicalEconomicIndexValueV2;
/**
 * Resolves the binding against exact journal bytes. This is content proof only;
 * repository ancestry still has to prove that the record is on the current
 * checkpoint/root chain before a no-effect alias can be published.
 */
const assertOwnerRepositoryCanonicalEffectBindingV2 = (input) => {
    const request = readRecord(input, ["effectBinding", "raw"]);
    let binding;
    try {
        const detached = detachRecord(request.effectBinding, BINDING_KEYS, true);
        if (typeof detached.accountScopeHash !== "string" ||
            !ACCOUNT.test(detached.accountScopeHash))
            return invalid();
        const blob = (0, exports.parseOwnerRepositoryWalletCreditEffectRecordBlobV2)({
            accountScopeHash: detached.accountScopeHash,
            ref: detached.canonicalEffectJournalRecordRef,
            raw: request.raw,
        });
        binding = parseBinding(detached, blob.record.appliedReceipt);
        if (binding.canonicalEffectJournalRecordFingerprint !==
            blob.record.journalRecordFingerprint ||
            binding.effectJournalSequence !== blob.record.journalSequence ||
            !same(binding.canonicalEffectJournalRecordRef, blob.ref))
            return invalid();
        return blob;
    }
    catch {
        return invalid();
    }
};
exports.assertOwnerRepositoryCanonicalEffectBindingV2 = assertOwnerRepositoryCanonicalEffectBindingV2;
const parseAliasRecordCoordinates = (input, stored) => {
    const value = detachRecord(input, stored ? ALIAS_RECORD_KEYS : ALIAS_RECORD_CREATE_KEYS, stored);
    const reject = () => stored ? indeterminate() : invalid();
    if (typeof value.accountScopeHash !== "string" ||
        !ACCOUNT.test(value.accountScopeHash) ||
        !safe(value.journalSequence, 2) ||
        !safe(value.repositoryRevisionBefore) ||
        value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
        typeof value.rootBeforeFingerprint !== "string" ||
        !HASH.test(value.rootBeforeFingerprint))
        return reject();
    const accountScopeHash = value.accountScopeHash;
    const journalSequence = Number(value.journalSequence);
    const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
    if (journalSequence - 1 > repositoryRevisionBefore)
        return reject();
    return {
        value,
        accountScopeHash,
        journalSequence,
        repositoryRevisionBefore,
        rootBeforeFingerprint: value.rootBeforeFingerprint,
        previousJournalRecordRef: parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record", stored),
        walletStateRef: parseRef(value.walletStateRef, accountScopeHash, "wallet_state", stored),
        operationIndexManifestBeforeRef: parseRef(value.operationIndexManifestBeforeRef, accountScopeHash, "operation_index_manifest", stored),
        operationIndexManifestAfterRef: parseRef(value.operationIndexManifestAfterRef, accountScopeHash, "operation_index_manifest", stored),
        subjectIndexManifestRef: parseRef(value.subjectIndexManifestRef, accountScopeHash, "subject_index_manifest", stored),
        receiptIndexManifestRef: parseRef(value.receiptIndexManifestRef, accountScopeHash, "receipt_index_manifest", stored),
    };
};
const createOwnerRepositoryOperationAliasRecordV2 = (input) => {
    const parsed = parseAliasRecordCoordinates(input, false);
    let ledgerEntry;
    let aliasValue;
    try {
        const candidate = readRecord(parsed.value.aliasValue, ALIAS_VALUE_KEYS);
        ledgerEntry = (0, wallet_reducer_1.parseWalletOperationAliasLedgerEntry)(candidate.ledgerEntry);
        aliasValue = (0, exports.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
            accountScopeHash: parsed.accountScopeHash,
            indexKind: "operation",
            keyKind: "operation_id",
            logicalKey: ledgerEntry.operationId,
            value: parsed.value.aliasValue,
        });
        (0, exports.parseOwnerRepositoryCanonicalEconomicIndexValueV2)({
            accountScopeHash: parsed.accountScopeHash,
            indexKind: "operation",
            keyKind: "operation_fingerprint",
            logicalKey: ledgerEntry.operationFingerprint,
            value: parsed.value.aliasValue,
        });
    }
    catch {
        return invalid();
    }
    const binding = aliasValue.effectBinding;
    const projections = [
        parsed.walletStateRef,
        parsed.operationIndexManifestBeforeRef,
        parsed.operationIndexManifestAfterRef,
        parsed.subjectIndexManifestRef,
        parsed.receiptIndexManifestRef,
    ];
    if (ledgerEntry.authorizedAliasOperation.accountGeneration <
        binding.acceptedAccountGeneration ||
        parsed.journalSequence <= binding.effectJournalSequence ||
        parsed.operationIndexManifestBeforeRef.blobFingerprint ===
            parsed.operationIndexManifestAfterRef.blobFingerprint ||
        new Set(projections.map((ref) => ref.blobFingerprint)).size !==
            projections.length ||
        projections.some((ref) => ref.blobFingerprint ===
            binding.canonicalEffectJournalRecordRef.blobFingerprint ||
            ref.blobFingerprint ===
                parsed.previousJournalRecordRef.blobFingerprint))
        return invalid();
    const body = {
        schemaVersion: "learning-v2-owner-repository-operation-alias-record.v2",
        recordKind: "operation_alias",
        accountScopeHash: parsed.accountScopeHash,
        acceptedAccountGeneration: ledgerEntry.authorizedAliasOperation.accountGeneration,
        journalSequence: parsed.journalSequence,
        repositoryRevisionBefore: parsed.repositoryRevisionBefore,
        rootBeforeFingerprint: parsed.rootBeforeFingerprint,
        previousJournalRecordRef: parsed.previousJournalRecordRef,
        walletStateRef: parsed.walletStateRef,
        operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
        operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
        subjectIndexManifestRef: parsed.subjectIndexManifestRef,
        receiptIndexManifestRef: parsed.receiptIndexManifestRef,
        canonicalEffectBinding: binding,
        aliasValue,
    };
    return deepFreeze({
        ...body,
        journalRecordFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.createOwnerRepositoryOperationAliasRecordV2 = createOwnerRepositoryOperationAliasRecordV2;
const parseOwnerRepositoryOperationAliasRecordV2 = (input) => {
    const parsed = parseAliasRecordCoordinates(input, true);
    const value = parsed.value;
    if (value.schemaVersion !==
        "learning-v2-owner-repository-operation-alias-record.v2" ||
        value.recordKind !== "operation_alias" ||
        !safe(value.acceptedAccountGeneration) ||
        typeof value.journalRecordFingerprint !== "string" ||
        !HASH.test(value.journalRecordFingerprint))
        return indeterminate();
    let rebuilt;
    try {
        rebuilt = (0, exports.createOwnerRepositoryOperationAliasRecordV2)({
            accountScopeHash: parsed.accountScopeHash,
            journalSequence: parsed.journalSequence,
            repositoryRevisionBefore: parsed.repositoryRevisionBefore,
            rootBeforeFingerprint: parsed.rootBeforeFingerprint,
            previousJournalRecordRef: parsed.previousJournalRecordRef,
            walletStateRef: parsed.walletStateRef,
            operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
            operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
            subjectIndexManifestRef: parsed.subjectIndexManifestRef,
            receiptIndexManifestRef: parsed.receiptIndexManifestRef,
            aliasValue: value.aliasValue,
        });
    }
    catch {
        return indeterminate();
    }
    if (!same(rebuilt, value))
        return indeterminate();
    return rebuilt;
};
exports.parseOwnerRepositoryOperationAliasRecordV2 = parseOwnerRepositoryOperationAliasRecordV2;
const materializeOwnerRepositoryOperationAliasRecordBlobV2 = (recordInput) => {
    let record;
    try {
        record = (0, exports.parseOwnerRepositoryOperationAliasRecordV2)(recordInput);
    }
    catch {
        return invalid();
    }
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash: record.accountScopeHash,
        kind: "journal_record",
        payload: record,
    };
    let encoded;
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
        if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BLOB_BYTES)
            return invalid();
    }
    catch {
        return invalid();
    }
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "journal_record",
            blobKey: blobKey(record.accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
        encoded,
        record,
    });
};
exports.materializeOwnerRepositoryOperationAliasRecordBlobV2 = materializeOwnerRepositoryOperationAliasRecordBlobV2;
const parseOwnerRepositoryOperationAliasRecordBlobV2 = (input) => {
    const request = readRecord(input, ["accountScopeHash", "ref", "raw"], "indeterminate");
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.raw !== "string")
        return indeterminate();
    const ref = parseRef(request.ref, request.accountScopeHash, "journal_record", true);
    let envelope;
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(request.raw) > MAX_BLOB_BYTES ||
            (0, decision_registry_1.sha256Utf8)(request.raw) !== ref.blobFingerprint)
            return indeterminate();
        envelope = JSON.parse(request.raw);
        if ((0, decision_registry_1.canonicalJsonV1)(envelope) !== request.raw)
            return indeterminate();
    }
    catch {
        return indeterminate();
    }
    if (!isRecord(envelope) ||
        !exactKeys(envelope, ENVELOPE_KEYS) ||
        envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        envelope.accountScopeHash !== request.accountScopeHash ||
        envelope.kind !== "journal_record")
        return indeterminate();
    const record = (0, exports.parseOwnerRepositoryOperationAliasRecordV2)(envelope.payload);
    const rebuilt = (0, exports.materializeOwnerRepositoryOperationAliasRecordBlobV2)(record);
    if (rebuilt.encoded !== request.raw || !same(rebuilt.ref, ref)) {
        return indeterminate();
    }
    return rebuilt;
};
exports.parseOwnerRepositoryOperationAliasRecordBlobV2 = parseOwnerRepositoryOperationAliasRecordBlobV2;
//# sourceMappingURL=owner_repository_economic_effect_v2.js.map