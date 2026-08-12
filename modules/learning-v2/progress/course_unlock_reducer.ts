import {
  COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
  createAuthorizedCourseUnlockRequest,
  deriveCourseUnlockIdentityFingerprint,
  requiredCourseUnlockPriceStars,
  type AuthorizedCourseUnlockRequestV1,
} from "../contracts/course_unlock";
import {
  WALLET_SUBUNITS_PER_STAR,
  detachBoundedWalletJson,
  isWalletIdentifier,
} from "../contracts/wallet";
import { hashCanonicalBody } from "../policies/decision_registry";
import {
  parseWalletState,
  type WalletStateV1,
} from "./wallet_reducer";

export interface CourseUnlockStateV1 {
  readonly schemaVersion: "learning-v2-course-unlock-state.v1";
  readonly accountScopeHash: string;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseIdentityFingerprint: string;
  readonly policyFingerprint: string;
  readonly highestUnlockedRequiredSessionOrdinal: number;
  readonly revision: number;
  readonly stateFingerprint: string;
}

export interface CourseUnlockWalletDebitReceiptV1 {
  readonly schemaVersion: "learning-v2-course-unlock-wallet-debit.v1";
  readonly unlockRequestFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly chargedSubunits: number;
  readonly walletRevisionBefore: number;
  readonly walletRevisionAfter: number;
  readonly balanceBeforeSubunits: number;
  readonly balanceAfterSubunits: number;
  readonly spentBeforeSubunits: number;
  readonly spentAfterSubunits: number;
  readonly walletStateBeforeFingerprint: string;
  readonly walletStateAfterFingerprint: string;
  readonly debitReceiptFingerprint: string;
}

export interface CourseUnlockAppliedReceiptV1 {
  readonly schemaVersion: "learning-v2-course-unlock-applied-receipt.v1";
  readonly authorizedRequest: AuthorizedCourseUnlockRequestV1;
  readonly basis: "free_first_session" | "stars";
  readonly chargedSubunits: number;
  readonly walletStateBefore: WalletStateV1;
  readonly walletStateAfter: WalletStateV1;
  readonly courseUnlockStateBefore: CourseUnlockStateV1;
  readonly courseUnlockStateAfter: CourseUnlockStateV1;
  readonly walletDebitReceipt: CourseUnlockWalletDebitReceiptV1 | null;
  readonly appliedReceiptFingerprint: string;
}

export interface CourseUnlockOperationLedgerEntryV1 {
  readonly schemaVersion: "learning-v2-course-unlock-operation-ledger-entry.v1";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly canonicalOperationId: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
}

export interface CourseUnlockSubjectLedgerEntryV1 {
  readonly schemaVersion: "learning-v2-course-unlock-subject-ledger-entry.v1";
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly canonicalOperationId: string;
  readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
}

export interface CourseUnlockLedgerLookup {
  readonly currentAccountGeneration: number;
  readonly operationLedgerEntry?: CourseUnlockOperationLedgerEntryV1;
  readonly subjectLedgerEntry?: CourseUnlockSubjectLedgerEntryV1;
  /** Repository-resolved journal ancestry; this object is not client authority. */
  readonly repositoryVerifiedAncestry?: CourseUnlockRepositoryVerifiedAncestryV1;
}

export interface CourseUnlockRepositoryVerifiedAncestryV1 {
  readonly schemaVersion: "learning-v2-course-unlock-repository-ancestry.v1";
  readonly canonicalAppliedReceiptFingerprint: string;
  readonly currentWalletStateFingerprint: string;
  readonly currentCourseStateFingerprint: string;
  readonly proofSource: "authoritative_compound_journal";
}

