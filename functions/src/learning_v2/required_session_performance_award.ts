import {
  requiredSessionUnlockPrice,
  repeatRewardRateBasisPoints,
  type LearningV2RepeatQualityBand,
} from "../../../modules/learning-v2/contracts/course_economy";
import {
  WALLET_SUBUNITS_PER_STAR,
  detachBoundedWalletJson,
  projectRepeatRewardSubunits,
} from "../../../modules/learning-v2/contracts/wallet";
import {
  materializeServerWalletRewardReceiptCandidate,
  type ServerWalletRewardReceiptMaterializationV1,
} from "../../../modules/learning-v2/progress/server_wallet_reward_receipt";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  parseReconciledRequiredSessionCompletionCandidate,
  type ReconciledRequiredSessionCompletionCandidate,
  type ReconciledRequiredSessionCompletionCandidateV2,
} from "./required_session_completion_projection";

const TOTAL_REQUIRED_SESSIONS = 32 * 12;
const HASH = /^[a-f0-9]{64}$/;

export interface RequiredSessionPerformanceAwardStateV2 {
  readonly schemaVersion: "learning-v2-required-session-performance-award-state.v2";
  readonly accountScopeHash: string;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseRequiredSessionOrdinal: number;
  readonly initialCreditSubjectFingerprint: string;
  readonly revision: number;
  readonly bestTaskStars: readonly number[];
  readonly initialCreditedSubunits: number;
  readonly repeatCompletions: number;
  readonly repeatCreditedSubunits: number;
  readonly stateFingerprint: string;
}

export interface RequiredSessionCourseAwardStateV1 {
  readonly schemaVersion: "learning-v2-required-session-course-award-state.v1";
  readonly accountScopeHash: string;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly initialSettledSessionCount: number;
  readonly revision: number;
  readonly stateFingerprint: string;
}

export interface RequiredSessionPerformanceAwardProjectionV2 {
  readonly schemaVersion: "learning-v2-required-session-performance-award-projection.v2";
  /** Bounded access currency only; never mastery, voice or evidence authority. */
  readonly awardAuthority: "server_policy_over_catalog_bound_app_summary";
  readonly candidateFingerprint: string;
  readonly completionKind: "legacy_deferred" | "initial" | "repeat";
  readonly repeatQualityBand: LearningV2RepeatQualityBand | null;
  readonly referenceNextPriceStars: 45 | 50 | 55 | 60 | 65 | null;
  readonly previousState: RequiredSessionPerformanceAwardStateV2 | null;
  readonly nextState: RequiredSessionPerformanceAwardStateV2 | null;
  readonly previousCourseState: RequiredSessionCourseAwardStateV1 | null;
  readonly nextCourseState: RequiredSessionCourseAwardStateV1 | null;
  readonly awardedSubunits: number;
  readonly reward: ServerWalletRewardReceiptMaterializationV1 | null;
}

const STATE_BODY_KEYS = [
  "schemaVersion", "accountScopeHash", "courseId", "studyTarget",
  "courseRequiredSessionOrdinal", "initialCreditSubjectFingerprint", "revision",
  "bestTaskStars", "initialCreditedSubunits", "repeatCompletions",
  "repeatCreditedSubunits",
] as const;
const STATE_KEYS = [...STATE_BODY_KEYS, "stateFingerprint"] as const;
const COURSE_BODY_KEYS = [
  "schemaVersion", "accountScopeHash", "courseId", "studyTarget",
  "initialSettledSessionCount", "revision",
] as const;
const COURSE_KEYS = [...COURSE_BODY_KEYS, "stateFingerprint"] as const;
const INPUT_KEYS = ["candidate", "previousState", "previousCourseState"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const safe = (value: unknown, minimum: number, maximum: number) =>
  Number.isSafeInteger(value) && !Object.is(value, -0) &&
  Number(value) >= minimum && Number(value) <= maximum;
const freeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  return value;
};
const detach = (input: unknown, code: string, keys: readonly string[]): Record<string, unknown> => {
  let value: unknown;
  try { value = detachBoundedWalletJson(input, code); }
  catch { throw new Error(code); }
  if (!isRecord(value) || !exactKeys(value, keys)) throw new Error(code);
  return value;
};

const materializeState = (input: Omit<RequiredSessionPerformanceAwardStateV2,
  "schemaVersion" | "stateFingerprint">): RequiredSessionPerformanceAwardStateV2 => {
  const body = {
    schemaVersion: "learning-v2-required-session-performance-award-state.v2" as const,
    ...input,
    bestTaskStars: Object.freeze([...input.bestTaskStars]),
  };
  return freeze({ ...body, stateFingerprint: hashCanonicalBody(body) });
};

