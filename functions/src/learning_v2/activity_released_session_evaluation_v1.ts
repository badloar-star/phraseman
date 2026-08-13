import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../../../modules/learning-v2/content/generator_course_contract";
import {
  parseLearningV2ActivityReleasedSessionSubmissionV2,
  type LearningV2ActivityReleasedSessionSubmissionV2,
  type LearningV2ActivityReleasedTaskAttemptV2,
} from "../../../modules/learning-v2/progress/activity_released_session_submission_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  createV2LocalEvaluatorCommitmentV1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  type V2LocalEvaluatorFamilyV1,
  type V2LocalEvaluatorInputKindV1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  mountLearningV2ActivityReleasedSessionRuntimeV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";
import {
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
} from "../content_factory/v2_activity_session_projection";

export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_EVALUATION_SCHEMA_V1 =
  "learning-v2-activity-released-session-server-evaluation.v1" as const;

export type LearningV2ActivityReleasedServerAttemptResultV1 = Readonly<{
  attemptOrdinal: number;
  resultCode: "correct" | "wrong" | "technical_invalid";
  resultAuthority: "release_pinned_server_sidecar_commitment_match";
  resultFingerprint: string;
}>;

export type LearningV2ActivityReleasedServerTaskEvaluationV1 = Readonly<{
  slot: number;
  taskId: string;
  activityId: string;
  family: string;
  inputKind: V2LocalEvaluatorInputKindV1;
  disposition: "completed" | "skipped";
  attempts: readonly LearningV2ActivityReleasedServerAttemptResultV1[];
  firstCorrectAttemptOrdinal: number | null;
  verifiedDisposition: "completed_after_server_correct" | "skipped_no_evidence";
  performanceAuthority:
    | "server_evaluated_active_release_answer_sequence"
    | "none_skipped";
  taskEvaluationFingerprint: string;
}>;

export interface LearningV2ActivityReleasedSessionEvaluationV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SESSION_EVALUATION_SCHEMA_V1;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly packageFingerprint: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sessionRunId: string;
  readonly completionFingerprint: string;
  readonly submissionFingerprint: string;
  readonly sourceFingerprint: string;
  readonly sidecarFingerprint: string;
  readonly commitmentAggregate: string;
  readonly taskEvaluations: readonly LearningV2ActivityReleasedServerTaskEvaluationV1[];
  readonly verifiedCompletedCount: number;
  readonly skipCount: number;
  readonly technicalInvalidAttemptCount: number;
  readonly answerEvaluation: "exact_release_pinned_server_sidecar_commitment_replay";
  readonly rawAudioEvaluation: "absent_not_evaluated";
  readonly pronunciationAuthority: "none_transcript_content_only";
  readonly performanceAuthority: "server_answer_sequence_only";
  readonly walletAuthority: "none_settlement_required";
  readonly masteryAuthority: "none_settlement_required";
  readonly evidenceAuthority: "none_settlement_required";
  readonly completionAuthority: "none_settlement_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly evaluationFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const TASK_KEYS = Object.freeze([
  "capsuleId",
  "taskId",
  "activityId",
  "family",
  "inputKind",
  "normalizationRef",
  "normalizationLocale",
  "normalizationProfileHash",
  "salt",
  "correctResponse",
  "acceptedResponses",
  "acceptedCommitments",
] as const);
const SIDECAR_KEYS = Object.freeze([
  "schemaVersion",
  "sourceFingerprint",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "tasks",
  "commitmentAggregate",
  "serverOnly",
  "evaluationAuthority",
  "rewardAuthority",
  "releaseAuthority",
] as const);

type SidecarTask = Readonly<{
  capsuleId: string;
  taskId: string;
  activityId: string;
  family: V2LocalEvaluatorFamilyV1;
  inputKind: V2LocalEvaluatorInputKindV1;
  normalizationLocale: string;
  normalizationProfileHash: string;
  salt: string;
  acceptedCommitments: readonly string[];
}>;