export type CourseUnlockReductionResult =
  | {
      readonly status: "insufficient_balance";
      readonly changed: false;
      readonly walletState: WalletStateV1;
      readonly courseUnlockState: CourseUnlockStateV1;
      readonly requiredSubunits: number;
      readonly currentBalanceSubunits: number;
      readonly expectedWalletRevision: number;
      readonly nextWalletRevision: number;
      readonly expectedCourseRevision: number;
      readonly nextCourseRevision: number;
    }
  | {
      readonly status: "applied";
      readonly changed: boolean;
      readonly walletStateChanged: boolean;
      readonly courseUnlockStateChanged: boolean;
      readonly walletState: WalletStateV1;
      readonly courseUnlockState: CourseUnlockStateV1;
      readonly expectedWalletRevision: number;
      readonly nextWalletRevision: number;
      readonly expectedCourseRevision: number;
      readonly nextCourseRevision: number;
      readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
      readonly operationLedgerEntry: CourseUnlockOperationLedgerEntryV1;
      readonly subjectLedgerEntry: CourseUnlockSubjectLedgerEntryV1;
      readonly ledgerWriteRequired: boolean;
    };

const HASH = /^[a-f0-9]{64}$/;
const STATE_KEYS = [
  "schemaVersion", "accountScopeHash", "courseId", "studyTarget",
  "courseIdentityFingerprint", "policyFingerprint",
  "highestUnlockedRequiredSessionOrdinal", "revision", "stateFingerprint",
] as const;
const DEBIT_KEYS = [
  "schemaVersion", "unlockRequestFingerprint", "semanticSubjectFingerprint",
  "chargedSubunits", "walletRevisionBefore", "walletRevisionAfter",
  "balanceBeforeSubunits", "balanceAfterSubunits", "spentBeforeSubunits",
  "spentAfterSubunits", "walletStateBeforeFingerprint",
  "walletStateAfterFingerprint", "debitReceiptFingerprint",
] as const;
const RECEIPT_KEYS = [
  "schemaVersion", "authorizedRequest", "basis", "chargedSubunits",
  "walletStateBefore", "walletStateAfter", "courseUnlockStateBefore",
  "courseUnlockStateAfter", "walletDebitReceipt", "appliedReceiptFingerprint",
] as const;
const OP_LEDGER_KEYS = [
  "schemaVersion", "operationId", "operationFingerprint", "canonicalOperationId",
  "semanticSubjectFingerprint", "semanticFingerprint", "appliedReceipt",
] as const;
const SUBJECT_LEDGER_KEYS = [
  "schemaVersion", "semanticSubjectFingerprint", "semanticFingerprint",
  "canonicalOperationId", "appliedReceipt",
] as const;
const ANCESTRY_KEYS = [
  "schemaVersion", "canonicalAppliedReceiptFingerprint",
  "currentWalletStateFingerprint", "currentCourseStateFingerprint", "proofSource",
] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const safe = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum && Number(value) <= maximum;
const validHash = (value: unknown): value is string => typeof value === "string" && HASH.test(value);
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const checkedAdd = (left: number, right: number): number => {
  const value = left + right;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("course_unlock_arithmetic_overflow");
  return value;
};

const finalizeCourseState = (body: Omit<CourseUnlockStateV1, "stateFingerprint">): CourseUnlockStateV1 => {
  const cleanBody = { ...body } as Record<string, unknown>;
  delete cleanBody.stateFingerprint;
  return deepFreeze({
    ...(cleanBody as unknown as Omit<CourseUnlockStateV1, "stateFingerprint">),
    stateFingerprint: hashCanonicalBody(cleanBody),
  });
};

export const createCourseUnlockState = (input: unknown): CourseUnlockStateV1 => {
  const value = detachBoundedWalletJson(input, "course_unlock_state_invalid");
  if (!isRecord(value) || !exactKeys(value, ["accountScopeHash", "courseId", "studyTarget"]) ||
    typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !isWalletIdentifier(value.courseId) || !isWalletIdentifier(value.studyTarget)) {
    throw new Error("course_unlock_state_invalid");
  }
  return finalizeCourseState({
    schemaVersion: "learning-v2-course-unlock-state.v1",
    accountScopeHash: value.accountScopeHash,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseIdentityFingerprint: deriveCourseUnlockIdentityFingerprint({
      accountScopeHash: value.accountScopeHash,
      courseId: value.courseId,
      studyTarget: value.studyTarget,
    }),
    policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
    highestUnlockedRequiredSessionOrdinal: 0,
    revision: 0,
  });
};