export const parseRequiredSessionPerformanceAwardState = (
  input: unknown,
): RequiredSessionPerformanceAwardStateV2 => {
  const value = detach(input, "required_session_performance_award_state_invalid", STATE_KEYS);
  if (value.schemaVersion !== "learning-v2-required-session-performance-award-state.v2" ||
    typeof value.accountScopeHash !== "string" || !HASH.test(value.accountScopeHash) ||
    typeof value.courseId !== "string" || typeof value.studyTarget !== "string" ||
    !safe(value.courseRequiredSessionOrdinal, 1, TOTAL_REQUIRED_SESSIONS) ||
    typeof value.initialCreditSubjectFingerprint !== "string" ||
      !HASH.test(value.initialCreditSubjectFingerprint) ||
    !safe(value.revision, 1, Number.MAX_SAFE_INTEGER) ||
    !Array.isArray(value.bestTaskStars) || value.bestTaskStars.length !== 12 ||
    value.bestTaskStars.some((stars) => !safe(stars, 0, 3)) ||
    !safe(value.initialCreditedSubunits, 0, 36 * WALLET_SUBUNITS_PER_STAR) ||
    !safe(value.repeatCompletions, 0, Number.MAX_SAFE_INTEGER) ||
    !safe(value.repeatCreditedSubunits, 0, Number.MAX_SAFE_INTEGER) ||
    Number(value.revision) !== Number(value.repeatCompletions) + 1 ||
    typeof value.stateFingerprint !== "string" || !HASH.test(value.stateFingerprint)) {
    throw new Error("required_session_performance_award_state_invalid");
  }
  const rebuilt = materializeState({
    accountScopeHash: value.accountScopeHash,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseRequiredSessionOrdinal: Number(value.courseRequiredSessionOrdinal),
    initialCreditSubjectFingerprint: value.initialCreditSubjectFingerprint,
    revision: Number(value.revision),
    bestTaskStars: Object.freeze(value.bestTaskStars.map(Number)),
    initialCreditedSubunits: Number(value.initialCreditedSubunits),
    repeatCompletions: Number(value.repeatCompletions),
    repeatCreditedSubunits: Number(value.repeatCreditedSubunits),
  });
  if (rebuilt.stateFingerprint !== value.stateFingerprint) {
    throw new Error("required_session_performance_award_state_invalid");
  }
  return rebuilt;
};

const materializeCourseState = (input: Omit<RequiredSessionCourseAwardStateV1,
  "schemaVersion" | "stateFingerprint">): RequiredSessionCourseAwardStateV1 => {
  const body = {
    schemaVersion: "learning-v2-required-session-course-award-state.v1" as const,
    ...input,
  };
  return freeze({ ...body, stateFingerprint: hashCanonicalBody(body) });
};

export const parseRequiredSessionCourseAwardState = (
  input: unknown,
): RequiredSessionCourseAwardStateV1 => {
  const value = detach(input, "required_session_course_award_state_invalid", COURSE_KEYS);
  if (value.schemaVersion !== "learning-v2-required-session-course-award-state.v1" ||
    typeof value.accountScopeHash !== "string" || !HASH.test(value.accountScopeHash) ||
    typeof value.courseId !== "string" || typeof value.studyTarget !== "string" ||
    !safe(value.initialSettledSessionCount, 0, TOTAL_REQUIRED_SESSIONS) ||
    !safe(value.revision, 0, TOTAL_REQUIRED_SESSIONS) ||
    value.revision !== value.initialSettledSessionCount ||
    typeof value.stateFingerprint !== "string" || !HASH.test(value.stateFingerprint)) {
    throw new Error("required_session_course_award_state_invalid");
  }
  const rebuilt = materializeCourseState({
    accountScopeHash: value.accountScopeHash,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    initialSettledSessionCount: Number(value.initialSettledSessionCount),
    revision: Number(value.revision),
  });
  if (rebuilt.stateFingerprint !== value.stateFingerprint) {
    throw new Error("required_session_course_award_state_invalid");
  }
  return rebuilt;
};

const emptyCourseStateFor = (
  candidate: ReconciledRequiredSessionCompletionCandidateV2,
): RequiredSessionCourseAwardStateV1 => materializeCourseState({
  accountScopeHash: candidate.economicAccountScopeHash,
  courseId: candidate.courseId,
  studyTarget: candidate.studyTarget,
  initialSettledSessionCount: 0,
  revision: 0,
});

