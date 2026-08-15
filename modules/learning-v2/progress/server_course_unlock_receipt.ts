import {
  COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
  createAuthorizedCourseUnlockRequest,
  deriveCourseUnlockSemanticSubjectFingerprint,
  requiredCourseUnlockPriceStars,
  type AuthorizedCourseUnlockRequestV1,
  type CourseUnlockTargetSessionRefV1,
} from "../contracts/course_unlock";
import {
  WALLET_SUBUNITS_PER_STAR,
  detachBoundedWalletJson,
  isWalletIdentifier,
} from "../contracts/wallet";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  parseCourseUnlockAppliedReceipt,
  parseCourseUnlockState,
  type CourseUnlockAppliedReceiptV1,
  type CourseUnlockStateV1,
} from "./course_unlock_reducer";
import type { OwnerRepositoryScope } from "./owner_repository";
import { parseWalletState, type WalletStateV1 } from "./wallet_reducer";

export interface ServerCourseUnlockIntentV1 {
  readonly schemaVersion: "learning-v2-server-course-unlock-intent.v1";
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly requiredSessionOrdinal: number;
  readonly walletRevisionBefore: number;
  readonly walletStateBeforeFingerprint: string;
  readonly courseRevisionBefore: number;
  readonly courseStateBeforeFingerprint: string;
}

export interface ServerCourseUnlockReceiptV1 {
  readonly schemaVersion: "learning-v2-server-course-unlock-receipt.v1";
  readonly recordKind: "server_course_unlock_receipt";
  readonly unlockId: string;
  readonly authorizedRequest: AuthorizedCourseUnlockRequestV1;
  readonly unlockFingerprint: string;
  readonly recordFingerprint: string;
}

export interface ServerCourseUnlockReceiptMaterializationV1 {
  readonly receipt: ServerCourseUnlockReceiptV1;
  readonly encoded: string;
  /** Canonical bytes are not authority until read from protected server storage. */
  readonly authority: "structural_candidate";
}

export interface ServerCourseUnlockRequestV1 {
  readonly schemaVersion: "learning-v2-server-course-unlock-request.v1";
  readonly operationId: string;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly unlockId: string;
  readonly unlockFingerprint: string;
}

export interface ServerCourseUnlockReceiptResolver {
  resolveCourseUnlockReceipt(input: {
    readonly accountScopeHash: string;
    readonly operationId: string;
    readonly courseId: string;
    readonly studyTarget: string;
    readonly unlockId: string;
    readonly unlockFingerprint: string;
  }): Promise<unknown> | unknown;
}

export interface OwnerRepositoryCourseUnlockAuthorityInput {
  readonly scope: OwnerRepositoryScope;
  readonly walletState: WalletStateV1;
  readonly courseUnlockState: CourseUnlockStateV1;
  /** Repository-verified canonical effect for exact restart/replay only. */
  readonly canonicalAppliedReceipt: CourseUnlockAppliedReceiptV1 | null;
  readonly candidate: unknown;
}

const INTENT_KEYS = [
  "schemaVersion", "accountScopeHash", "accountGeneration", "courseId",
  "studyTarget", "requiredSessionOrdinal", "walletRevisionBefore",
  "walletStateBeforeFingerprint", "courseRevisionBefore",
  "courseStateBeforeFingerprint",
] as const;
const MATERIALIZE_KEYS = ["intent", "targetSessionRef"] as const;
const RECORD_KEYS = [
  "schemaVersion", "recordKind", "unlockId", "authorizedRequest",
  "unlockFingerprint", "recordFingerprint",
] as const;
const REQUEST_KEYS = [
  "schemaVersion", "operationId", "courseId", "studyTarget", "unlockId",
  "unlockFingerprint",
] as const;
const TARGET_KEYS = [
  "courseReleaseId", "sessionSetId", "sessionSetHash", "catalogFingerprint",
  "sessionId",
] as const;
const MAX_BYTES = 128 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const safe = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && !Object.is(value, -0) &&
  Number(value) >= minimum && Number(value) <= maximum;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const fail = (code: string): never => { throw new Error(code); };
const same = (left: unknown, right: unknown) =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const detachRecord = (
  input: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> => {
  let detached: unknown;
  try { detached = detachBoundedWalletJson(input, code); }
  catch { return fail(code); }
  if (!isRecord(detached) || !exactKeys(detached, keys)) return fail(code);
  return detached;
};
const readRecord = (
  input: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    return fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (own.length !== keys.length || own.some((key) =>
    typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })) return fail(code);
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};