export const parseCourseUnlockState = (input: unknown): CourseUnlockStateV1 => {
  const value = detachBoundedWalletJson(input, "course_unlock_state_invalid");
  if (!isRecord(value) || !exactKeys(value, STATE_KEYS) ||
    value.schemaVersion !== "learning-v2-course-unlock-state.v1" ||
    typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !isWalletIdentifier(value.courseId) || !isWalletIdentifier(value.studyTarget) ||
    !validHash(value.courseIdentityFingerprint) ||
    value.policyFingerprint !== COURSE_UNLOCK_POLICY_FINGERPRINT_V1 ||
    !safe(value.highestUnlockedRequiredSessionOrdinal, 0, 384) || !safe(value.revision, 0, 384) ||
    value.revision !== value.highestUnlockedRequiredSessionOrdinal || !validHash(value.stateFingerprint)) {
    throw new Error("course_unlock_state_invalid");
  }
  const body = {
    schemaVersion: "learning-v2-course-unlock-state.v1" as const,
    accountScopeHash: value.accountScopeHash,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseIdentityFingerprint: value.courseIdentityFingerprint,
    policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
    highestUnlockedRequiredSessionOrdinal: Number(value.highestUnlockedRequiredSessionOrdinal),
    revision: Number(value.revision),
  };
  const identity = deriveCourseUnlockIdentityFingerprint(body);
  if (body.courseIdentityFingerprint !== identity || value.stateFingerprint !== hashCanonicalBody(body)) {
    throw new Error("course_unlock_state_invalid");
  }
  return deepFreeze({ ...body, stateFingerprint: value.stateFingerprint });
};

const finalizeWalletAfterDebit = (state: WalletStateV1, chargedSubunits: number): WalletStateV1 => {
  if (chargedSubunits === 0) return state;
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
  return parseWalletState({ ...body, stateFingerprint: hashCanonicalBody(body) });
};

const createDebitReceipt = (
  request: AuthorizedCourseUnlockRequestV1,
  before: WalletStateV1,
  after: WalletStateV1,
): CourseUnlockWalletDebitReceiptV1 | null => {
  if (request.chargeSubunits === 0) return null;
  const body = {
    schemaVersion: "learning-v2-course-unlock-wallet-debit.v1" as const,
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
  return deepFreeze({ ...body, debitReceiptFingerprint: hashCanonicalBody(body) });
};

const createAppliedReceipt = (
  request: AuthorizedCourseUnlockRequestV1,
  walletBefore: WalletStateV1,
  walletAfter: WalletStateV1,
  courseBefore: CourseUnlockStateV1,
  courseAfter: CourseUnlockStateV1,
): CourseUnlockAppliedReceiptV1 => {
  const body = {
    schemaVersion: "learning-v2-course-unlock-applied-receipt.v1" as const,
    authorizedRequest: request,
    basis: request.basis,
    chargedSubunits: request.chargeSubunits,
    walletStateBefore: walletBefore,
    walletStateAfter: walletAfter,
    courseUnlockStateBefore: courseBefore,
    courseUnlockStateAfter: courseAfter,
    walletDebitReceipt: createDebitReceipt(request, walletBefore, walletAfter),
  };
  return deepFreeze({ ...body, appliedReceiptFingerprint: hashCanonicalBody(body) });
};

const parseDebitReceipt = (
  input: unknown,
  request: AuthorizedCourseUnlockRequestV1,
  before: WalletStateV1,
  after: WalletStateV1,
): CourseUnlockWalletDebitReceiptV1 | null => {
  if (request.chargeSubunits === 0) {
    if (input !== null) throw new Error("course_unlock_ledger_invalid");
    return null;
  }
  const value = detachBoundedWalletJson(input, "course_unlock_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, DEBIT_KEYS) ||
    value.schemaVersion !== "learning-v2-course-unlock-wallet-debit.v1" ||
    !validHash(value.debitReceiptFingerprint)) throw new Error("course_unlock_ledger_invalid");
  const expected = createDebitReceipt(request, before, after);
  if (!expected || hashCanonicalBody(Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "debitReceiptFingerprint"),
  )) !== value.debitReceiptFingerprint || value.debitReceiptFingerprint !== expected.debitReceiptFingerprint) {
    throw new Error("course_unlock_ledger_invalid");
  }
  return expected;
};

