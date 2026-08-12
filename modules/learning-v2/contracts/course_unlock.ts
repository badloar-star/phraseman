import {
  WALLET_SUBUNITS_PER_STAR,
  detachBoundedWalletJson,
  isWalletIdentifier,
} from "./wallet";
import { hashCanonicalBody } from "../policies/decision_registry";

export const COURSE_UNLOCK_POLICY_V1 = Object.freeze({
  schemaVersion: "learning-v2-required-session-unlock-policy.v1",
  totalRequiredSessions: 384,
  unlockPriceLadderStars: Object.freeze([0, 45, 50, 55, 60, 65] as const),
  freeFirstScope: "stable_course_and_study_target",
  progression: "strictly_contiguous_1_to_384",
  subscriptionWaivesStarPrice: false,
  walletSubunitsPerStar: WALLET_SUBUNITS_PER_STAR,
});
export const COURSE_UNLOCK_POLICY_FINGERPRINT_V1 = hashCanonicalBody(COURSE_UNLOCK_POLICY_V1);

export const requiredCourseUnlockPriceStars = (
  previouslyUnlockedRequiredSessions: unknown,
): 0 | 45 | 50 | 55 | 60 | 65 => {
  if (!Number.isSafeInteger(previouslyUnlockedRequiredSessions) ||
    Object.is(previouslyUnlockedRequiredSessions, -0) ||
    Number(previouslyUnlockedRequiredSessions) < 0 ||
    Number(previouslyUnlockedRequiredSessions) >= COURSE_UNLOCK_POLICY_V1.totalRequiredSessions) {
    throw new Error("course_unlock_policy_progress_invalid");
  }
  return COURSE_UNLOCK_POLICY_V1.unlockPriceLadderStars[
    Math.min(Number(previouslyUnlockedRequiredSessions), COURSE_UNLOCK_POLICY_V1.unlockPriceLadderStars.length - 1)
  ];
};

export interface CourseUnlockTargetSessionRefV1 {
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly catalogFingerprint: string;
  readonly sessionId: string;
}

export interface AuthorizedCourseUnlockRequestV1 {
  readonly schemaVersion: "learning-v2-course-unlock-authorized-request.v1";
  /** Server materialization boundary label; never authentication by itself. */
  readonly authority: "trusted_server_boundary";
  readonly operationId: string;
  readonly semanticSubjectFingerprint: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly requiredSessionOrdinal: number;
  readonly walletRevisionBefore: number;
  readonly walletStateBeforeFingerprint: string;
  readonly courseRevisionBefore: number;
  readonly courseStateBeforeFingerprint: string;
  readonly chargeSubunits: number;
  readonly basis: "free_first_session" | "stars";
  readonly policyFingerprint: string;
  readonly targetSessionRef: CourseUnlockTargetSessionRefV1;
  readonly semanticFingerprint: string;
  readonly operationFingerprint: string;
}

