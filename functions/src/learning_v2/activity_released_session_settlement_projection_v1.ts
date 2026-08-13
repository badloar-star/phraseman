import { projectRequiredTaskStars } from "../../../modules/learning-v2/contracts/course_economy";
import type { V2ActivityFamily } from "../../../modules/learning-v2/contracts/activity";
import {
  parseReconciledRequiredSessionCompletionCandidate,
  type ReconciledRequiredSessionCompletionCandidateV2,
  type ReconciledRequiredSessionTaskClaimV1,
} from "./required_session_completion_projection";
import type { LearningV2ActivityReleasedSessionSubmissionV2 } from "../../../modules/learning-v2/progress/activity_released_session_submission_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { LearningV2ActivityReleasedSessionEvaluationV1 } from "./activity_released_session_evaluation_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_SETTLEMENT_PROJECTION_SCHEMA_V1 =
  "learning-v2-activity-released-settlement-projection.v1" as const;

export interface LearningV2ActivityReleasedSettlementProjectionV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SETTLEMENT_PROJECTION_SCHEMA_V1;
  readonly evaluationFingerprint: string;
  readonly submissionFingerprint: string;
  readonly courseId: string;
  readonly courseReleaseId: string;
  readonly episodeOrdinal: number;
  readonly courseRequiredSessionOrdinal: number;
  readonly taskStars: readonly (0 | 1 | 2 | 3)[];
  readonly totalStars: number;
  readonly learnerAttemptClaim: "server_evaluated_submitted_sequence";
  readonly sequenceCompletenessAuthority: "app_check_client_claim_not_anti_cheat";
  readonly hintUseAuthority: "app_check_client_claim_not_anti_cheat";
  readonly performanceAuthority: "server_policy_over_evaluated_submitted_sequence";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly candidate: ReconciledRequiredSessionCompletionCandidateV2;
  readonly projectionFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

