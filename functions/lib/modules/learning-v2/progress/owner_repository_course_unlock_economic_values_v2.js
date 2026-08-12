"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2 = exports.createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2 = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_course_unlock_effect_v2_1 = require("./owner_repository_course_unlock_effect_v2");
const course_unlock_reducer_1 = require("./course_unlock_reducer");
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"];
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
const LEDGER_VALUE_KEYS = [
    "schemaVersion",
    "valueKind",
    "ledgerEntry",
    "effectBinding",
    "valueFingerprint",
];
const RECEIPT_VALUE_KEYS = [
    "schemaVersion",
    "valueKind",
    "appliedReceipt",
    "effectBinding",
    "valueFingerprint",
];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => {
    throw new Error("owner_repository_course_unlock_economic_value_invalid");
};
const indeterminate = () => {
    throw new Error("owner_repository_course_unlock_economic_value_indeterminate");
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
const readRecord = (input, keys, stored = false) => {
    const fail = stored ? indeterminate : invalid;
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        return fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length ||
        own.some((key) => typeof key !== "string" || !keys.includes(key)) ||
        keys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        })) {
        return fail();
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
            ? "owner_repository_course_unlock_economic_value_indeterminate"
            : "owner_repository_course_unlock_economic_value_invalid");
    }
    catch {
        return stored ? indeterminate() : invalid();
    }
    return readRecord(detached, keys, stored);
};
const parseRef = (input, accountScopeHash) => {
    const value = readRecord(input, REF_KEYS, true);
    if (value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        value.kind !== "journal_record" ||
        typeof value.blobFingerprint !== "string" ||
        !HASH.test(value.blobFingerprint) ||
        value.blobKey !==
            `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${value.blobFingerprint}`) {
        return indeterminate();
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
        kind: "journal_record",
        blobKey: value.blobKey,
        blobFingerprint: value.blobFingerprint,
    });
};
const withFingerprint = (body) => deepFreeze({ ...body, valueFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
const createBinding = (blob) => {
    const record = blob.record;
    const body = {
        schemaVersion: "learning-v2-owner-repository-course-unlock-effect-binding.v2",
        effectKind: "course_unlock",
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
const createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2 = (input) => {
    const request = readRecord(input, ["journalRecordBlob"]);
    const wrapper = readRecord(request.journalRecordBlob, ["ref", "encoded", "record"]);
    let blob;
    try {
        const record = (0, wallet_1.detachBoundedWalletJson)(wrapper.record, "owner_repository_course_unlock_economic_value_invalid");
        if (!isRecord(record) ||
            typeof record.accountScopeHash !== "string" ||
            !ACCOUNT.test(record.accountScopeHash)) {
            return invalid();
        }
        blob = (0, owner_repository_course_unlock_effect_v2_1.parseOwnerRepositoryCourseUnlockEffectRecordBlobV2)({
            accountScopeHash: record.accountScopeHash,
            ref: wrapper.ref,
            raw: wrapper.encoded,
        });
    }
    catch {
        return invalid();
    }
    if (!same(blob.record, wrapper.record))
        return invalid();
    const entries = (0, course_unlock_reducer_1.createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt)(blob.record.appliedReceipt);
    const binding = createBinding(blob);
    const operationValue = withFingerprint({
        schemaVersion: "learning-v2-owner-repository-course-unlock-operation-index-value.v2",
        valueKind: "canonical_operation",
        ledgerEntry: entries.operationLedgerEntry,
        effectBinding: binding,
    });
    const subjectValue = withFingerprint({
        schemaVersion: "learning-v2-owner-repository-course-unlock-subject-index-value.v2",
        valueKind: "canonical_subject",
        ledgerEntry: entries.subjectLedgerEntry,
        effectBinding: binding,
    });
    const receiptValue = withFingerprint({
        schemaVersion: "learning-v2-owner-repository-course-unlock-receipt-index-value.v2",
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
exports.createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2 = createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2;
const parseBinding = (input, receipt) => {
    const value = detachRecord(input, BINDING_KEYS, true);
    if (value.schemaVersion !==
        "learning-v2-owner-repository-course-unlock-effect-binding.v2" ||
        value.effectKind !== "course_unlock" ||
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
        ].every((candidate) => typeof candidate === "string" && HASH.test(candidate))) {
        return indeterminate();
    }
    const ref = parseRef(value.canonicalEffectJournalRecordRef, value.accountScopeHash);
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
    const request = receipt.authorizedRequest;
    if (value.bindingFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body) ||
        value.accountScopeHash !== request.accountScopeHash ||
        value.acceptedAccountGeneration !== request.accountGeneration ||
        value.canonicalOperationId !== request.operationId ||
        value.operationFingerprint !== request.operationFingerprint ||
        value.semanticSubjectFingerprint !== request.semanticSubjectFingerprint ||
        value.semanticFingerprint !== request.semanticFingerprint ||
        value.appliedReceiptFingerprint !== receipt.appliedReceiptFingerprint) {
        return indeterminate();
    }
    return deepFreeze({
        ...body,
        bindingFingerprint: value.bindingFingerprint,
    });
};
const parseOwnerRepositoryCourseUnlockEconomicIndexValueV2 = (input) => {
    const request = readRecord(input, ["accountScopeHash", "indexKind", "keyKind", "logicalKey", "value"], true);
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        typeof request.logicalKey !== "string") {
        return indeterminate();
    }
    if (request.indexKind === "receipt") {
        if (request.keyKind !== "applied_receipt")
            return indeterminate();
        const value = detachRecord(request.value, RECEIPT_VALUE_KEYS, true);
        if (value.schemaVersion !==
            "learning-v2-owner-repository-course-unlock-receipt-index-value.v2" ||
            value.valueKind !== "canonical_receipt" ||
            typeof value.valueFingerprint !== "string" ||
            !HASH.test(value.valueFingerprint)) {
            return indeterminate();
        }
        let receipt;
        try {
            receipt = (0, course_unlock_reducer_1.parseCourseUnlockAppliedReceipt)(value.appliedReceipt);
        }
        catch {
            return indeterminate();
        }
        const binding = parseBinding(value.effectBinding, receipt);
        const body = {
            schemaVersion: value.schemaVersion,
            valueKind: value.valueKind,
            appliedReceipt: receipt,
            effectBinding: binding,
        };
        if (request.logicalKey !== receipt.appliedReceiptFingerprint ||
            value.valueFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
            return indeterminate();
        }
        return deepFreeze({
            ...body,
            valueFingerprint: value.valueFingerprint,
        });
    }
    const value = detachRecord(request.value, LEDGER_VALUE_KEYS, true);
    if (typeof value.valueFingerprint !== "string" ||
        !HASH.test(value.valueFingerprint)) {
        return indeterminate();
    }
    if (request.indexKind === "operation") {
        if (request.keyKind !== "operation_id" &&
            request.keyKind !== "operation_fingerprint") {
            return indeterminate();
        }
        if (value.schemaVersion !==
            "learning-v2-owner-repository-course-unlock-operation-index-value.v2" ||
            (value.valueKind !== "canonical_operation" &&
                value.valueKind !== "operation_alias")) {
            return indeterminate();
        }
        let ledger;
        try {
            ledger = (0, course_unlock_reducer_1.parseCourseUnlockOperationLedgerEntry)(value.ledgerEntry);
        }
        catch {
            return indeterminate();
        }
        const receipt = ledger.appliedReceipt;
        const binding = parseBinding(value.effectBinding, receipt);
        const expectedKind = ledger.operationId === ledger.canonicalOperationId
            ? "canonical_operation"
            : "operation_alias";
        const body = {
            schemaVersion: value.schemaVersion,
            valueKind: value.valueKind,
            ledgerEntry: ledger,
            effectBinding: binding,
        };
        if (value.valueKind !== expectedKind ||
            binding.canonicalOperationId !== ledger.canonicalOperationId ||
            (request.keyKind === "operation_id"
                ? request.logicalKey !== ledger.operationId
                : request.logicalKey !== ledger.operationFingerprint) ||
            value.valueFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
            return indeterminate();
        }
        return deepFreeze({
            ...body,
            valueFingerprint: value.valueFingerprint,
        });
    }
    if (request.indexKind !== "subject" ||
        request.keyKind !== "semantic_subject" ||
        value.schemaVersion !==
            "learning-v2-owner-repository-course-unlock-subject-index-value.v2" ||
        value.valueKind !== "canonical_subject") {
        return indeterminate();
    }
    let ledger;
    try {
        ledger = (0, course_unlock_reducer_1.parseCourseUnlockSubjectLedgerEntry)(value.ledgerEntry);
    }
    catch {
        return indeterminate();
    }
    const binding = parseBinding(value.effectBinding, ledger.appliedReceipt);
    const body = {
        schemaVersion: value.schemaVersion,
        valueKind: value.valueKind,
        ledgerEntry: ledger,
        effectBinding: binding,
    };
    if (request.logicalKey !== ledger.semanticSubjectFingerprint ||
        binding.canonicalOperationId !== ledger.canonicalOperationId ||
        value.valueFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
        return indeterminate();
    }
    return deepFreeze({
        ...body,
        valueFingerprint: value.valueFingerprint,
    });
};
exports.parseOwnerRepositoryCourseUnlockEconomicIndexValueV2 = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2;
//# sourceMappingURL=owner_repository_course_unlock_economic_values_v2.js.map