const parseAppliedReceiptUnsafe = (input: unknown): CourseUnlockAppliedReceiptV1 => {
  const value = detachBoundedWalletJson(input, "course_unlock_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, RECEIPT_KEYS) ||
    value.schemaVersion !== "learning-v2-course-unlock-applied-receipt.v1" ||
    !validHash(value.appliedReceiptFingerprint) || !isRecord(value.authorizedRequest) ||
    !Object.prototype.hasOwnProperty.call(value.authorizedRequest, "semanticFingerprint") ||
    !Object.prototype.hasOwnProperty.call(value.authorizedRequest, "operationFingerprint")) {
    throw new Error("course_unlock_ledger_invalid");
  }
  const request = createAuthorizedCourseUnlockRequest(value.authorizedRequest);
  const walletBefore = parseWalletState(value.walletStateBefore);
  const walletAfter = parseWalletState(value.walletStateAfter);
  const courseBefore = parseCourseUnlockState(value.courseUnlockStateBefore);
  const courseAfter = parseCourseUnlockState(value.courseUnlockStateAfter);
  if (request.accountScopeHash !== walletBefore.accountScopeHash || request.accountScopeHash !== walletAfter.accountScopeHash ||
    request.accountScopeHash !== courseBefore.accountScopeHash || request.accountScopeHash !== courseAfter.accountScopeHash ||
    request.courseId !== courseBefore.courseId || request.courseId !== courseAfter.courseId ||
    request.studyTarget !== courseBefore.studyTarget || request.studyTarget !== courseAfter.studyTarget ||
    request.walletRevisionBefore !== walletBefore.revision || request.walletStateBeforeFingerprint !== walletBefore.stateFingerprint ||
    request.courseRevisionBefore !== courseBefore.revision || request.courseStateBeforeFingerprint !== courseBefore.stateFingerprint ||
    request.requiredSessionOrdinal !== courseBefore.highestUnlockedRequiredSessionOrdinal + 1 ||
    courseAfter.highestUnlockedRequiredSessionOrdinal !== request.requiredSessionOrdinal ||
    courseAfter.revision !== courseBefore.revision + 1 || value.basis !== request.basis ||
    value.chargedSubunits !== request.chargeSubunits) throw new Error("course_unlock_ledger_invalid");
  const expectedWalletAfter = finalizeWalletAfterDebit(walletBefore, request.chargeSubunits);
  if (expectedWalletAfter.stateFingerprint !== walletAfter.stateFingerprint) throw new Error("course_unlock_ledger_invalid");
  const expectedCourseAfter = finalizeCourseState({
    ...courseBefore,
    highestUnlockedRequiredSessionOrdinal: request.requiredSessionOrdinal,
    revision: courseBefore.revision + 1,
  });
  if (expectedCourseAfter.stateFingerprint !== courseAfter.stateFingerprint) throw new Error("course_unlock_ledger_invalid");
  const debit = parseDebitReceipt(value.walletDebitReceipt, request, walletBefore, walletAfter);
  const expected = createAppliedReceipt(request, walletBefore, walletAfter, courseBefore, courseAfter);
  if ((debit?.debitReceiptFingerprint ?? null) !==
      (expected.walletDebitReceipt?.debitReceiptFingerprint ?? null) ||
    expected.appliedReceiptFingerprint !== value.appliedReceiptFingerprint) {
    throw new Error("course_unlock_ledger_invalid");
  }
  return expected;
};

export const parseCourseUnlockAppliedReceipt = (input: unknown): CourseUnlockAppliedReceiptV1 => {
  try {
    return parseAppliedReceiptUnsafe(input);
  } catch {
    throw new Error("course_unlock_ledger_invalid");
  }
};