const HASH = /^[a-f0-9]{64}$/;
const BODY_KEYS = [
  "schemaVersion", "authority", "operationId", "semanticSubjectFingerprint",
  "accountScopeHash", "accountGeneration", "courseId", "studyTarget",
  "requiredSessionOrdinal", "walletRevisionBefore", "walletStateBeforeFingerprint",
  "courseRevisionBefore", "courseStateBeforeFingerprint", "chargeSubunits",
  "basis", "policyFingerprint", "targetSessionRef",
] as const;
const FULL_KEYS = [...BODY_KEYS, "semanticFingerprint", "operationFingerprint"] as const;
const TARGET_KEYS = [
  "courseReleaseId", "sessionSetId", "sessionSetHash", "catalogFingerprint", "sessionId",
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

export const deriveCourseUnlockIdentityFingerprint = (input: {
  readonly accountScopeHash: string;
  readonly courseId: string;
  readonly studyTarget: string;
}): string => hashCanonicalBody({
  schemaVersion: "learning-v2-course-unlock-identity.v1",
  accountScopeHash: input.accountScopeHash,
  courseId: input.courseId,
  studyTarget: input.studyTarget,
  entitlementKind: "required_session",
});

export const deriveCourseUnlockSemanticSubjectFingerprint = (input: {
  readonly accountScopeHash: string;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly requiredSessionOrdinal: number;
}): string => hashCanonicalBody({
  schemaVersion: "learning-v2-course-unlock-semantic-subject.v1",
  accountScopeHash: input.accountScopeHash,
  courseId: input.courseId,
  studyTarget: input.studyTarget,
  requiredSessionOrdinal: input.requiredSessionOrdinal,
  entitlementKind: "required_session",
});

const parseTargetSessionRef = (input: unknown): CourseUnlockTargetSessionRefV1 => {
  if (!isRecord(input) || !exactKeys(input, TARGET_KEYS) ||
    !isWalletIdentifier(input.courseReleaseId) || !isWalletIdentifier(input.sessionSetId) ||
    !validHash(input.sessionSetHash) || !validHash(input.catalogFingerprint) ||
    !isWalletIdentifier(input.sessionId)) {
    throw new Error("course_unlock_request_invalid");
  }
  return input as unknown as CourseUnlockTargetSessionRefV1;
};

export const createAuthorizedCourseUnlockRequest = (input: unknown): AuthorizedCourseUnlockRequestV1 => {
  const detached = detachBoundedWalletJson(input, "course_unlock_request_invalid");
  if (!isRecord(detached)) throw new Error("course_unlock_request_invalid");
  const materialized = Object.prototype.hasOwnProperty.call(detached, "operationFingerprint");
  if (!(materialized ? exactKeys(detached, FULL_KEYS) : exactKeys(detached, BODY_KEYS)) ||
    detached.schemaVersion !== "learning-v2-course-unlock-authorized-request.v1" ||
    detached.authority !== "trusted_server_boundary" || !isWalletIdentifier(detached.operationId) ||
    !validHash(detached.semanticSubjectFingerprint) ||
    typeof detached.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(detached.accountScopeHash) ||
    !safe(detached.accountGeneration) || !isWalletIdentifier(detached.courseId) ||
    !isWalletIdentifier(detached.studyTarget) || !safe(detached.requiredSessionOrdinal, 1, 384) ||
    !safe(detached.walletRevisionBefore) || !validHash(detached.walletStateBeforeFingerprint) ||
    !safe(detached.courseRevisionBefore) || !validHash(detached.courseStateBeforeFingerprint) ||
    !safe(detached.chargeSubunits) ||
    (detached.basis !== "free_first_session" && detached.basis !== "stars") ||
    detached.policyFingerprint !== COURSE_UNLOCK_POLICY_FINGERPRINT_V1) {
    throw new Error("course_unlock_request_invalid");
  }
  const targetSessionRef = parseTargetSessionRef(detached.targetSessionRef);
  const requiredSessionOrdinal = Number(detached.requiredSessionOrdinal);
  const expectedCharge = requiredCourseUnlockPriceStars(requiredSessionOrdinal - 1) * WALLET_SUBUNITS_PER_STAR;
  const expectedBasis = requiredSessionOrdinal === 1 ? "free_first_session" : "stars";
  const expectedSubject = deriveCourseUnlockSemanticSubjectFingerprint({
    accountScopeHash: detached.accountScopeHash,
    courseId: detached.courseId,
    studyTarget: detached.studyTarget,
    requiredSessionOrdinal,
  });
  if (detached.chargeSubunits !== expectedCharge || detached.basis !== expectedBasis ||
    detached.semanticSubjectFingerprint !== expectedSubject) {
    throw new Error("course_unlock_request_invalid");
  }
  const body = {
    schemaVersion: "learning-v2-course-unlock-authorized-request.v1" as const,
    authority: "trusted_server_boundary" as const,
    operationId: detached.operationId,
    semanticSubjectFingerprint: detached.semanticSubjectFingerprint,
    accountScopeHash: detached.accountScopeHash,
    accountGeneration: Number(detached.accountGeneration),
    courseId: detached.courseId,
    studyTarget: detached.studyTarget,
    requiredSessionOrdinal,
    walletRevisionBefore: Number(detached.walletRevisionBefore),
    walletStateBeforeFingerprint: detached.walletStateBeforeFingerprint,
    courseRevisionBefore: Number(detached.courseRevisionBefore),
    courseStateBeforeFingerprint: detached.courseStateBeforeFingerprint,
    chargeSubunits: Number(detached.chargeSubunits),
    basis: detached.basis as "free_first_session" | "stars",
    policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
    targetSessionRef,
  };
  const semanticFingerprint = hashCanonicalBody({
    schemaVersion: "learning-v2-course-unlock-semantics.v1",
    semanticSubjectFingerprint: body.semanticSubjectFingerprint,
    accountScopeHash: body.accountScopeHash,
    courseId: body.courseId,
    studyTarget: body.studyTarget,
    requiredSessionOrdinal: body.requiredSessionOrdinal,
    chargeSubunits: body.chargeSubunits,
    basis: body.basis,
    policyFingerprint: body.policyFingerprint,
    targetSessionRef: body.targetSessionRef,
  });
  const result = deepFreeze({
    ...body,
    semanticFingerprint,
    operationFingerprint: hashCanonicalBody(body),
  });
  if (materialized && (detached.semanticFingerprint !== result.semanticFingerprint ||
    detached.operationFingerprint !== result.operationFingerprint)) {
    throw new Error("course_unlock_request_invalid");
  }
  return result;
};