export const parseServerCourseUnlockIntent = (
  input: unknown,
): ServerCourseUnlockIntentV1 => {
  const value = detachRecord(input, INTENT_KEYS, "server_course_unlock_intent_invalid");
  if (value.schemaVersion !== "learning-v2-server-course-unlock-intent.v1" ||
    typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.accountGeneration, 1) || !isWalletIdentifier(value.courseId) ||
    !isWalletIdentifier(value.studyTarget) || !safe(value.requiredSessionOrdinal, 1, 384) ||
    !safe(value.walletRevisionBefore) ||
    typeof value.walletStateBeforeFingerprint !== "string" ||
    !HASH.test(value.walletStateBeforeFingerprint) ||
    !safe(value.courseRevisionBefore, 0, 383) ||
    typeof value.courseStateBeforeFingerprint !== "string" ||
    !HASH.test(value.courseStateBeforeFingerprint) ||
    value.requiredSessionOrdinal !== Number(value.courseRevisionBefore) + 1) {
    return fail("server_course_unlock_intent_invalid");
  }
  return deepFreeze({
    schemaVersion: value.schemaVersion,
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    requiredSessionOrdinal: Number(value.requiredSessionOrdinal),
    walletRevisionBefore: Number(value.walletRevisionBefore),
    walletStateBeforeFingerprint: value.walletStateBeforeFingerprint,
    courseRevisionBefore: Number(value.courseRevisionBefore),
    courseStateBeforeFingerprint: value.courseStateBeforeFingerprint,
  });
};