const assertBindings = (
  candidate: ReconciledRequiredSessionCompletionCandidateV2,
  state: RequiredSessionPerformanceAwardStateV2 | null,
  courseState: RequiredSessionCourseAwardStateV1,
) => {
  if (courseState.accountScopeHash !== candidate.economicAccountScopeHash ||
    courseState.courseId !== candidate.courseId ||
    courseState.studyTarget !== candidate.studyTarget ||
    (state !== null && (state.accountScopeHash !== candidate.economicAccountScopeHash ||
      state.courseId !== candidate.courseId || state.studyTarget !== candidate.studyTarget ||
      state.courseRequiredSessionOrdinal !== candidate.courseRequiredSessionOrdinal ||
      state.initialCreditSubjectFingerprint !== candidate.initialCreditSubjectFingerprint))) {
    throw new Error("required_session_performance_award_state_conflict");
  }
};

const qualityFor = (
  candidate: ReconciledRequiredSessionCompletionCandidateV2,
): LearningV2RepeatQualityBand => {
  if (candidate.skipCount > 0) return "skipped";
  if (candidate.provisionalBasePerformanceStars === 36) return "perfect";
  if (candidate.clientReportedLearnerErrorCount > 0) return "with_errors";
  return "good";
};

const checkedAdd = (left: number, right: number, code: string) => {
  const value = left + right;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(code);
  return value;
};

/**
 * First settlement credits the 12 task result once. Every later unique run is
 * a repeat and uses the owner-approved 20/12/5/0 percent of the next-session
 * price. Wallet subunits retain fractional stars exactly (for example 5.4),
 * so no per-run rounding or carry bucket is needed.
 */
