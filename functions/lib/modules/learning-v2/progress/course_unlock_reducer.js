"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduceAuthorizedCourseUnlock = exports.rebuildCourseUnlockStatesFromAppliedReceipt = exports.createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt = exports.parseCourseUnlockSubjectLedgerEntry = exports.parseCourseUnlockOperationLedgerEntry = exports.parseCourseUnlockAppliedReceipt = exports.parseCourseUnlockState = exports.createCourseUnlockState = void 0;
const course_unlock_1 = require("../contracts/course_unlock");
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const wallet_reducer_1 = require("./wallet_reducer");
const HASH = /^[a-f0-9]{64}$/;
const STATE_KEYS = [
    "schemaVersion", "accountScopeHash", "courseId", "studyTarget",
    "courseIdentityFingerprint", "policyFingerprint",
    "highestUnlockedRequiredSessionOrdinal", "revision", "stateFingerprint",
];
const DEBIT_KEYS = [
    "schemaVersion", "unlockRequestFingerprint", "semanticSubjectFingerprint",
    "chargedSubunits", "walletRevisionBefore", "walletRevisionAfter",
    "balanceBeforeSubunits", "balanceAfterSubunits", "spentBeforeSubunits",
    "spentAfterSubunits", "walletStateBeforeFingerprint",
    "walletStateAfterFingerprint", "debitReceiptFingerprint",
];
const RECEIPT_KEYS = [
    "schemaVersion", "authorizedRequest", "basis", "chargedSubunits",
    "walletStateBefore", "walletStateAfter", "courseUnlockStateBefore",
    "courseUnlockStateAfter", "walletDebitReceipt", "appliedReceiptFingerprint",
];
const OP_LEDGER_KEYS = [
    "schemaVersion", "operationId", "operationFingerprint", "canonicalOperationId",
    "semanticSubjectFingerprint", "semanticFingerprint", "appliedReceipt",
];
const SUBJECT_LEDGER_KEYS = [
    "schemaVersion", "semanticSubjectFingerprint", "semanticFingerprint",
    "canonicalOperationId", "appliedReceipt",
];
const ANCESTRY_KEYS = [
    "schemaVersion", "canonicalAppliedReceiptFingerprint",
    "currentWalletStateFingerprint", "currentCourseStateFingerprint", "proofSource",
];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const safe = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum && Number(value) <= maximum;
const validHash = (value) => typeof value === "string" && HASH.test(value);
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const checkedAdd = (left, right) => {
    const value = left + right;
    if (!Number.isSafeInteger(value) || value < 0)
        throw new Error("course_unlock_arithmetic_overflow");
    return value;
};
const finalizeCourseState = (body) => {
    const cleanBody = { ...body };
    delete cleanBody.stateFingerprint;
    return deepFreeze({
        ...cleanBody,
        stateFingerprint: (0, decision_registry_1.hashCanonicalBody)(cleanBody),
    });
};
const createCourseUnlockState = (input) => {
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_state_invalid");
    if (!isRecord(value) || !exactKeys(value, ["accountScopeHash", "courseId", "studyTarget"]) ||
        typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
        !(0, wallet_1.isWalletIdentifier)(value.courseId) || !(0, wallet_1.isWalletIdentifier)(value.studyTarget)) {
        throw new Error("course_unlock_state_invalid");
    }
    return finalizeCourseState({
        schemaVersion: "learning-v2-course-unlock-state.v1",
        accountScopeHash: value.accountScopeHash,
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        courseIdentityFingerprint: (0, course_unlock_1.deriveCourseUnlockIdentityFingerprint)({
            accountScopeHash: value.accountScopeHash,
            courseId: value.courseId,
            studyTarget: value.studyTarget,
        }),
        policyFingerprint: course_unlock_1.COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
        highestUnlockedRequiredSessionOrdinal: 0,
        revision: 0,
    });
};
exports.createCourseUnlockState = createCourseUnlockState;
const parseCourseUnlockState = (input) => {
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_state_invalid");
    if (!isRecord(value) || !exactKeys(value, STATE_KEYS) ||
        value.schemaVersion !== "learning-v2-course-unlock-state.v1" ||
        typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
        !(0, wallet_1.isWalletIdentifier)(value.courseId) || !(0, wallet_1.isWalletIdentifier)(value.studyTarget) ||
        !validHash(value.courseIdentityFingerprint) ||
        value.policyFingerprint !== course_unlock_1.COURSE_UNLOCK_POLICY_FINGERPRINT_V1 ||
        !safe(value.highestUnlockedRequiredSessionOrdinal, 0, 384) || !safe(value.revision, 0, 384) ||
        value.revision !== value.highestUnlockedRequiredSessionOrdinal || !validHash(value.stateFingerprint)) {
        throw new Error("course_unlock_state_invalid");
    }
    const body = {
        schemaVersion: "learning-v2-course-unlock-state.v1",
        accountScopeHash: value.accountScopeHash,
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        courseIdentityFingerprint: value.courseIdentityFingerprint,
        policyFingerprint: course_unlock_1.COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
        highestUnlockedRequiredSessionOrdinal: Number(value.highestUnlockedRequiredSessionOrdinal),
        revision: Number(value.revision),
    };
    const identity = (0, course_unlock_1.deriveCourseUnlockIdentityFingerprint)(body);
    if (body.courseIdentityFingerprint !== identity || value.stateFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
        throw new Error("course_unlock_state_invalid");
    }
    return deepFreeze({ ...body, stateFingerprint: value.stateFingerprint });
};
exports.parseCourseUnlockState = parseCourseUnlockState;
const finalizeWalletAfterDebit = (state, chargedSubunits) => {
    if (chargedSubunits === 0)
        return state;
    if (!safe(chargedSubunits, 1) || state.balanceSubunits < chargedSubunits) {
        throw new Error("course_unlock_insufficient_balance");
    }
    const body = {
        schemaVersion: state.schemaVersion,
        accountScopeHash: state.accountScopeHash,
        walletIdentityFingerprint: state.walletIdentityFingerprint,
        currency: state.currency,
        unitScale: state.unitScale,
        balanceSubunits: state.balanceSubunits - chargedSubunits,
        earnedByCategorySubunits: state.earnedByCategorySubunits,
        externalCreditSubunits: state.externalCreditSubunits,
        importedOpeningSubunits: state.importedOpeningSubunits,
        spentSubunits: checkedAdd(state.spentSubunits, chargedSubunits),
        revision: checkedAdd(state.revision, 1),
    };
    return (0, wallet_reducer_1.parseWalletState)({ ...body, stateFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
};
const createDebitReceipt = (request, before, after) => {
    if (request.chargeSubunits === 0)
        return null;
    const body = {
        schemaVersion: "learning-v2-course-unlock-wallet-debit.v1",
        unlockRequestFingerprint: request.operationFingerprint,
        semanticSubjectFingerprint: request.semanticSubjectFingerprint,
        chargedSubunits: request.chargeSubunits,
        walletRevisionBefore: before.revision,
        walletRevisionAfter: after.revision,
        balanceBeforeSubunits: before.balanceSubunits,
        balanceAfterSubunits: after.balanceSubunits,
        spentBeforeSubunits: before.spentSubunits,
        spentAfterSubunits: after.spentSubunits,
        walletStateBeforeFingerprint: before.stateFingerprint,
        walletStateAfterFingerprint: after.stateFingerprint,
    };
    return deepFreeze({ ...body, debitReceiptFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
};
const createAppliedReceipt = (request, walletBefore, walletAfter, courseBefore, courseAfter) => {
    const body = {
        schemaVersion: "learning-v2-course-unlock-applied-receipt.v1",
        authorizedRequest: request,
        basis: request.basis,
        chargedSubunits: request.chargeSubunits,
        walletStateBefore: walletBefore,
        walletStateAfter: walletAfter,
        courseUnlockStateBefore: courseBefore,
        courseUnlockStateAfter: courseAfter,
        walletDebitReceipt: createDebitReceipt(request, walletBefore, walletAfter),
    };
    return deepFreeze({ ...body, appliedReceiptFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
};
const parseDebitReceipt = (input, request, before, after) => {
    if (request.chargeSubunits === 0) {
        if (input !== null)
            throw new Error("course_unlock_ledger_invalid");
        return null;
    }
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, DEBIT_KEYS) ||
        value.schemaVersion !== "learning-v2-course-unlock-wallet-debit.v1" ||
        !validHash(value.debitReceiptFingerprint))
        throw new Error("course_unlock_ledger_invalid");
    const expected = createDebitReceipt(request, before, after);
    if (!expected || (0, decision_registry_1.hashCanonicalBody)(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "debitReceiptFingerprint"))) !== value.debitReceiptFingerprint || value.debitReceiptFingerprint !== expected.debitReceiptFingerprint) {
        throw new Error("course_unlock_ledger_invalid");
    }
    return expected;
};
const parseAppliedReceiptUnsafe = (input) => {
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, RECEIPT_KEYS) ||
        value.schemaVersion !== "learning-v2-course-unlock-applied-receipt.v1" ||
        !validHash(value.appliedReceiptFingerprint) || !isRecord(value.authorizedRequest) ||
        !Object.prototype.hasOwnProperty.call(value.authorizedRequest, "semanticFingerprint") ||
        !Object.prototype.hasOwnProperty.call(value.authorizedRequest, "operationFingerprint")) {
        throw new Error("course_unlock_ledger_invalid");
    }
    const request = (0, course_unlock_1.createAuthorizedCourseUnlockRequest)(value.authorizedRequest);
    const walletBefore = (0, wallet_reducer_1.parseWalletState)(value.walletStateBefore);
    const walletAfter = (0, wallet_reducer_1.parseWalletState)(value.walletStateAfter);
    const courseBefore = (0, exports.parseCourseUnlockState)(value.courseUnlockStateBefore);
    const courseAfter = (0, exports.parseCourseUnlockState)(value.courseUnlockStateAfter);
    if (request.accountScopeHash !== walletBefore.accountScopeHash || request.accountScopeHash !== walletAfter.accountScopeHash ||
        request.accountScopeHash !== courseBefore.accountScopeHash || request.accountScopeHash !== courseAfter.accountScopeHash ||
        request.courseId !== courseBefore.courseId || request.courseId !== courseAfter.courseId ||
        request.studyTarget !== courseBefore.studyTarget || request.studyTarget !== courseAfter.studyTarget ||
        request.walletRevisionBefore !== walletBefore.revision || request.walletStateBeforeFingerprint !== walletBefore.stateFingerprint ||
        request.courseRevisionBefore !== courseBefore.revision || request.courseStateBeforeFingerprint !== courseBefore.stateFingerprint ||
        request.requiredSessionOrdinal !== courseBefore.highestUnlockedRequiredSessionOrdinal + 1 ||
        courseAfter.highestUnlockedRequiredSessionOrdinal !== request.requiredSessionOrdinal ||
        courseAfter.revision !== courseBefore.revision + 1 || value.basis !== request.basis ||
        value.chargedSubunits !== request.chargeSubunits)
        throw new Error("course_unlock_ledger_invalid");
    const expectedWalletAfter = finalizeWalletAfterDebit(walletBefore, request.chargeSubunits);
    if (expectedWalletAfter.stateFingerprint !== walletAfter.stateFingerprint)
        throw new Error("course_unlock_ledger_invalid");
    const expectedCourseAfter = finalizeCourseState({
        ...courseBefore,
        highestUnlockedRequiredSessionOrdinal: request.requiredSessionOrdinal,
        revision: courseBefore.revision + 1,
    });
    if (expectedCourseAfter.stateFingerprint !== courseAfter.stateFingerprint)
        throw new Error("course_unlock_ledger_invalid");
    const debit = parseDebitReceipt(value.walletDebitReceipt, request, walletBefore, walletAfter);
    const expected = createAppliedReceipt(request, walletBefore, walletAfter, courseBefore, courseAfter);
    if ((debit?.debitReceiptFingerprint ?? null) !==
        (expected.walletDebitReceipt?.debitReceiptFingerprint ?? null) ||
        expected.appliedReceiptFingerprint !== value.appliedReceiptFingerprint) {
        throw new Error("course_unlock_ledger_invalid");
    }
    return expected;
};
const parseCourseUnlockAppliedReceipt = (input) => {
    try {
        return parseAppliedReceiptUnsafe(input);
    }
    catch {
        throw new Error("course_unlock_ledger_invalid");
    }
};
exports.parseCourseUnlockAppliedReceipt = parseCourseUnlockAppliedReceipt;
const makeOperationEntry = (request, canonicalOperationId, receipt) => deepFreeze({
    schemaVersion: "learning-v2-course-unlock-operation-ledger-entry.v1",
    operationId: request.operationId,
    operationFingerprint: request.operationFingerprint,
    canonicalOperationId,
    semanticSubjectFingerprint: request.semanticSubjectFingerprint,
    semanticFingerprint: request.semanticFingerprint,
    appliedReceipt: receipt,
});
const makeSubjectEntry = (request, canonicalOperationId, receipt) => deepFreeze({
    schemaVersion: "learning-v2-course-unlock-subject-ledger-entry.v1",
    semanticSubjectFingerprint: request.semanticSubjectFingerprint,
    semanticFingerprint: request.semanticFingerprint,
    canonicalOperationId,
    appliedReceipt: receipt,
});
const parseOperationEntry = (input) => {
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, OP_LEDGER_KEYS) ||
        value.schemaVersion !== "learning-v2-course-unlock-operation-ledger-entry.v1" ||
        !(0, wallet_1.isWalletIdentifier)(value.operationId) || !(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId) ||
        !validHash(value.operationFingerprint))
        throw new Error("course_unlock_ledger_invalid");
    const receipt = (0, exports.parseCourseUnlockAppliedReceipt)(value.appliedReceipt);
    if (value.canonicalOperationId !== receipt.authorizedRequest.operationId ||
        value.semanticSubjectFingerprint !== receipt.authorizedRequest.semanticSubjectFingerprint ||
        value.semanticFingerprint !== receipt.authorizedRequest.semanticFingerprint ||
        (value.operationId === value.canonicalOperationId && value.operationFingerprint !== receipt.authorizedRequest.operationFingerprint)) {
        throw new Error("course_unlock_ledger_invalid");
    }
    return deepFreeze({ ...value, appliedReceipt: receipt });
};
const parseSubjectEntry = (input) => {
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, SUBJECT_LEDGER_KEYS) ||
        value.schemaVersion !== "learning-v2-course-unlock-subject-ledger-entry.v1" ||
        !(0, wallet_1.isWalletIdentifier)(value.canonicalOperationId))
        throw new Error("course_unlock_ledger_invalid");
    const receipt = (0, exports.parseCourseUnlockAppliedReceipt)(value.appliedReceipt);
    if (value.canonicalOperationId !== receipt.authorizedRequest.operationId ||
        value.semanticSubjectFingerprint !== receipt.authorizedRequest.semanticSubjectFingerprint ||
        value.semanticFingerprint !== receipt.authorizedRequest.semanticFingerprint)
        throw new Error("course_unlock_ledger_invalid");
    return deepFreeze({ ...value, appliedReceipt: receipt });
};
const parseCourseUnlockOperationLedgerEntry = (input) => {
    try {
        return parseOperationEntry(input);
    }
    catch {
        throw new Error("course_unlock_ledger_invalid");
    }
};
exports.parseCourseUnlockOperationLedgerEntry = parseCourseUnlockOperationLedgerEntry;
const parseCourseUnlockSubjectLedgerEntry = (input) => {
    try {
        return parseSubjectEntry(input);
    }
    catch {
        throw new Error("course_unlock_ledger_invalid");
    }
};
exports.parseCourseUnlockSubjectLedgerEntry = parseCourseUnlockSubjectLedgerEntry;
const createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt = (input) => {
    const receipt = (0, exports.parseCourseUnlockAppliedReceipt)(input);
    const request = receipt.authorizedRequest;
    return deepFreeze({
        operationLedgerEntry: makeOperationEntry(request, request.operationId, receipt),
        subjectLedgerEntry: makeSubjectEntry(request, request.operationId, receipt),
    });
};
exports.createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt = createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt;
const parseRepositoryVerifiedAncestry = (input) => {
    const value = (0, wallet_1.detachBoundedWalletJson)(input, "course_unlock_ledger_invalid");
    if (!isRecord(value) || !exactKeys(value, ANCESTRY_KEYS) ||
        value.schemaVersion !== "learning-v2-course-unlock-repository-ancestry.v1" ||
        value.proofSource !== "authoritative_compound_journal" ||
        !validHash(value.canonicalAppliedReceiptFingerprint) ||
        !validHash(value.currentWalletStateFingerprint) ||
        !validHash(value.currentCourseStateFingerprint)) {
        throw new Error("course_unlock_ledger_invalid");
    }
    return deepFreeze(value);
};
const classifyProjection = (current, before, after) => {
    if (current.revision === before.revision && current.stateFingerprint === before.stateFingerprint) {
        return "before";
    }
    if (current.revision === after.revision && current.stateFingerprint === after.stateFingerprint) {
        return "after";
    }
    if (current.revision > after.revision)
        return "later";
    throw new Error("course_unlock_projection_indeterminate");
};
const replayFromReceipt = (walletState, courseState, request, receipt, operationEntry, subjectEntry, ledgerWriteRequired, ancestry) => {
    const walletPosition = classifyProjection(walletState, receipt.walletStateBefore, receipt.walletStateAfter);
    const coursePosition = classifyProjection(courseState, receipt.courseUnlockStateBefore, receipt.courseUnlockStateAfter);
    if (walletPosition === "later" || coursePosition === "later") {
        if (!ancestry ||
            ancestry.canonicalAppliedReceiptFingerprint !== receipt.appliedReceiptFingerprint ||
            ancestry.currentWalletStateFingerprint !== walletState.stateFingerprint ||
            ancestry.currentCourseStateFingerprint !== courseState.stateFingerprint) {
            throw new Error("course_unlock_projection_indeterminate");
        }
    }
    const walletChanged = walletPosition === "before" &&
        walletState.stateFingerprint !== receipt.walletStateAfter.stateFingerprint;
    const courseChanged = coursePosition === "before" &&
        courseState.stateFingerprint !== receipt.courseUnlockStateAfter.stateFingerprint;
    const nextWalletState = walletPosition === "before" ? receipt.walletStateAfter : walletState;
    const nextCourseState = coursePosition === "before" ? receipt.courseUnlockStateAfter : courseState;
    return deepFreeze({
        status: "applied",
        changed: walletChanged || courseChanged,
        walletStateChanged: walletChanged,
        courseUnlockStateChanged: courseChanged,
        walletState: nextWalletState,
        courseUnlockState: nextCourseState,
        expectedWalletRevision: walletState.revision,
        nextWalletRevision: nextWalletState.revision,
        expectedCourseRevision: courseState.revision,
        nextCourseRevision: nextCourseState.revision,
        appliedReceipt: receipt,
        operationLedgerEntry: operationEntry,
        subjectLedgerEntry: subjectEntry,
        ledgerWriteRequired,
    });
};
const rebuildCourseUnlockStatesFromAppliedReceipt = (input) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
        Reflect.ownKeys(input).length !== 3 || Reflect.ownKeys(input).some((key) => typeof key !== "string" || !["startingWalletState", "startingCourseUnlockState", "appliedReceipt"].includes(key))) {
        throw new Error("course_unlock_audit_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (!Object.values(descriptors).every((descriptor) => "value" in descriptor && descriptor.enumerable)) {
        throw new Error("course_unlock_audit_invalid");
    }
    try {
        const walletState = (0, wallet_reducer_1.parseWalletState)(descriptors.startingWalletState.value);
        const courseState = (0, exports.parseCourseUnlockState)(descriptors.startingCourseUnlockState.value);
        const receipt = (0, exports.parseCourseUnlockAppliedReceipt)(descriptors.appliedReceipt.value);
        if (walletState.stateFingerprint !== receipt.walletStateBefore.stateFingerprint ||
            courseState.stateFingerprint !== receipt.courseUnlockStateBefore.stateFingerprint) {
            throw new Error("course_unlock_audit_invalid");
        }
        return deepFreeze({
            walletState: receipt.walletStateAfter,
            courseUnlockState: receipt.courseUnlockStateAfter,
        });
    }
    catch {
        throw new Error("course_unlock_audit_invalid");
    }
};
exports.rebuildCourseUnlockStatesFromAppliedReceipt = rebuildCourseUnlockStatesFromAppliedReceipt;
const readInputEnvelope = (input) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
        Reflect.ownKeys(input).length !== 4 || Reflect.ownKeys(input).some((key) => typeof key !== "string" || !["walletState", "courseUnlockState", "authorizedRequest", "lookup"].includes(key))) {
        throw new Error("course_unlock_input_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (!Object.values(descriptors).every((descriptor) => "value" in descriptor && descriptor.enumerable)) {
        throw new Error("course_unlock_input_invalid");
    }
    return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
};
const reduceAuthorizedCourseUnlock = (input) => {
    const envelope = readInputEnvelope(input);
    const walletState = (0, wallet_reducer_1.parseWalletState)(envelope.walletState);
    const courseState = (0, exports.parseCourseUnlockState)(envelope.courseUnlockState);
    if (!isRecord(envelope.authorizedRequest) ||
        !Object.prototype.hasOwnProperty.call(envelope.authorizedRequest, "semanticFingerprint") ||
        !Object.prototype.hasOwnProperty.call(envelope.authorizedRequest, "operationFingerprint")) {
        throw new Error("course_unlock_request_invalid");
    }
    const request = (0, course_unlock_1.createAuthorizedCourseUnlockRequest)(envelope.authorizedRequest);
    const lookup = (0, wallet_1.detachBoundedWalletJson)(envelope.lookup, "course_unlock_ledger_invalid");
    if (!isRecord(lookup) || !Object.prototype.hasOwnProperty.call(lookup, "currentAccountGeneration") ||
        !Object.keys(lookup).every((key) => ["currentAccountGeneration", "operationLedgerEntry", "subjectLedgerEntry", "repositoryVerifiedAncestry"].includes(key)) ||
        !safe(lookup.currentAccountGeneration))
        throw new Error("course_unlock_ledger_invalid");
    if (request.accountGeneration !== lookup.currentAccountGeneration)
        throw new Error("course_unlock_generation_stale");
    if (request.accountScopeHash !== walletState.accountScopeHash || request.accountScopeHash !== courseState.accountScopeHash ||
        request.courseId !== courseState.courseId || request.studyTarget !== courseState.studyTarget) {
        throw new Error("course_unlock_scope_mismatch");
    }
    const operationEntry = Object.prototype.hasOwnProperty.call(lookup, "operationLedgerEntry")
        ? parseOperationEntry(lookup.operationLedgerEntry)
        : undefined;
    const subjectEntry = Object.prototype.hasOwnProperty.call(lookup, "subjectLedgerEntry")
        ? parseSubjectEntry(lookup.subjectLedgerEntry)
        : undefined;
    const repositoryVerifiedAncestry = Object.prototype.hasOwnProperty.call(lookup, "repositoryVerifiedAncestry")
        ? parseRepositoryVerifiedAncestry(lookup.repositoryVerifiedAncestry)
        : undefined;
    if (repositoryVerifiedAncestry && !operationEntry && !subjectEntry) {
        throw new Error("course_unlock_ledger_invalid");
    }
    if (operationEntry && subjectEntry && (operationEntry.canonicalOperationId !== subjectEntry.canonicalOperationId ||
        operationEntry.appliedReceipt.appliedReceiptFingerprint !== subjectEntry.appliedReceipt.appliedReceiptFingerprint))
        throw new Error("course_unlock_ledger_invalid");
    if (operationEntry) {
        if (operationEntry.operationId !== request.operationId || operationEntry.operationFingerprint !== request.operationFingerprint ||
            operationEntry.semanticSubjectFingerprint !== request.semanticSubjectFingerprint ||
            operationEntry.semanticFingerprint !== request.semanticFingerprint)
            throw new Error("course_unlock_operation_conflict");
        const canonical = operationEntry.appliedReceipt;
        return replayFromReceipt(walletState, courseState, request, canonical, operationEntry, subjectEntry ?? makeSubjectEntry(request, operationEntry.canonicalOperationId, canonical), !subjectEntry, repositoryVerifiedAncestry);
    }
    if (subjectEntry) {
        if (subjectEntry.semanticSubjectFingerprint !== request.semanticSubjectFingerprint ||
            subjectEntry.semanticFingerprint !== request.semanticFingerprint)
            throw new Error("course_unlock_operation_conflict");
        const canonical = subjectEntry.appliedReceipt;
        if (request.operationId === subjectEntry.canonicalOperationId &&
            request.operationFingerprint !== canonical.authorizedRequest.operationFingerprint) {
            throw new Error("course_unlock_operation_conflict");
        }
        return replayFromReceipt(walletState, courseState, request, canonical, makeOperationEntry(request, subjectEntry.canonicalOperationId, canonical), subjectEntry, true, repositoryVerifiedAncestry);
    }
    if (request.requiredSessionOrdinal <= courseState.highestUnlockedRequiredSessionOrdinal) {
        throw new Error("course_unlock_projection_indeterminate");
    }
    if (request.requiredSessionOrdinal !== courseState.highestUnlockedRequiredSessionOrdinal + 1) {
        throw new Error("course_unlock_not_contiguous");
    }
    if (request.walletRevisionBefore !== walletState.revision || request.walletStateBeforeFingerprint !== walletState.stateFingerprint ||
        request.courseRevisionBefore !== courseState.revision || request.courseStateBeforeFingerprint !== courseState.stateFingerprint) {
        throw new Error("course_unlock_request_out_of_order");
    }
    const expectedCharge = (0, course_unlock_1.requiredCourseUnlockPriceStars)(courseState.highestUnlockedRequiredSessionOrdinal) * wallet_1.WALLET_SUBUNITS_PER_STAR;
    if (request.chargeSubunits !== expectedCharge || request.policyFingerprint !== courseState.policyFingerprint) {
        throw new Error("course_unlock_policy_mismatch");
    }
    if (walletState.balanceSubunits < expectedCharge) {
        return deepFreeze({
            status: "insufficient_balance",
            changed: false,
            walletState,
            courseUnlockState: courseState,
            requiredSubunits: expectedCharge,
            currentBalanceSubunits: walletState.balanceSubunits,
            expectedWalletRevision: walletState.revision,
            nextWalletRevision: walletState.revision,
            expectedCourseRevision: courseState.revision,
            nextCourseRevision: courseState.revision,
        });
    }
    const walletAfter = finalizeWalletAfterDebit(walletState, expectedCharge);
    const courseAfter = finalizeCourseState({
        ...courseState,
        highestUnlockedRequiredSessionOrdinal: request.requiredSessionOrdinal,
        revision: checkedAdd(courseState.revision, 1),
    });
    const receipt = createAppliedReceipt(request, walletState, walletAfter, courseState, courseAfter);
    return deepFreeze({
        status: "applied",
        changed: true,
        walletStateChanged: walletAfter.stateFingerprint !== walletState.stateFingerprint,
        courseUnlockStateChanged: true,
        walletState: walletAfter,
        courseUnlockState: courseAfter,
        expectedWalletRevision: walletState.revision,
        nextWalletRevision: walletAfter.revision,
        expectedCourseRevision: courseState.revision,
        nextCourseRevision: courseAfter.revision,
        appliedReceipt: receipt,
        operationLedgerEntry: makeOperationEntry(request, request.operationId, receipt),
        subjectLedgerEntry: makeSubjectEntry(request, request.operationId, receipt),
        ledgerWriteRequired: true,
    });
};
exports.reduceAuthorizedCourseUnlock = reduceAuthorizedCourseUnlock;
//# sourceMappingURL=course_unlock_reducer.js.map