const makeOperationEntry = (
  request: AuthorizedCourseUnlockRequestV1,
  canonicalOperationId: string,
  receipt: CourseUnlockAppliedReceiptV1,
): CourseUnlockOperationLedgerEntryV1 => deepFreeze({
  schemaVersion: "learning-v2-course-unlock-operation-ledger-entry.v1",
  operationId: request.operationId,
  operationFingerprint: request.operationFingerprint,
  canonicalOperationId,
  semanticSubjectFingerprint: request.semanticSubjectFingerprint,
  semanticFingerprint: request.semanticFingerprint,
  appliedReceipt: receipt,
});

const makeSubjectEntry = (
  request: AuthorizedCourseUnlockRequestV1,
  canonicalOperationId: string,
  receipt: CourseUnlockAppliedReceiptV1,
): CourseUnlockSubjectLedgerEntryV1 => deepFreeze({
  schemaVersion: "learning-v2-course-unlock-subject-ledger-entry.v1",
  semanticSubjectFingerprint: request.semanticSubjectFingerprint,
  semanticFingerprint: request.semanticFingerprint,
  canonicalOperationId,
  appliedReceipt: receipt,
});

const parseOperationEntry = (input: unknown): CourseUnlockOperationLedgerEntryV1 => {
  const value = detachBoundedWalletJson(input, "course_unlock_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, OP_LEDGER_KEYS) ||
    value.schemaVersion !== "learning-v2-course-unlock-operation-ledger-entry.v1" ||
    !isWalletIdentifier(value.operationId) || !isWalletIdentifier(value.canonicalOperationId) ||
    !validHash(value.operationFingerprint)) throw new Error("course_unlock_ledger_invalid");
  const receipt = parseCourseUnlockAppliedReceipt(value.appliedReceipt);
  if (value.canonicalOperationId !== receipt.authorizedRequest.operationId ||
    value.semanticSubjectFingerprint !== receipt.authorizedRequest.semanticSubjectFingerprint ||
    value.semanticFingerprint !== receipt.authorizedRequest.semanticFingerprint ||
    (value.operationId === value.canonicalOperationId && value.operationFingerprint !== receipt.authorizedRequest.operationFingerprint)) {
    throw new Error("course_unlock_ledger_invalid");
  }
  return deepFreeze({ ...value, appliedReceipt: receipt } as unknown as CourseUnlockOperationLedgerEntryV1);
};

const parseSubjectEntry = (input: unknown): CourseUnlockSubjectLedgerEntryV1 => {
  const value = detachBoundedWalletJson(input, "course_unlock_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, SUBJECT_LEDGER_KEYS) ||
    value.schemaVersion !== "learning-v2-course-unlock-subject-ledger-entry.v1" ||
    !isWalletIdentifier(value.canonicalOperationId)) throw new Error("course_unlock_ledger_invalid");
  const receipt = parseCourseUnlockAppliedReceipt(value.appliedReceipt);
  if (value.canonicalOperationId !== receipt.authorizedRequest.operationId ||
    value.semanticSubjectFingerprint !== receipt.authorizedRequest.semanticSubjectFingerprint ||
    value.semanticFingerprint !== receipt.authorizedRequest.semanticFingerprint) throw new Error("course_unlock_ledger_invalid");
  return deepFreeze({ ...value, appliedReceipt: receipt } as unknown as CourseUnlockSubjectLedgerEntryV1);
};

export const parseCourseUnlockOperationLedgerEntry = (
  input: unknown,
): CourseUnlockOperationLedgerEntryV1 => {
  try {
    return parseOperationEntry(input);
  } catch {
    throw new Error("course_unlock_ledger_invalid");
  }
};

export const parseCourseUnlockSubjectLedgerEntry = (
  input: unknown,
): CourseUnlockSubjectLedgerEntryV1 => {
  try {
    return parseSubjectEntry(input);
  } catch {
    throw new Error("course_unlock_ledger_invalid");
  }
};