export const projectRequiredSessionPerformanceAward = (
  input: unknown,
): RequiredSessionPerformanceAwardProjectionV2 => {
  const value = detach(input, "required_session_performance_award_input_invalid", INPUT_KEYS);
  let candidate: ReconciledRequiredSessionCompletionCandidate;
  try { candidate = parseReconciledRequiredSessionCompletionCandidate(value.candidate); }
  catch { throw new Error("required_session_performance_award_input_invalid"); }

  if (candidate.schemaVersion ===
    "learning-v2-reconciled-required-session-completion-candidate.v1") {
    if (value.previousState !== null || value.previousCourseState !== null) {
      throw new Error("required_session_performance_award_state_conflict");
    }
    return freeze({
      schemaVersion: "learning-v2-required-session-performance-award-projection.v2",
      awardAuthority: "server_policy_over_catalog_bound_app_summary",
      candidateFingerprint: candidate.candidateFingerprint,
      completionKind: "legacy_deferred",
      repeatQualityBand: null,
      referenceNextPriceStars: null,
      previousState: null,
      nextState: null,
      previousCourseState: null,
      nextCourseState: null,
      awardedSubunits: 0,
      reward: null,
    });
  }

  const previousState = value.previousState === null
    ? null
    : parseRequiredSessionPerformanceAwardState(value.previousState);
  const previousCourseState = value.previousCourseState === null
    ? emptyCourseStateFor(candidate)
    : parseRequiredSessionCourseAwardState(value.previousCourseState);
  assertBindings(candidate, previousState, previousCourseState);
  const reportedStars = candidate.taskClaims.map((claim) => claim.provisionalStars);
  const bestTaskStars = previousState === null
    ? reportedStars
    : previousState.bestTaskStars.map((stars, index) =>
        Math.max(stars, reportedStars[index] ?? 0));
  const key = candidate.candidateFingerprint.slice(0, 48);

  if (previousState === null) {
    if (candidate.courseRequiredSessionOrdinal !==
      previousCourseState.initialSettledSessionCount + 1) {
      throw new Error("required_session_initial_sequence_conflict");
    }
    const awardedSubunits = candidate.provisionalBasePerformanceStars * WALLET_SUBUNITS_PER_STAR;
    const nextState = materializeState({
      accountScopeHash: candidate.economicAccountScopeHash,
      courseId: candidate.courseId,
      studyTarget: candidate.studyTarget,
      courseRequiredSessionOrdinal: candidate.courseRequiredSessionOrdinal,
      initialCreditSubjectFingerprint: candidate.initialCreditSubjectFingerprint,
      revision: 1,
      bestTaskStars,
      initialCreditedSubunits: awardedSubunits,
      repeatCompletions: 0,
      repeatCreditedSubunits: 0,
    });
    const nextCourseState = materializeCourseState({
      accountScopeHash: previousCourseState.accountScopeHash,
      courseId: previousCourseState.courseId,
      studyTarget: previousCourseState.studyTarget,
      initialSettledSessionCount: previousCourseState.initialSettledSessionCount + 1,
      revision: previousCourseState.revision + 1,
    });
    const reward = awardedSubunits === 0 ? null
      : materializeServerWalletRewardReceiptCandidate({
          rewardId: `required-session-initial-${key}`,
          operationId: `wallet-required-session-initial-${key}`,
          accountScopeHash: candidate.economicAccountScopeHash,
          accountGeneration: candidate.accountGeneration,
          amountSubunits: awardedSubunits,
          operationReason: "initial_required_session",
          origin: {
            kind: "course",
            courseId: candidate.courseId,
            studyTarget: candidate.studyTarget,
            requiredSessionOrdinal: candidate.courseRequiredSessionOrdinal,
          },
        });
    return freeze({
      schemaVersion: "learning-v2-required-session-performance-award-projection.v2",
      awardAuthority: "server_policy_over_catalog_bound_app_summary",
      candidateFingerprint: candidate.candidateFingerprint,
      completionKind: "initial",
      repeatQualityBand: null,
      referenceNextPriceStars: null,
      previousState,
      nextState,
      previousCourseState,
      nextCourseState,
      awardedSubunits,
      reward,
    });
  }

  if (candidate.courseRequiredSessionOrdinal > previousCourseState.initialSettledSessionCount) {
    throw new Error("required_session_repeat_sequence_conflict");
  }
  const repeatQualityBand = qualityFor(candidate);
  const referenceNextPriceStars = previousCourseState.initialSettledSessionCount >=
    TOTAL_REQUIRED_SESSIONS
    ? 65 as const
    : requiredSessionUnlockPrice(previousCourseState.initialSettledSessionCount);
  if (referenceNextPriceStars === 0) {
    throw new Error("required_session_repeat_sequence_conflict");
  }
  const repeat = projectRepeatRewardSubunits({
    referenceNextPriceStars,
    rateBasisPoints: repeatRewardRateBasisPoints(repeatQualityBand),
    policyFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-required-session-repeat-policy.v1",
      perfect: 2_000,
      good: 1_200,
      withErrors: 500,
      skipped: 0,
      reference: "next_required_session_price",
      arithmetic: "wallet_subunits_exact",
    }),
  });
  const awardedSubunits = repeat.rewardSubunits;
  const nextState = materializeState({
    accountScopeHash: previousState.accountScopeHash,
    courseId: previousState.courseId,
    studyTarget: previousState.studyTarget,
    courseRequiredSessionOrdinal: previousState.courseRequiredSessionOrdinal,
    initialCreditSubjectFingerprint: previousState.initialCreditSubjectFingerprint,
    revision: checkedAdd(previousState.revision, 1,
      "required_session_performance_award_projection_invalid"),
    bestTaskStars,
    initialCreditedSubunits: previousState.initialCreditedSubunits,
    repeatCompletions: checkedAdd(previousState.repeatCompletions, 1,
      "required_session_performance_award_projection_invalid"),
    repeatCreditedSubunits: checkedAdd(previousState.repeatCreditedSubunits,
      awardedSubunits, "required_session_performance_award_projection_invalid"),
  });
  const reward = awardedSubunits === 0 ? null
    : materializeServerWalletRewardReceiptCandidate({
        rewardId: `required-session-repeat-${key}`,
        operationId: `wallet-required-session-repeat-${key}`,
        accountScopeHash: candidate.economicAccountScopeHash,
        accountGeneration: candidate.accountGeneration,
        amountSubunits: awardedSubunits,
        operationReason: "repeat_session",
        origin: {
          kind: "course",
          courseId: candidate.courseId,
          studyTarget: candidate.studyTarget,
          requiredSessionOrdinal: candidate.courseRequiredSessionOrdinal,
        },
      });
  return freeze({
    schemaVersion: "learning-v2-required-session-performance-award-projection.v2",
    awardAuthority: "server_policy_over_catalog_bound_app_summary",
    candidateFingerprint: candidate.candidateFingerprint,
    completionKind: "repeat",
    repeatQualityBand,
    referenceNextPriceStars,
    previousState,
    nextState,
    previousCourseState,
    nextCourseState: previousCourseState,
    awardedSubunits,
    reward,
  });
};