const parseTargetSessionRef = (input: unknown): CourseUnlockTargetSessionRefV1 => {
  const value = detachRecord(input, TARGET_KEYS, "server_course_unlock_receipt_invalid");
  if (!isWalletIdentifier(value.courseReleaseId) ||
    !isWalletIdentifier(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" || !HASH.test(value.sessionSetHash) ||
    typeof value.catalogFingerprint !== "string" || !HASH.test(value.catalogFingerprint) ||
    !isWalletIdentifier(value.sessionId)) {
    return fail("server_course_unlock_receipt_invalid");
  }
  return deepFreeze({
    courseReleaseId: value.courseReleaseId,
    sessionSetId: value.sessionSetId,
    sessionSetHash: value.sessionSetHash,
    catalogFingerprint: value.catalogFingerprint,
    sessionId: value.sessionId,
  });
};

export const materializeServerCourseUnlockReceiptCandidate = (
  input: unknown,
): ServerCourseUnlockReceiptMaterializationV1 => {
  const value = detachRecord(input, MATERIALIZE_KEYS, "server_course_unlock_receipt_invalid");
  const intent = parseServerCourseUnlockIntent(value.intent);
  const targetSessionRef = parseTargetSessionRef(value.targetSessionRef);
  const semanticSubjectFingerprint = deriveCourseUnlockSemanticSubjectFingerprint({
    accountScopeHash: intent.accountScopeHash,
    courseId: intent.courseId,
    studyTarget: intent.studyTarget,
    requiredSessionOrdinal: intent.requiredSessionOrdinal,
  });
  const unlockIdentity = hashCanonicalBody({
    schemaVersion: "learning-v2-server-course-unlock-identity.v1",
    intent,
    targetSessionRef,
  });
  const unlockId = `cu:${unlockIdentity.slice(0, 48)}`;
  const authorizedRequest = createAuthorizedCourseUnlockRequest({
    schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
    authority: "trusted_server_boundary",
    operationId: `course-unlock:${unlockIdentity.slice(0, 40)}`,
    semanticSubjectFingerprint,
    accountScopeHash: intent.accountScopeHash,
    accountGeneration: intent.accountGeneration,
    courseId: intent.courseId,
    studyTarget: intent.studyTarget,
    requiredSessionOrdinal: intent.requiredSessionOrdinal,
    walletRevisionBefore: intent.walletRevisionBefore,
    walletStateBeforeFingerprint: intent.walletStateBeforeFingerprint,
    courseRevisionBefore: intent.courseRevisionBefore,
    courseStateBeforeFingerprint: intent.courseStateBeforeFingerprint,
    chargeSubunits: requiredCourseUnlockPriceStars(
      intent.requiredSessionOrdinal - 1,
    ) * WALLET_SUBUNITS_PER_STAR,
    basis: intent.requiredSessionOrdinal === 1 ? "free_first_session" : "stars",
    policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
    targetSessionRef,
  });
  const unlockBody = {
    schemaVersion: "learning-v2-server-course-unlock-body.v1" as const,
    unlockId,
    authorizedRequest,
  };
  const withoutRecordFingerprint = {
    schemaVersion: "learning-v2-server-course-unlock-receipt.v1" as const,
    recordKind: "server_course_unlock_receipt" as const,
    unlockId,
    authorizedRequest,
    unlockFingerprint: hashCanonicalBody(unlockBody),
  };
  const receipt = deepFreeze({
    ...withoutRecordFingerprint,
    recordFingerprint: hashCanonicalBody(withoutRecordFingerprint),
  });
  const encoded = canonicalJsonV1(receipt);
  if (utf8ByteLengthV1(encoded) > MAX_BYTES)
    return fail("server_course_unlock_receipt_invalid");
  return deepFreeze({ receipt, encoded, authority: "structural_candidate" as const });
};

export const parseServerCourseUnlockReceiptRaw = (
  raw: unknown,
): ServerCourseUnlockReceiptMaterializationV1 => {
  if (typeof raw !== "string" || raw.length > MAX_BYTES)
    return fail("server_course_unlock_receipt_indeterminate");
  let value: Readonly<Record<string, unknown>>;
  try {
    if (utf8ByteLengthV1(raw) > MAX_BYTES)
      return fail("server_course_unlock_receipt_indeterminate");
    const parsed = JSON.parse(raw) as unknown;
    if (canonicalJsonV1(parsed) !== raw)
      return fail("server_course_unlock_receipt_indeterminate");
    value = detachRecord(parsed, RECORD_KEYS, "server_course_unlock_receipt_indeterminate");
  } catch { return fail("server_course_unlock_receipt_indeterminate"); }
  if (value.schemaVersion !== "learning-v2-server-course-unlock-receipt.v1" ||
    value.recordKind !== "server_course_unlock_receipt" ||
    typeof value.unlockId !== "string" || !isWalletIdentifier(value.unlockId) ||
    typeof value.unlockFingerprint !== "string" || !HASH.test(value.unlockFingerprint) ||
    typeof value.recordFingerprint !== "string" || !HASH.test(value.recordFingerprint)) {
    return fail("server_course_unlock_receipt_indeterminate");
  }
  let request: AuthorizedCourseUnlockRequestV1;
  try { request = createAuthorizedCourseUnlockRequest(value.authorizedRequest); }
  catch { return fail("server_course_unlock_receipt_indeterminate"); }
  let rebuilt: ServerCourseUnlockReceiptMaterializationV1;
  try {
    rebuilt = materializeServerCourseUnlockReceiptCandidate({
      intent: {
        schemaVersion: "learning-v2-server-course-unlock-intent.v1",
        accountScopeHash: request.accountScopeHash,
        accountGeneration: request.accountGeneration,
        courseId: request.courseId,
        studyTarget: request.studyTarget,
        requiredSessionOrdinal: request.requiredSessionOrdinal,
        walletRevisionBefore: request.walletRevisionBefore,
        walletStateBeforeFingerprint: request.walletStateBeforeFingerprint,
        courseRevisionBefore: request.courseRevisionBefore,
        courseStateBeforeFingerprint: request.courseStateBeforeFingerprint,
      },
      targetSessionRef: request.targetSessionRef,
    });
  } catch { return fail("server_course_unlock_receipt_indeterminate"); }
  if (!same(rebuilt.receipt, value) || rebuilt.encoded !== raw)
    return fail("server_course_unlock_receipt_indeterminate");
  return rebuilt;
};

export const materializeServerCourseUnlockRequest = (
  materialization: ServerCourseUnlockReceiptMaterializationV1,
): ServerCourseUnlockRequestV1 => deepFreeze({
  schemaVersion: "learning-v2-server-course-unlock-request.v1",
  operationId: materialization.receipt.authorizedRequest.operationId,
  courseId: materialization.receipt.authorizedRequest.courseId,
  studyTarget: materialization.receipt.authorizedRequest.studyTarget,
  unlockId: materialization.receipt.unlockId,
  unlockFingerprint: materialization.receipt.unlockFingerprint,
});

export const parseServerCourseUnlockRequest = (
  input: unknown,
): ServerCourseUnlockRequestV1 => {
  const value = detachRecord(input, REQUEST_KEYS, "server_course_unlock_request_invalid");
  if (value.schemaVersion !== "learning-v2-server-course-unlock-request.v1" ||
    typeof value.operationId !== "string" || !isWalletIdentifier(value.operationId) ||
    typeof value.courseId !== "string" || !isWalletIdentifier(value.courseId) ||
    typeof value.studyTarget !== "string" || !isWalletIdentifier(value.studyTarget) ||
    typeof value.unlockId !== "string" || !isWalletIdentifier(value.unlockId) ||
    typeof value.unlockFingerprint !== "string" || !HASH.test(value.unlockFingerprint)) {
    return fail("server_course_unlock_request_invalid");
  }
  return deepFreeze({
    schemaVersion: value.schemaVersion,
    operationId: value.operationId,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    unlockId: value.unlockId,
    unlockFingerprint: value.unlockFingerprint,
  });
};

/**
 * Reads the exact protected server bytes and binds them to the repository's
 * current wallet/course projections. Client JSON never becomes authority by
 * carrying the structural `trusted_server_boundary` label itself.
 */
export const createServerCourseUnlockReceiptAuthority = (
  input: unknown,
): ((request: OwnerRepositoryCourseUnlockAuthorityInput) => Promise<AuthorizedCourseUnlockRequestV1>) => {
  const options = readRecord(
    input,
    ["resolveCourseUnlockReceipt"],
    "server_course_unlock_authority_invalid",
  );
  if (typeof options.resolveCourseUnlockReceipt !== "function")
    return fail("server_course_unlock_authority_invalid");
  const resolve = options.resolveCourseUnlockReceipt as
    ServerCourseUnlockReceiptResolver["resolveCourseUnlockReceipt"];
  return async (request) => {
    const candidate = parseServerCourseUnlockRequest(request.candidate);
    let raw: unknown;
    try {
      raw = await resolve({
        accountScopeHash: request.scope.accountScopeHash,
        operationId: candidate.operationId,
        courseId: candidate.courseId,
        studyTarget: candidate.studyTarget,
        unlockId: candidate.unlockId,
        unlockFingerprint: candidate.unlockFingerprint,
      });
    } catch { return fail("server_course_unlock_receipt_unavailable"); }
    const materialized = parseServerCourseUnlockReceiptRaw(raw);
    const receipt = materialized.receipt;
    if (receipt.unlockId !== candidate.unlockId ||
      receipt.unlockFingerprint !== candidate.unlockFingerprint ||
      receipt.authorizedRequest.operationId !== candidate.operationId ||
      receipt.authorizedRequest.courseId !== candidate.courseId ||
      receipt.authorizedRequest.studyTarget !== candidate.studyTarget ||
      receipt.authorizedRequest.accountScopeHash !== request.scope.accountScopeHash) {
      return fail("server_course_unlock_receipt_conflict");
    }
    let wallet: WalletStateV1;
    let course: CourseUnlockStateV1;
    try {
      wallet = parseWalletState(request.walletState);
      course = parseCourseUnlockState(request.courseUnlockState);
    } catch { return fail("server_course_unlock_projection_indeterminate"); }
    const authorized = receipt.authorizedRequest;
    if (authorized.accountGeneration !== request.scope.generation ||
      authorized.accountScopeHash !== wallet.accountScopeHash ||
      authorized.accountScopeHash !== course.accountScopeHash ||
      authorized.courseId !== course.courseId ||
      authorized.studyTarget !== course.studyTarget) {
      return fail("server_course_unlock_receipt_conflict");
    }
    if (request.canonicalAppliedReceipt !== null) {
      let canonical: CourseUnlockAppliedReceiptV1;
      try { canonical = parseCourseUnlockAppliedReceipt(request.canonicalAppliedReceipt); }
      catch { return fail("server_course_unlock_projection_indeterminate"); }
      if (canonical.authorizedRequest.operationFingerprint !==
          authorized.operationFingerprint ||
        canonical.authorizedRequest.semanticFingerprint !==
          authorized.semanticFingerprint ||
        canonical.appliedReceiptFingerprint !==
          request.canonicalAppliedReceipt.appliedReceiptFingerprint) {
        return fail("server_course_unlock_receipt_conflict");
      }
      return authorized;
    }
    if (authorized.walletRevisionBefore !== wallet.revision ||
      authorized.walletStateBeforeFingerprint !== wallet.stateFingerprint ||
      authorized.courseRevisionBefore !== course.revision ||
      authorized.courseStateBeforeFingerprint !== course.stateFingerprint) {
      return fail("server_course_unlock_request_out_of_order");
    }
    return authorized;
  };
};