function fail(): never {
  throw new Error("activity_released_session_settlement_projection_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function freeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value as Record<string, unknown>).forEach(freeze);
  return value;
}

export function materializeLearningV2ActivityReleasedSettlementProjectionV1(input: {
  readonly submission: LearningV2ActivityReleasedSessionSubmissionV2;
  readonly evaluation: LearningV2ActivityReleasedSessionEvaluationV1;
  readonly courseReleaseId: string;
  readonly episodeOrdinal: number;
  readonly economicAccountScopeHash: string;
}): LearningV2ActivityReleasedSettlementProjectionV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "courseReleaseId|economicAccountScopeHash|episodeOrdinal|evaluation|submission" ||
    !record(input.submission) ||
    !record(input.evaluation) ||
    typeof input.courseReleaseId !== "string" ||
    !ID_RE.test(input.courseReleaseId) ||
    !Number.isSafeInteger(input.episodeOrdinal) ||
    input.episodeOrdinal < 1 ||
    input.episodeOrdinal > 32 ||
    typeof input.economicAccountScopeHash !== "string" ||
    !HASH_RE.test(input.economicAccountScopeHash) ||
    input.evaluation.submissionFingerprint !==
      input.submission.submissionFingerprint ||
    input.evaluation.completionFingerprint !==
      input.submission.completionFingerprint ||
    input.evaluation.accountScopeHash !== input.submission.accountScopeHash ||
    input.evaluation.accountGeneration !== input.submission.accountGeneration ||
    input.evaluation.releaseId !== input.submission.releaseId ||
    input.evaluation.activeManifestHash !==
      input.submission.activeManifestHash ||
    input.evaluation.episodeId !== input.submission.episodeId ||
    input.evaluation.stageId !== input.submission.stageId ||
    input.evaluation.activityPackageFingerprint !==
      input.submission.activityPackageFingerprint ||
    input.evaluation.packageFingerprint !==
      input.submission.packageFingerprint ||
    input.evaluation.sessionId !== input.submission.sessionId ||
    input.evaluation.sessionOrdinal !== input.submission.sessionOrdinal ||
    input.evaluation.sessionRunId !== input.submission.sessionRunId ||
    input.evaluation.taskEvaluations.length !== 12 ||
    input.submission.completion.taskCompletions.length !== 12
  )
    fail();

  const taskClaims: ReconciledRequiredSessionTaskClaimV1[] = [];
  const taskStars: (0 | 1 | 2 | 3)[] = [];
  for (let index = 0; index < 12; index += 1) {
    const slot = index + 1;
    const evaluated = input.evaluation.taskEvaluations[index];
    const submitted = input.submission.taskAnswers[index];
    const completed = input.submission.completion.taskCompletions[index];
    if (
      !evaluated ||
      !submitted ||
      !completed ||
      evaluated.slot !== slot ||
      submitted.slot !== slot ||
      completed.slot !== slot ||
      evaluated.taskId !== submitted.taskId ||
      evaluated.taskId !== completed.taskId ||
      evaluated.activityId !== submitted.activityId ||
      evaluated.activityId !== completed.activityId ||
      evaluated.family !== submitted.family ||
      evaluated.family !== completed.family ||
      evaluated.disposition !== submitted.disposition ||
      evaluated.disposition !== completed.disposition
    )
      fail();
    const learnerAttempts = evaluated.attempts.filter(
      (attempt) => attempt.resultCode !== "technical_invalid",
    ).length;
    if (
      (evaluated.disposition === "completed" && learnerAttempts < 1) ||
      (evaluated.disposition === "skipped" && learnerAttempts !== 0)
    )
      fail();
    const star = projectRequiredTaskStars({
      disposition: evaluated.disposition,
      learnerAttempts,
      hintUsed: completed.hintUsed,
    });
    const claimBody = Object.freeze({
      schemaVersion:
        "learning-v2-reconciled-required-session-task-claim.v1" as const,
      taskOrdinal: slot,
      taskId: evaluated.taskId,
      activityId: evaluated.activityId,
      family: evaluated.family as V2ActivityFamily,
      disposition: evaluated.disposition,
      claimAuthority: "untrusted_client_summary" as const,
      clientReportedAttempts: learnerAttempts,
      clientReportedHintUsed: completed.hintUsed,
      provisionalStars: star.stars,
      provisionalCountsAsLearnerError: star.countsAsLearnerError,
    });
    taskClaims.push(
      freeze({ ...claimBody, claimFingerprint: hashCanonicalBody(claimBody) }),
    );
    taskStars.push(star.stars);
  }
  const courseId = `learning-v2-${input.submission.completion.studyTarget}`;
  if (!ID_RE.test(courseId)) fail();
  const courseRequiredSessionOrdinal =
    (input.episodeOrdinal - 1) * 12 + input.submission.sessionOrdinal;
  const initialCreditSubjectFingerprint = hashCanonicalBody({
    schemaVersion: "learning-v2-initial-session-credit-subject.v2",
    accountScopeHash: input.economicAccountScopeHash,
    courseId,
    studyTarget: input.submission.completion.studyTarget,
    episodeId: input.submission.episodeId,
    episodeOrdinal: input.episodeOrdinal,
    courseRequiredSessionOrdinal,
  });
  const candidateBody = Object.freeze({
    schemaVersion:
      "learning-v2-reconciled-required-session-completion-candidate.v2" as const,
    candidateAuthority: "untrusted_client_completion" as const,
    catalogReconciliation: "server_publication_match" as const,
    economicAuthority: "none" as const,
    progressAccountScopeHash: input.submission.accountScopeHash,
    economicAccountScopeHash: input.economicAccountScopeHash,
    accountGeneration: input.submission.accountGeneration,
    courseId,
    studyTarget: input.submission.completion.studyTarget,
    courseReleaseId: input.courseReleaseId,
    episodeId: input.submission.episodeId,
    sessionSetId: `activity-${input.submission.activityPackageFingerprint.slice(0, 48)}`,
    sessionSetHash: input.submission.activityPackageFingerprint,
    publicationFingerprint: input.submission.activeManifestHash,
    localSessionId: input.submission.completion.localSessionId,
    canonicalSessionId: input.submission.sessionId,
    requiredSessionOrdinal: input.submission.sessionOrdinal,
    sessionRunId: input.submission.sessionRunId,
    sessionFingerprint: input.submission.packageFingerprint,
    completionFingerprint: input.submission.completionFingerprint,
    taskClaims: Object.freeze(taskClaims),
    provisionalBasePerformanceStars: taskStars.reduce<number>(
      (sum, stars) => sum + stars,
      0,
    ),
    clientReportedLearnerErrorCount: taskClaims.filter(
      (claim) => claim.provisionalCountsAsLearnerError,
    ).length,
    clientReportedHintCount: taskClaims.filter(
      (claim) => claim.clientReportedHintUsed,
    ).length,
    skipCount: taskClaims.filter((claim) => claim.disposition === "skipped")
      .length,
    initialCreditSubjectFingerprint,
    episodeOrdinal: input.episodeOrdinal,
    courseRequiredSessionOrdinal,
  });
  let candidate: ReconciledRequiredSessionCompletionCandidateV2;
  try {
    candidate = parseReconciledRequiredSessionCompletionCandidate(
      freeze({
        ...candidateBody,
        candidateFingerprint: hashCanonicalBody(candidateBody),
      }),
    ) as ReconciledRequiredSessionCompletionCandidateV2;
  } catch {
    fail();
  }
  const totalStars = taskStars.reduce<number>((sum, stars) => sum + stars, 0);
  const body = freeze({
    schemaVersion:
      LEARNING_V2_ACTIVITY_RELEASED_SETTLEMENT_PROJECTION_SCHEMA_V1,
    evaluationFingerprint: input.evaluation.evaluationFingerprint,
    submissionFingerprint: input.submission.submissionFingerprint,
    courseId,
    courseReleaseId: input.courseReleaseId,
    episodeOrdinal: input.episodeOrdinal,
    courseRequiredSessionOrdinal,
    taskStars: Object.freeze(taskStars),
    totalStars,
    learnerAttemptClaim: "server_evaluated_submitted_sequence" as const,
    sequenceCompletenessAuthority:
      "app_check_client_claim_not_anti_cheat" as const,
    hintUseAuthority: "app_check_client_claim_not_anti_cheat" as const,
    performanceAuthority:
      "server_policy_over_evaluated_submitted_sequence" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    candidate,
  });
  const result = freeze({
    ...body,
    projectionFingerprint: hashCanonicalBody(body),
  });
  if (canonicalJsonV1(result).length > 256 * 1024) fail();
  return result;
}