function fail(): never {
  throw new Error("learning_v2_activity_released_session_evaluation_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => typeof key !== "string" || !expected.includes(key))
  )
    fail();
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function parseSidecar(raw: unknown) {
  if (
    typeof raw !== "string" ||
    raw.length > V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES ||
    utf8ByteLengthV1(raw) > V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, SIDECAR_KEYS);
  if (
    value.schemaVersion !== V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 ||
    !Array.isArray(value.tasks) ||
    value.tasks.length !== 12 ||
    value.serverOnly !== true ||
    value.evaluationAuthority !== "none" ||
    value.rewardAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const tasks = Object.freeze(
    value.tasks.map((candidate) => {
      if (!record(candidate)) fail();
      exactKeys(candidate, TASK_KEYS);
      if (
        candidate.normalizationRef !== V2_LOCAL_EVALUATOR_NORMALIZATION_V1 ||
        candidate.normalizationProfileHash !==
          V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 ||
        typeof candidate.capsuleId !== "string" ||
        typeof candidate.taskId !== "string" ||
        typeof candidate.activityId !== "string" ||
        typeof candidate.family !== "string" ||
        typeof candidate.inputKind !== "string" ||
        typeof candidate.normalizationLocale !== "string" ||
        typeof candidate.salt !== "string" ||
        !Array.isArray(candidate.acceptedResponses) ||
        !Array.isArray(candidate.acceptedCommitments) ||
        candidate.acceptedCommitments.length < 1 ||
        candidate.acceptedCommitments.length > 32 ||
        candidate.acceptedCommitments.some(
          (commitment) =>
            typeof commitment !== "string" || !HASH_RE.test(commitment),
        )
      )
        fail();
      return Object.freeze({
        capsuleId: candidate.capsuleId,
        taskId: candidate.taskId,
        activityId: candidate.activityId,
        family: candidate.family as V2LocalEvaluatorFamilyV1,
        inputKind: candidate.inputKind as V2LocalEvaluatorInputKindV1,
        normalizationLocale: candidate.normalizationLocale,
        normalizationProfileHash: candidate.normalizationProfileHash,
        salt: candidate.salt,
        acceptedCommitments: Object.freeze([
          ...(candidate.acceptedCommitments as string[]),
        ]),
      });
    }),
  );
  return Object.freeze({
    sourceFingerprint: hash(value.sourceFingerprint),
    episodeId: value.episodeId,
    sessionId: value.sessionId,
    sessionOrdinal: value.sessionOrdinal,
    commitmentAggregate: hash(value.commitmentAggregate),
    sidecarFingerprint: hashCanonicalBody(value),
    tasks,
  });
}

function evaluateAttempt(
  sidecar: SidecarTask,
  attempt: LearningV2ActivityReleasedTaskAttemptV2,
): LearningV2ActivityReleasedServerAttemptResultV1 {
  let resultCode: "correct" | "wrong" | "technical_invalid" =
    "technical_invalid";
  let responseCommitment: string | null = null;
  if (attempt.kind === sidecar.inputKind && typeof attempt.value === "string") {
    try {
      responseCommitment = createV2LocalEvaluatorCommitmentV1({
        capsuleId: sidecar.capsuleId,
        taskId: sidecar.taskId,
        activityId: sidecar.activityId,
        family: sidecar.family,
        inputKind: sidecar.inputKind,
        normalizationLocale: sidecar.normalizationLocale,
        normalizationProfileHash: sidecar.normalizationProfileHash,
        salt: sidecar.salt,
        response: attempt.value,
      });
      resultCode = sidecar.acceptedCommitments.includes(responseCommitment)
        ? "correct"
        : "wrong";
    } catch {
      resultCode = "technical_invalid";
    }
  }
  const body = Object.freeze({
    attemptOrdinal: attempt.attemptOrdinal,
    resultCode,
    resultAuthority: "release_pinned_server_sidecar_commitment_match" as const,
  });
  return Object.freeze({
    ...body,
    resultFingerprint: hashCanonicalBody({ ...body, responseCommitment }),
  });
}

export function materializeLearningV2ActivityReleasedSessionEvaluationV1(input: {
  readonly submission: unknown;
  readonly canonicalPackageRaw: string;
  readonly canonicalSidecarRaw: string;
  readonly expectedAccountScopeHash: string;
  readonly expectedAccountGeneration: number;
}): LearningV2ActivityReleasedSessionEvaluationV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "canonicalPackageRaw|canonicalSidecarRaw|expectedAccountGeneration|expectedAccountScopeHash|submission" ||
    typeof input.canonicalPackageRaw !== "string" ||
    typeof input.canonicalSidecarRaw !== "string" ||
    typeof input.expectedAccountScopeHash !== "string" ||
    !HASH_RE.test(input.expectedAccountScopeHash) ||
    !Number.isSafeInteger(input.expectedAccountGeneration) ||
    input.expectedAccountGeneration < 1
  )
    fail();
  let submission: LearningV2ActivityReleasedSessionSubmissionV2;
  let runtime;
  let packageSummary;
  let runtimeSummary;
  let sidecar;
  try {
    submission = parseLearningV2ActivityReleasedSessionSubmissionV2(
      input.submission,
    );
    if (
      !LEARNING_V2_INTERFACE_LOCALES.includes(
        submission.completion.learnerSourceLocale as LearningV2InterfaceLocale,
      )
    )
      fail();
    const packageHandle = parseLearningV2ActivityReleasedSessionPackageV1(
      input.canonicalPackageRaw,
    );
    packageSummary =
      getLearningV2ActivityReleasedSessionPackageSummaryV1(packageHandle);
    runtime = mountLearningV2ActivityReleasedSessionRuntimeV1({
      packageHandle,
      interfaceLocale: submission.completion
        .learnerSourceLocale as LearningV2InterfaceLocale,
    });
    runtimeSummary =
      getLearningV2ActivityReleasedSessionRuntimeSummaryV1(runtime);
    sidecar = parseSidecar(input.canonicalSidecarRaw);
  } catch {
    fail();
  }
  if (
    submission.accountScopeHash !== input.expectedAccountScopeHash ||
    submission.accountGeneration !== input.expectedAccountGeneration ||
    submission.releaseId !== runtimeSummary.releaseId ||
    submission.activeManifestHash !== runtimeSummary.activeManifestHash ||
    submission.episodeId !== packageSummary.episodeId ||
    submission.episodeId !== runtimeSummary.episodeId ||
    submission.stageId !== runtimeSummary.stageId ||
    submission.activityPackageFingerprint !==
      packageSummary.activityPackageFingerprint ||
    submission.activityPackageFingerprint !==
      runtimeSummary.activityPackageFingerprint ||
    submission.packageFingerprint !== packageSummary.packageFingerprint ||
    submission.packageFingerprint !== runtimeSummary.packageFingerprint ||
    submission.sessionId !== packageSummary.sessionId ||
    submission.sessionId !== runtimeSummary.sessionId ||
    submission.sessionOrdinal !== packageSummary.sessionOrdinal ||
    submission.sessionOrdinal !== runtimeSummary.sessionOrdinal ||
    packageSummary.sourceFingerprint !== sidecar.sourceFingerprint ||
    submission.episodeId !== sidecar.episodeId ||
    submission.sessionId !== sidecar.sessionId ||
    submission.sessionOrdinal !== sidecar.sessionOrdinal
  )
    fail();
  const taskEvaluations = Object.freeze(
    Array.from({ length: 12 }, (_, index) => {
      const slot = index + 1;
      const answer = submission.taskAnswers[index];
      const released = getLearningV2ActivityReleasedSessionTaskV1(
        runtime,
        slot,
      );
      const evaluator = sidecar.tasks[index];
      if (
        !answer ||
        !evaluator ||
        answer.slot !== slot ||
        answer.taskId !== released.taskId ||
        answer.activityId !== released.activityId ||
        answer.family !== released.family ||
        answer.inputKind !== released.evaluatorInputKind ||
        evaluator.taskId !== released.taskId ||
        evaluator.activityId !== released.activityId ||
        evaluator.family !== released.family ||
        evaluator.inputKind !== released.evaluatorInputKind
      )
        fail();
      const attempts = Object.freeze(
        answer.attempts.map((attempt) => evaluateAttempt(evaluator, attempt)),
      );
      const correctOrdinals = attempts
        .filter((attempt) => attempt.resultCode === "correct")
        .map((attempt) => attempt.attemptOrdinal);
      const firstCorrectAttemptOrdinal = correctOrdinals[0] ?? null;
      if (
        answer.disposition === "completed" &&
        (correctOrdinals.length !== 1 ||
          firstCorrectAttemptOrdinal !== attempts.length)
      )
        fail();
      if (answer.disposition === "skipped" && correctOrdinals.length !== 0)
        fail();
      const body = Object.freeze({
        slot,
        taskId: answer.taskId,
        activityId: answer.activityId,
        family: answer.family,
        inputKind: answer.inputKind,
        disposition: answer.disposition,
        attempts,
        firstCorrectAttemptOrdinal,
        verifiedDisposition:
          answer.disposition === "completed"
            ? ("completed_after_server_correct" as const)
            : ("skipped_no_evidence" as const),
        performanceAuthority:
          answer.disposition === "completed"
            ? ("server_evaluated_active_release_answer_sequence" as const)
            : ("none_skipped" as const),
      });
      return Object.freeze({
        ...body,
        taskEvaluationFingerprint: hashCanonicalBody(body),
      });
    }),
  );
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_EVALUATION_SCHEMA_V1,
    accountScopeHash: submission.accountScopeHash,
    accountGeneration: submission.accountGeneration,
    releaseId: submission.releaseId,
    activeManifestHash: submission.activeManifestHash,
    episodeId: submission.episodeId,
    stageId: submission.stageId,
    activityPackageFingerprint: submission.activityPackageFingerprint,
    packageFingerprint: submission.packageFingerprint,
    sessionId: submission.sessionId,
    sessionOrdinal: submission.sessionOrdinal,
    sessionRunId: submission.sessionRunId,
    completionFingerprint: submission.completionFingerprint,
    submissionFingerprint: submission.submissionFingerprint,
    sourceFingerprint: sidecar.sourceFingerprint,
    sidecarFingerprint: sidecar.sidecarFingerprint,
    commitmentAggregate: sidecar.commitmentAggregate,
    taskEvaluations,
    verifiedCompletedCount: taskEvaluations.filter(
      (task) => task.verifiedDisposition === "completed_after_server_correct",
    ).length,
    skipCount: taskEvaluations.filter(
      (task) => task.verifiedDisposition === "skipped_no_evidence",
    ).length,
    technicalInvalidAttemptCount: taskEvaluations.reduce(
      (sum, task) =>
        sum +
        task.attempts.filter(
          (attempt) => attempt.resultCode === "technical_invalid",
        ).length,
      0,
    ),
    answerEvaluation:
      "exact_release_pinned_server_sidecar_commitment_replay" as const,
    rawAudioEvaluation: "absent_not_evaluated" as const,
    pronunciationAuthority: "none_transcript_content_only" as const,
    performanceAuthority: "server_answer_sequence_only" as const,
    walletAuthority: "none_settlement_required" as const,
    masteryAuthority: "none_settlement_required" as const,
    evidenceAuthority: "none_settlement_required" as const,
    completionAuthority: "none_settlement_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    evaluationFingerprint: hashCanonicalBody(body),
  });
}