export const createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt = (
  input: unknown,
): Readonly<{
  readonly operationLedgerEntry: CourseUnlockOperationLedgerEntryV1;
  readonly subjectLedgerEntry: CourseUnlockSubjectLedgerEntryV1;
}> => {
  const receipt = parseCourseUnlockAppliedReceipt(input);
  const request = receipt.authorizedRequest;
  return deepFreeze({
    operationLedgerEntry: makeOperationEntry(
      request,
      request.operationId,
      receipt,
    ),
    subjectLedgerEntry: makeSubjectEntry(
      request,
      request.operationId,
      receipt,
    ),
  });
};

const parseRepositoryVerifiedAncestry = (input: unknown): CourseUnlockRepositoryVerifiedAncestryV1 => {
  const value = detachBoundedWalletJson(input, "course_unlock_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, ANCESTRY_KEYS) ||
    value.schemaVersion !== "learning-v2-course-unlock-repository-ancestry.v1" ||
    value.proofSource !== "authoritative_compound_journal" ||
    !validHash(value.canonicalAppliedReceiptFingerprint) ||
    !validHash(value.currentWalletStateFingerprint) ||
    !validHash(value.currentCourseStateFingerprint)) {
    throw new Error("course_unlock_ledger_invalid");
  }
  return deepFreeze(value as unknown as CourseUnlockRepositoryVerifiedAncestryV1);
};

type ProjectionPosition = "before" | "after" | "later";
const classifyProjection = <T extends { readonly revision: number; readonly stateFingerprint: string }>(
  current: T,
  before: T,
  after: T,
): ProjectionPosition => {
  if (current.revision === before.revision && current.stateFingerprint === before.stateFingerprint) {
    return "before";
  }
  if (current.revision === after.revision && current.stateFingerprint === after.stateFingerprint) {
    return "after";
  }
  if (current.revision > after.revision) return "later";
  throw new Error("course_unlock_projection_indeterminate");
};

const replayFromReceipt = (
  walletState: WalletStateV1,
  courseState: CourseUnlockStateV1,
  request: AuthorizedCourseUnlockRequestV1,
  receipt: CourseUnlockAppliedReceiptV1,
  operationEntry: CourseUnlockOperationLedgerEntryV1,
  subjectEntry: CourseUnlockSubjectLedgerEntryV1,
  ledgerWriteRequired: boolean,
  ancestry: CourseUnlockRepositoryVerifiedAncestryV1 | undefined,
): CourseUnlockReductionResult => {
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
    status: "applied" as const,
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

export const rebuildCourseUnlockStatesFromAppliedReceipt = (input: unknown): Readonly<{
  walletState: WalletStateV1;
  courseUnlockState: CourseUnlockStateV1;
}> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
    Reflect.ownKeys(input).length !== 3 || Reflect.ownKeys(input).some((key) =>
      typeof key !== "string" || !["startingWalletState", "startingCourseUnlockState", "appliedReceipt"].includes(key))) {
    throw new Error("course_unlock_audit_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (!Object.values(descriptors).every((descriptor) => "value" in descriptor && descriptor.enumerable)) {
    throw new Error("course_unlock_audit_invalid");
  }
  try {
    const walletState = parseWalletState(descriptors.startingWalletState.value);
    const courseState = parseCourseUnlockState(descriptors.startingCourseUnlockState.value);
    const receipt = parseCourseUnlockAppliedReceipt(descriptors.appliedReceipt.value);
    if (walletState.stateFingerprint !== receipt.walletStateBefore.stateFingerprint ||
      courseState.stateFingerprint !== receipt.courseUnlockStateBefore.stateFingerprint) {
      throw new Error("course_unlock_audit_invalid");
    }
    return deepFreeze({
      walletState: receipt.walletStateAfter,
      courseUnlockState: receipt.courseUnlockStateAfter,
    });
  } catch {
    throw new Error("course_unlock_audit_invalid");
  }
};

