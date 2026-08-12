"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebuildWalletStateFromAppliedReceipts = exports.selectWalletPublicProjection = exports.reduceAuthorizedWalletOperation = exports.parseWalletSubjectLedgerEntry = exports.parseWalletOperationAliasLedgerEntry = exports.createWalletOperationAliasLedgerEntry = exports.parseWalletOperationLedgerEntry = exports.parseWalletAppliedReceipt = exports.createWalletCanonicalLedgerEntriesFromAppliedReceipt = exports.parseWalletState = exports.createWalletState = exports.MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
exports.MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD = 128;
const STATE_KEYS = [
    "schemaVersion", "accountScopeHash", "walletIdentityFingerprint", "currency",
    "unitScale", "balanceSubunits", "earnedByCategorySubunits",
    "externalCreditSubunits", "importedOpeningSubunits", "spentSubunits",
    "revision", "stateFingerprint",
];
const APPLIED_KEYS = [
    "schemaVersion", "operationId", "operationFingerprint", "semanticSubjectFingerprint",
    "semanticFingerprint", "accountScopeHash", "accountGeneration", "kind", "amountSubunits",
    "authorizedOperation", "stateBeforeFingerprint", "stateAfterFingerprint", "revisionBefore",
    "revisionAfter", "balanceBeforeSubunits", "balanceAfterSubunits", "appliedReceiptFingerprint",
];
const OP_LEDGER_KEYS = ["schemaVersion", "operationId", "operationFingerprint", "canonicalOperationId", "semanticSubjectFingerprint", "semanticFingerprint", "appliedReceipt"];
const ALIAS_LEDGER_KEYS = [
    "schemaVersion", "operationId", "operationFingerprint", "canonicalOperationId",
    "semanticSubjectFingerprint", "semanticFingerprint", "authorizedAliasOperation",
    "appliedReceipt", "aliasEntryFingerprint",
];
const SUBJECT_LEDGER_KEYS = ["schemaVersion", "semanticSubjectFingerprint", "semanticFingerprint", "canonicalOperationId", "appliedReceipt"];
const HASH = /^[a-f0-9]{64}$/;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const detached = (input, code) => {
    return (0, wallet_1.detachBoundedWalletJson)(input, code);
};
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const checkedAdd = (left, right) => {
    const value = left + right;
    if (!Number.isSafeInteger(value) || value < 0)
        throw new Error("wallet_arithmetic_overflow");
    return value;
};
const sumEarnings = (earnings) => wallet_1.WALLET_EARNING_CATEGORIES.reduce((total, category) => checkedAdd(total, earnings[category]), 0);
const stateBody = (value) => value;
const finalizeState = (body) => {
    const cleanBody = { ...body };
    delete cleanBody.stateFingerprint;
    return deepFreeze({
        ...cleanBody,
        stateFingerprint: (0, decision_registry_1.hashCanonicalBody)(cleanBody),
    });
};
const createWalletState = (input) => {
    const value = detached(input, "wallet_state_invalid");
    if (!isRecord(value) || !exactKeys(value, ["accountScopeHash"]) ||
        typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash)) {
        throw new Error("wallet_state_invalid");
    }
    const accountScopeHash = value.accountScopeHash;
    const earnedByCategorySubunits = Object.fromEntries(wallet_1.WALLET_EARNING_CATEGORIES.map((category) => [category, 0]));
    return finalizeState({
        schemaVersion: "learning-v2-wallet-state.v1",
        accountScopeHash,
        walletIdentityFingerprint: (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "learning-v2-wallet-identity.v1",
            accountScopeHash,
            currency: "access_star",
        }),
        currency: "access_star",
        unitScale: wallet_1.WALLET_SUBUNITS_PER_STAR,
        balanceSubunits: 0,
        earnedByCategorySubunits,
        externalCreditSubunits: 0,
        importedOpeningSubunits: 0,
        spentSubunits: 0,
        revision: 0,
    });
};
exports.createWalletState = createWalletState;
const parseWalletState = (input) => {
    const value = detached(input, "wallet_state_invalid");
    if (!isRecord(value) || !exactKeys(value, STATE_KEYS) ||
        value.schemaVersion !== "learning-v2-wallet-state.v1" ||
        typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
        typeof value.walletIdentityFingerprint !== "string" || !HASH.test(value.walletIdentityFingerprint) ||
        value.currency !== "access_star" || value.unitScale !== wallet_1.WALLET_SUBUNITS_PER_STAR ||
        !safe(value.balanceSubunits) || !safe(value.externalCreditSubunits) ||
        !safe(value.importedOpeningSubunits) || !safe(value.spentSubunits) || !safe(value.revision) ||
        typeof value.stateFingerprint !== "string" || !HASH.test(value.stateFingerprint) ||
        !isRecord(value.earnedByCategorySubunits)) {
        throw new Error("wallet_state_invalid");
    }
    const earningsValue = value.earnedByCategorySubunits;
    if (!exactKeys(earningsValue, wallet_1.WALLET_EARNING_CATEGORIES) ||
        !wallet_1.WALLET_EARNING_CATEGORIES.every((category) => safe(earningsValue[category]))) {
        throw new Error("wallet_state_invalid");
    }
    const earnedByCategorySubunits = Object.fromEntries(wallet_1.WALLET_EARNING_CATEGORIES.map((category) => [category, Number(earningsValue[category])]));
    const positive = checkedAdd(checkedAdd(sumEarnings(earnedByCategorySubunits), Number(value.externalCreditSubunits)), Number(value.importedOpeningSubunits));
    if (positive < Number(value.spentSubunits) || positive - Number(value.spentSubunits) !== Number(value.balanceSubunits)) {
        throw new Error("wallet_state_invalid");
    }
    const body = {
        schemaVersion: "learning-v2-wallet-state.v1",
        accountScopeHash: value.accountScopeHash,
        walletIdentityFingerprint: value.walletIdentityFingerprint,
        currency: "access_star",
        unitScale: wallet_1.WALLET_SUBUNITS_PER_STAR,
        balanceSubunits: Number(value.balanceSubunits),
        earnedByCategorySubunits,
        externalCreditSubunits: Number(value.externalCreditSubunits),
        importedOpeningSubunits: Number(value.importedOpeningSubunits),
        spentSubunits: Number(value.spentSubunits),
        revision: Number(value.revision),
    };
    const expectedIdentity = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-wallet-identity.v1",
        accountScopeHash: body.accountScopeHash,
        currency: body.currency,
    });
    if (body.walletIdentityFingerprint !== expectedIdentity || value.stateFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
        throw new Error("wallet_state_invalid");
    }
    return deepFreeze({ ...body, stateFingerprint: value.stateFingerprint });
};
exports.parseWalletState = parseWalletState;
const createAppliedReceipt = (operation, before, after) => {
    const body = {
        schemaVersion: "learning-v2-wallet-applied-receipt.v1",
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        semanticFingerprint: operation.semanticFingerprint,
        accountScopeHash: operation.accountScopeHash,
        accountGeneration: operation.accountGeneration,
        kind: operation.kind,
        amountSubunits: operation.amountSubunits,
        authorizedOperation: operation,
        stateBeforeFingerprint: before.stateFingerprint,
        stateAfterFingerprint: after.stateFingerprint,
        revisionBefore: before.revision,
        revisionAfter: after.revision,
        balanceBeforeSubunits: before.balanceSubunits,
        balanceAfterSubunits: after.balanceSubunits,
    };
    return deepFreeze({ ...body, appliedReceiptFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
};
const makeOperationEntry = (operation, canonicalOperationId, appliedReceipt) => deepFreeze({
    schemaVersion: "learning-v2-wallet-operation-ledger-entry.v1",
    operationId: operation.operationId,
    operationFingerprint: operation.operationFingerprint,
    canonicalOperationId,
    semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
    semanticFingerprint: operation.semanticFingerprint,
    appliedReceipt,
});
const makeSubjectEntry = (operation, canonicalOperationId, appliedReceipt) => deepFreeze({
    schemaVersion: "learning-v2-wallet-subject-ledger-entry.v1",
    semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
    semanticFingerprint: operation.semanticFingerprint,
    canonicalOperationId,
    appliedReceipt,
});
/**
 * Reconstructs the only canonical lifetime-index values authorized by a strict
 * wallet receipt. Repair/journal callers must use this derivation instead of
 * accepting an index value or value fingerprint from transport input.
 */
const createWalletCanonicalLedgerEntriesFromAppliedReceipt = (input) => {
    const appliedReceipt = (0, exports.parseWalletAppliedReceipt)(input);
    const operation = appliedReceipt.authorizedOperation;
    return deepFreeze({
        operationLedgerEntry: makeOperationEntry(operation, appliedReceipt.operationId, appliedReceipt),
        subjectLedgerEntry: makeSubjectEntry(operation, appliedReceipt.operationId, appliedReceipt),
        appliedReceipt,
    });
};
exports.createWalletCanonicalLedgerEntriesFromAppliedReceipt = createWalletCanonicalLedgerEntriesFromAppliedReceipt;
const parseWalletAppliedReceipt = (input) => {
    const value = detached(input, "wallet_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, APPLIED_KEYS) ||
        value.schemaVersion !== "learning-v2-wallet-applied-receipt.v1" ||
        !isRecord(value.authorizedOperation) ||
        !Object.prototype.hasOwnProperty.call(value.authorizedOperation, "semanticFingerprint") ||
        !Object.prototype.hasOwnProperty.call(value.authorizedOperation, "operationFingerprint") ||
        typeof value.appliedReceiptFingerprint !== "string" || !HASH.test(value.appliedReceiptFingerprint)) {
        throw new Error("wallet_ledger_invalid");
    }
    const authorizedOperation = (0, wallet_1.createWalletAuthorizedOperation)(value.authorizedOperation);
    const { appliedReceiptFingerprint, ...body } = value;
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== appliedReceiptFingerprint ||
        value.operationId !== authorizedOperation.operationId ||
        value.operationFingerprint !== authorizedOperation.operationFingerprint ||
        value.semanticSubjectFingerprint !== authorizedOperation.semanticSubjectFingerprint ||
        value.semanticFingerprint !== authorizedOperation.semanticFingerprint ||
        value.accountScopeHash !== authorizedOperation.accountScopeHash ||
        value.accountGeneration !== authorizedOperation.accountGeneration ||
        value.kind !== authorizedOperation.kind || value.amountSubunits !== authorizedOperation.amountSubunits ||
        !safe(value.revisionBefore) || !safe(value.revisionAfter) ||
        Number(value.revisionAfter) !== Number(value.revisionBefore) + 1 ||
        !safe(value.balanceBeforeSubunits) || !safe(value.balanceAfterSubunits) ||
        Number(value.balanceAfterSubunits) !== Number(value.balanceBeforeSubunits) + authorizedOperation.amountSubunits ||
        value.revisionBefore !== authorizedOperation.walletRevisionBefore ||
        typeof value.stateBeforeFingerprint !== "string" || !HASH.test(value.stateBeforeFingerprint) ||
        typeof value.stateAfterFingerprint !== "string" || !HASH.test(value.stateAfterFingerprint)) {
        throw new Error("wallet_ledger_invalid");
    }
    return deepFreeze({ ...body, authorizedOperation, appliedReceiptFingerprint });
};
exports.parseWalletAppliedReceipt = parseWalletAppliedReceipt;
const parseWalletOperationLedgerEntry = (input) => {
    const value = detached(input, "wallet_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, OP_LEDGER_KEYS) || value.schemaVersion !== "learning-v2-wallet-operation-ledger-entry.v1")
        throw new Error("wallet_ledger_invalid");
    const appliedReceipt = (0, exports.parseWalletAppliedReceipt)(value.appliedReceipt);
    if (!(0, wallet_1.isWalletIdentifier)(value.operationId) || !(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId) ||
        typeof value.operationFingerprint !== "string" || !HASH.test(value.operationFingerprint) ||
        value.canonicalOperationId !== appliedReceipt.operationId || value.semanticSubjectFingerprint !== appliedReceipt.semanticSubjectFingerprint ||
        value.semanticFingerprint !== appliedReceipt.semanticFingerprint ||
        (value.operationId === value.canonicalOperationId && value.operationFingerprint !== appliedReceipt.operationFingerprint))
        throw new Error("wallet_ledger_invalid");
    return deepFreeze({ ...value, appliedReceipt });
};
exports.parseWalletOperationLedgerEntry = parseWalletOperationLedgerEntry;
const createWalletOperationAliasLedgerEntry = (input) => {
    const value = detached(input, "wallet_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, ["authorizedAliasOperation", "appliedReceipt"])) {
        throw new Error("wallet_ledger_invalid");
    }
    const authorizedAliasOperation = (0, wallet_1.createWalletAuthorizedOperation)(value.authorizedAliasOperation);
    const appliedReceipt = (0, exports.parseWalletAppliedReceipt)(value.appliedReceipt);
    if (authorizedAliasOperation.accountScopeHash !== appliedReceipt.accountScopeHash ||
        authorizedAliasOperation.operationId === appliedReceipt.operationId ||
        authorizedAliasOperation.operationFingerprint === appliedReceipt.operationFingerprint ||
        authorizedAliasOperation.semanticSubjectFingerprint !== appliedReceipt.semanticSubjectFingerprint ||
        authorizedAliasOperation.semanticFingerprint !== appliedReceipt.semanticFingerprint)
        throw new Error("wallet_ledger_invalid");
    const body = {
        schemaVersion: "learning-v2-wallet-operation-alias-ledger-entry.v2",
        operationId: authorizedAliasOperation.operationId,
        operationFingerprint: authorizedAliasOperation.operationFingerprint,
        canonicalOperationId: appliedReceipt.operationId,
        semanticSubjectFingerprint: appliedReceipt.semanticSubjectFingerprint,
        semanticFingerprint: appliedReceipt.semanticFingerprint,
        authorizedAliasOperation,
        appliedReceipt,
    };
    return deepFreeze({ ...body, aliasEntryFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
};
exports.createWalletOperationAliasLedgerEntry = createWalletOperationAliasLedgerEntry;
const parseWalletOperationAliasLedgerEntry = (input) => {
    const value = detached(input, "wallet_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, ALIAS_LEDGER_KEYS) ||
        value.schemaVersion !== "learning-v2-wallet-operation-alias-ledger-entry.v2" ||
        typeof value.aliasEntryFingerprint !== "string" || !HASH.test(value.aliasEntryFingerprint)) {
        throw new Error("wallet_ledger_invalid");
    }
    const rebuilt = (0, exports.createWalletOperationAliasLedgerEntry)({
        authorizedAliasOperation: value.authorizedAliasOperation,
        appliedReceipt: value.appliedReceipt,
    });
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== (0, decision_registry_1.canonicalJsonV1)(value))
        throw new Error("wallet_ledger_invalid");
    return rebuilt;
};
exports.parseWalletOperationAliasLedgerEntry = parseWalletOperationAliasLedgerEntry;
const parseWalletAnyOperationLedgerEntry = (input) => {
    const value = detached(input, "wallet_ledger_invalid");
    if (!isRecord(value))
        throw new Error("wallet_ledger_invalid");
    return value.schemaVersion === "learning-v2-wallet-operation-alias-ledger-entry.v2"
        ? (0, exports.parseWalletOperationAliasLedgerEntry)(value)
        : (0, exports.parseWalletOperationLedgerEntry)(value);
};
const parseWalletSubjectLedgerEntry = (input) => {
    const value = detached(input, "wallet_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, SUBJECT_LEDGER_KEYS) || value.schemaVersion !== "learning-v2-wallet-subject-ledger-entry.v1")
        throw new Error("wallet_ledger_invalid");
    const appliedReceipt = (0, exports.parseWalletAppliedReceipt)(value.appliedReceipt);
    if (!(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId) ||
        value.canonicalOperationId !== appliedReceipt.operationId || value.semanticSubjectFingerprint !== appliedReceipt.semanticSubjectFingerprint ||
        value.semanticFingerprint !== appliedReceipt.semanticFingerprint)
        throw new Error("wallet_ledger_invalid");
    return deepFreeze({ ...value, appliedReceipt });
};
exports.parseWalletSubjectLedgerEntry = parseWalletSubjectLedgerEntry;
const reduceAuthorizedWalletOperation = (inputState, inputOperation, lookup) => {
    const state = (0, exports.parseWalletState)(inputState);
    const lookupValue = detached(lookup, "wallet_ledger_invalid");
    if (!isRecord(lookupValue) ||
        !Object.keys(lookupValue).every((key) => ["currentAccountGeneration", "operationLedgerEntry", "subjectLedgerEntry"].includes(key)) ||
        !Object.prototype.hasOwnProperty.call(lookupValue, "currentAccountGeneration")) {
        throw new Error("wallet_ledger_invalid");
    }
    if (!isRecord(inputOperation) ||
        !Object.prototype.hasOwnProperty.call(inputOperation, "semanticFingerprint") ||
        !Object.prototype.hasOwnProperty.call(inputOperation, "operationFingerprint")) {
        throw new Error("wallet_operation_invalid");
    }
    const operation = (0, wallet_1.createWalletAuthorizedOperation)(inputOperation);
    if (!safe(lookupValue.currentAccountGeneration) || operation.accountGeneration !== lookupValue.currentAccountGeneration) {
        throw new Error("wallet_generation_stale");
    }
    if (operation.accountScopeHash !== state.accountScopeHash)
        throw new Error("wallet_scope_mismatch");
    const byOperation = Object.prototype.hasOwnProperty.call(lookupValue, "operationLedgerEntry")
        ? parseWalletAnyOperationLedgerEntry(lookupValue.operationLedgerEntry)
        : undefined;
    const parsedSubject = Object.prototype.hasOwnProperty.call(lookupValue, "subjectLedgerEntry")
        ? (0, exports.parseWalletSubjectLedgerEntry)(lookupValue.subjectLedgerEntry)
        : undefined;
    if (byOperation && parsedSubject && (byOperation.canonicalOperationId !== parsedSubject.canonicalOperationId ||
        byOperation.semanticFingerprint !== parsedSubject.semanticFingerprint ||
        byOperation.appliedReceipt.appliedReceiptFingerprint !== parsedSubject.appliedReceipt.appliedReceiptFingerprint))
        throw new Error("wallet_ledger_invalid");
    if (byOperation) {
        if (byOperation.operationId !== operation.operationId ||
            byOperation.operationFingerprint !== operation.operationFingerprint ||
            byOperation.semanticSubjectFingerprint !== operation.semanticSubjectFingerprint ||
            byOperation.semanticFingerprint !== operation.semanticFingerprint)
            throw new Error("wallet_operation_conflict");
        const canonicalReceipt = byOperation.appliedReceipt;
        const resultOperationEntry = byOperation.schemaVersion ===
            "learning-v2-wallet-operation-alias-ledger-entry.v2"
            ? makeOperationEntry(operation, byOperation.canonicalOperationId, canonicalReceipt)
            : byOperation;
        if (state.revision === canonicalReceipt.revisionBefore) {
            if (state.stateFingerprint !== canonicalReceipt.stateBeforeFingerprint)
                throw new Error("wallet_projection_indeterminate");
            const repaired = (0, exports.reduceAuthorizedWalletOperation)(state, canonicalReceipt.authorizedOperation, {
                currentAccountGeneration: canonicalReceipt.accountGeneration,
            });
            if (repaired.state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint ||
                repaired.appliedReceipt.appliedReceiptFingerprint !== canonicalReceipt.appliedReceiptFingerprint) {
                throw new Error("wallet_ledger_invalid");
            }
            return deepFreeze({ ...repaired, appliedReceipt: canonicalReceipt, operationLedgerEntry: resultOperationEntry, ledgerWriteRequired: !parsedSubject,
                subjectLedgerEntry: parsedSubject ?? makeSubjectEntry(operation, byOperation.canonicalOperationId, canonicalReceipt) });
        }
        if (state.revision === canonicalReceipt.revisionAfter && state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint)
            throw new Error("wallet_projection_indeterminate");
        if (state.revision < canonicalReceipt.revisionAfter)
            throw new Error("wallet_projection_indeterminate");
        return deepFreeze({
            state, changed: false, expectedRevision: state.revision, nextRevision: state.revision,
            appliedReceipt: byOperation.appliedReceipt,
            operationLedgerEntry: resultOperationEntry,
            subjectLedgerEntry: parsedSubject ?? makeSubjectEntry(operation, byOperation.canonicalOperationId, byOperation.appliedReceipt),
            ledgerWriteRequired: !parsedSubject,
        });
    }
    const bySubject = parsedSubject;
    if (bySubject) {
        if (bySubject.semanticSubjectFingerprint !== operation.semanticSubjectFingerprint ||
            bySubject.semanticFingerprint !== operation.semanticFingerprint)
            throw new Error("wallet_operation_conflict");
        const canonicalReceipt = bySubject.appliedReceipt;
        if (operation.operationId === bySubject.canonicalOperationId &&
            operation.operationFingerprint !== canonicalReceipt.operationFingerprint) {
            throw new Error("wallet_operation_conflict");
        }
        if (state.revision === canonicalReceipt.revisionBefore) {
            if (state.stateFingerprint !== canonicalReceipt.stateBeforeFingerprint)
                throw new Error("wallet_projection_indeterminate");
            const repaired = (0, exports.reduceAuthorizedWalletOperation)(state, canonicalReceipt.authorizedOperation, {
                currentAccountGeneration: canonicalReceipt.accountGeneration,
            });
            if (repaired.state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint ||
                repaired.appliedReceipt.appliedReceiptFingerprint !== canonicalReceipt.appliedReceiptFingerprint) {
                throw new Error("wallet_ledger_invalid");
            }
            return deepFreeze({ ...repaired, appliedReceipt: canonicalReceipt, ledgerWriteRequired: true,
                operationLedgerEntry: makeOperationEntry(operation, bySubject.canonicalOperationId, canonicalReceipt),
                subjectLedgerEntry: bySubject });
        }
        if (state.revision === canonicalReceipt.revisionAfter && state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint)
            throw new Error("wallet_projection_indeterminate");
        if (state.revision < canonicalReceipt.revisionAfter)
            throw new Error("wallet_projection_indeterminate");
        return deepFreeze({
            state, changed: false, expectedRevision: state.revision, nextRevision: state.revision,
            appliedReceipt: bySubject.appliedReceipt,
            operationLedgerEntry: makeOperationEntry(operation, bySubject.canonicalOperationId, bySubject.appliedReceipt),
            subjectLedgerEntry: bySubject,
            ledgerWriteRequired: true,
        });
    }
    if (operation.walletRevisionBefore !== state.revision)
        throw new Error("wallet_operation_out_of_order");
    const earnedByCategorySubunits = { ...state.earnedByCategorySubunits };
    let externalCreditSubunits = state.externalCreditSubunits;
    let importedOpeningSubunits = state.importedOpeningSubunits;
    if (operation.kind === "earning_credit") {
        const category = operation.earningCategory;
        earnedByCategorySubunits[category] = checkedAdd(earnedByCategorySubunits[category], operation.amountSubunits);
    }
    else if (operation.kind === "external_credit") {
        externalCreditSubunits = checkedAdd(externalCreditSubunits, operation.amountSubunits);
    }
    else {
        importedOpeningSubunits = checkedAdd(importedOpeningSubunits, operation.amountSubunits);
    }
    const nextState = finalizeState({
        ...state,
        earnedByCategorySubunits,
        externalCreditSubunits,
        importedOpeningSubunits,
        balanceSubunits: checkedAdd(state.balanceSubunits, operation.amountSubunits),
        revision: checkedAdd(state.revision, 1),
    });
    const appliedReceipt = createAppliedReceipt(operation, state, nextState);
    const operationLedgerEntry = makeOperationEntry(operation, operation.operationId, appliedReceipt);
    const subjectLedgerEntry = makeSubjectEntry(operation, operation.operationId, appliedReceipt);
    return deepFreeze({
        state: nextState, changed: true, expectedRevision: state.revision, nextRevision: nextState.revision,
        appliedReceipt, operationLedgerEntry, subjectLedgerEntry, ledgerWriteRequired: true,
    });
};
exports.reduceAuthorizedWalletOperation = reduceAuthorizedWalletOperation;
const selectWalletPublicProjection = (input) => {
    const state = (0, exports.parseWalletState)(input);
    return deepFreeze({
        schemaVersion: "learning-v2-wallet-public-projection.v1",
        currency: state.currency,
        unitScale: state.unitScale,
        balanceSubunits: state.balanceSubunits,
        earnedByCategorySubunits: state.earnedByCategorySubunits,
    });
};
exports.selectWalletPublicProjection = selectWalletPublicProjection;
/**
 * Rebuilds exactly one confirmed credit/import transition from its self-contained
 * audit receipt. The caller folds a paged journal in revision order; gaps,
 * duplicates and alternate branches fail closed instead of being silently skipped.
 */
const rebuildWalletStateFromAppliedReceiptUnchecked = (inputState, inputReceipt) => {
    const state = (0, exports.parseWalletState)(inputState);
    const receipt = (0, exports.parseWalletAppliedReceipt)(inputReceipt);
    if (receipt.accountScopeHash !== state.accountScopeHash)
        throw new Error("wallet_receipt_scope_mismatch");
    if (state.revision !== receipt.revisionBefore ||
        state.stateFingerprint !== receipt.stateBeforeFingerprint ||
        state.balanceSubunits !== receipt.balanceBeforeSubunits) {
        throw new Error("wallet_receipt_rebuild_out_of_order");
    }
    const rebuilt = (0, exports.reduceAuthorizedWalletOperation)(state, receipt.authorizedOperation, {
        currentAccountGeneration: receipt.accountGeneration,
    });
    if (!rebuilt.changed ||
        rebuilt.state.revision !== receipt.revisionAfter ||
        rebuilt.state.balanceSubunits !== receipt.balanceAfterSubunits ||
        rebuilt.state.stateFingerprint !== receipt.stateAfterFingerprint ||
        rebuilt.appliedReceipt.appliedReceiptFingerprint !== receipt.appliedReceiptFingerprint) {
        throw new Error("wallet_ledger_invalid");
    }
    return rebuilt.state;
};
/**
 * Audits and rebuilds one bounded canonical credit/import journal page. Each
 * receipt is parsed independently, so legitimate pages are not constrained by the
 * generic 64-element JSON-array guard. The P2.2 repository owns cross-page indexes;
 * this pure helper intentionally cannot resume production writes by itself.
 */
const rebuildWalletStateFromAppliedReceipts = (input) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        throw new Error("wallet_receipt_history_invalid");
    }
    if (Reflect.ownKeys(input).length !== 2 ||
        Reflect.ownKeys(input).some((key) => typeof key !== "string" ||
            !["startingState", "canonicalAppliedReceipts"].includes(key))) {
        throw new Error("wallet_receipt_history_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (!exactKeys(descriptors, ["startingState", "canonicalAppliedReceipts"]) ||
        !Object.values(descriptors).every((descriptor) => "value" in descriptor && descriptor.enumerable)) {
        throw new Error("wallet_receipt_history_invalid");
    }
    const startingState = (0, exports.parseWalletState)(descriptors.startingState.value);
    const rawReceipts = descriptors.canonicalAppliedReceipts.value;
    if (!Array.isArray(rawReceipts) || rawReceipts.length > exports.MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD ||
        Reflect.ownKeys(rawReceipts).some((key) => typeof key !== "string" ||
            (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key)))) {
        throw new Error("wallet_receipt_history_invalid");
    }
    const parsedReceipts = [];
    for (let index = 0; index < rawReceipts.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(rawReceipts, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
            throw new Error("wallet_receipt_history_invalid");
        }
        parsedReceipts.push((0, exports.parseWalletAppliedReceipt)(descriptor.value));
    }
    const state0 = startingState;
    const ordered = [...parsedReceipts].sort((left, right) => left.revisionBefore - right.revisionBefore);
    const operationIds = new Set();
    const operationFingerprints = new Set();
    const semanticSubjects = new Set();
    const receiptFingerprints = new Set();
    let state = state0;
    for (const receipt of ordered) {
        if (receipt.accountScopeHash !== state0.accountScopeHash ||
            operationIds.has(receipt.operationId) || operationFingerprints.has(receipt.operationFingerprint) ||
            semanticSubjects.has(receipt.semanticSubjectFingerprint) ||
            receiptFingerprints.has(receipt.appliedReceiptFingerprint)) {
            throw new Error("wallet_receipt_history_invalid");
        }
        operationIds.add(receipt.operationId);
        operationFingerprints.add(receipt.operationFingerprint);
        semanticSubjects.add(receipt.semanticSubjectFingerprint);
        receiptFingerprints.add(receipt.appliedReceiptFingerprint);
        const before = state;
        state = rebuildWalletStateFromAppliedReceiptUnchecked(state, receipt);
        const regenerated = createAppliedReceipt(receipt.authorizedOperation, before, state);
        if ((0, decision_registry_1.canonicalJsonV1)(regenerated) !== (0, decision_registry_1.canonicalJsonV1)(receipt)) {
            throw new Error("wallet_ledger_invalid");
        }
    }
    return state;
};
exports.rebuildWalletStateFromAppliedReceipts = rebuildWalletStateFromAppliedReceipts;
//# sourceMappingURL=wallet_reducer.js.map