const readInputEnvelope = (input: unknown): Record<string, unknown> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
    Reflect.ownKeys(input).length !== 4 || Reflect.ownKeys(input).some((key) =>
      typeof key !== "string" || !["walletState", "courseUnlockState", "authorizedRequest", "lookup"].includes(key))) {
    throw new Error("course_unlock_input_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (!Object.values(descriptors).every((descriptor) => "value" in descriptor && descriptor.enumerable)) {
    throw new Error("course_unlock_input_invalid");
  }
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
};

export const reduceAuthorizedCourseUnlock = (input: unknown): CourseUnlockReductionResult => {
  const envelope = readInputEnvelope(input);
  const walletState = parseWalletState(envelope.walletState);
  const courseState = parseCourseUnlockState(envelope.courseUnlockState);
  if (!isRecord(envelope.authorizedRequest) ||
    !Object.prototype.hasOwnProperty.call(envelope.authorizedRequest, "semanticFingerprint") ||
    !Object.prototype.hasOwnProperty.call(envelope.authorizedRequest, "operationFingerprint")) {
    throw new Error("course_unlock_request_invalid");
  }
  const request = createAuthorizedCourseUnlockRequest(envelope.authorizedRequest);
  const lookup = detachBoundedWalletJson(envelope.lookup, "course_unlock_ledger_invalid");
  if (!isRecord(lookup) || !Object.prototype.hasOwnProperty.call(lookup, "currentAccountGeneration") ||
    !Object.keys(lookup).every((key) => ["currentAccountGeneration", "operationLedgerEntry", "subjectLedgerEntry", "repositoryVerifiedAncestry"].includes(key)) ||
    !safe(lookup.currentAccountGeneration)) throw new Error("course_unlock_ledger_invalid");
  if (request.accountGeneration !== lookup.currentAccountGeneration) throw new Error("course_unlock_generation_stale");
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
  if (operationEntry && subjectEntry && (
    operationEntry.canonicalOperationId !== subjectEntry.canonicalOperationId ||
    operationEntry.appliedReceipt.appliedReceiptFingerprint !== subjectEntry.appliedReceipt.appliedReceiptFingerprint
  )) throw new Error("course_unlock_ledger_invalid");
  if (operationEntry) {
    if (operationEntry.operationId !== request.operationId || operationEntry.operationFingerprint !== request.operationFingerprint ||
      operationEntry.semanticSubjectFingerprint !== request.semanticSubjectFingerprint ||
      operationEntry.semanticFingerprint !== request.semanticFingerprint) throw new Error("course_unlock_operation_conflict");
    const canonical = operationEntry.appliedReceipt;
    return replayFromReceipt(
      walletState,
      courseState,
      request,
      canonical,
      operationEntry,
      subjectEntry ?? makeSubjectEntry(request, operationEntry.canonicalOperationId, canonical),
      !subjectEntry,
      repositoryVerifiedAncestry,
    );
  }
  if (subjectEntry) {
    if (subjectEntry.semanticSubjectFingerprint !== request.semanticSubjectFingerprint ||
      subjectEntry.semanticFingerprint !== request.semanticFingerprint) throw new Error("course_unlock_operation_conflict");
    const canonical = subjectEntry.appliedReceipt;
    if (request.operationId === subjectEntry.canonicalOperationId &&
      request.operationFingerprint !== canonical.authorizedRequest.operationFingerprint) {
      throw new Error("course_unlock_operation_conflict");
    }
    return replayFromReceipt(
      walletState,
      courseState,
      request,
      canonical,
      makeOperationEntry(request, subjectEntry.canonicalOperationId, canonical),
      subjectEntry,
      true,
      repositoryVerifiedAncestry,
    );
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
  const expectedCharge = requiredCourseUnlockPriceStars(courseState.highestUnlockedRequiredSessionOrdinal) * WALLET_SUBUNITS_PER_STAR;
  if (request.chargeSubunits !== expectedCharge || request.policyFingerprint !== courseState.policyFingerprint) {
    throw new Error("course_unlock_policy_mismatch");
  }
  if (walletState.balanceSubunits < expectedCharge) {
    return deepFreeze({
      status: "insufficient_balance" as const,
      changed: false as const,
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
    status: "applied" as const,
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
