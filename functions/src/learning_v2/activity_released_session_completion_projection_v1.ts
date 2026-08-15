import {
  parseLearningV2ActivityReleasedSessionCompletionV1,
  type LearningV2ActivityReleasedSessionCompletionV1,
} from "../../../modules/learning-v2/progress/activity_released_session_completion_v1";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../../../modules/learning-v2/content/generator_course_contract";
import {
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  mountLearningV2ActivityReleasedSessionRuntimeV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_RECONCILIATION_SCHEMA_V1 =
  "learning-v2-activity-released-completion-reconciliation.v1" as const;

export type LearningV2ActivityReleasedCompletionReconciledTaskV1 = Readonly<{
  slot: number;
  taskId: string;
  activityId: string;
  family: string;
  purpose: string;
  disposition: "completed" | "skipped";
  clientReportedAttempts: number;
  clientReportedHintUsed: boolean;
  claimAuthority: "client_report_reconciled_to_active_release_coordinates";
  performanceAuthority: "none";
  taskClaimFingerprint: string;
}>;

export interface LearningV2ActivityReleasedCompletionReconciliationV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_RECONCILIATION_SCHEMA_V1;
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
  readonly localSessionId: string;
  readonly sessionRunId: string;
  readonly completionFingerprint: string;
  readonly taskClaims: readonly LearningV2ActivityReleasedCompletionReconciledTaskV1[];
  readonly completedCount: number;
  readonly skipCount: number;
  readonly catalogReconciliation: "exact_active_release_package_and_12_task_match";
  readonly completionClaimAuthority: "untrusted_client_report_only";
  readonly performanceAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly reconciliationFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;

function fail(): never {
  throw new Error(
    "learning_v2_activity_released_completion_reconciliation_invalid",
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactInput(input: unknown): asserts input is {
  readonly completion: unknown;
  readonly canonicalPackageRaw: string;
  readonly expectedAccountScopeHash: string;
  readonly expectedAccountGeneration: number;
} {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "canonicalPackageRaw|completion|expectedAccountGeneration|expectedAccountScopeHash" ||
    typeof input.canonicalPackageRaw !== "string" ||
    typeof input.expectedAccountScopeHash !== "string" ||
    !HASH_RE.test(input.expectedAccountScopeHash) ||
    !Number.isSafeInteger(input.expectedAccountGeneration) ||
    Number(input.expectedAccountGeneration) < 0
  )
    fail();
}

function taskClaim(
  completion: LearningV2ActivityReleasedSessionCompletionV1,
  slot: number,
  runtime: ReturnType<typeof mountLearningV2ActivityReleasedSessionRuntimeV1>,
): LearningV2ActivityReleasedCompletionReconciledTaskV1 {
  const reported = completion.taskCompletions[slot - 1];
  const released = getLearningV2ActivityReleasedSessionTaskV1(runtime, slot);
  if (
    !reported ||
    reported.slot !== slot ||
    reported.taskId !== released.taskId ||
    reported.activityId !== released.activityId ||
    reported.family !== released.family ||
    reported.purpose !== released.purpose
  )
    fail();
  const body = Object.freeze({
    slot,
    taskId: reported.taskId,
    activityId: reported.activityId,
    family: reported.family,
    purpose: reported.purpose,
    disposition: reported.disposition,
    clientReportedAttempts: reported.learnerAttempts,
    clientReportedHintUsed: reported.hintUsed,
    claimAuthority:
      "client_report_reconciled_to_active_release_coordinates" as const,
    performanceAuthority: "none" as const,
  });
  return Object.freeze({
    ...body,
    taskClaimFingerprint: hashCanonicalBody(body),
  });
}

export function materializeLearningV2ActivityReleasedCompletionReconciliationV1(
  input: unknown,
): LearningV2ActivityReleasedCompletionReconciliationV1 {
  exactInput(input);
  let completion: LearningV2ActivityReleasedSessionCompletionV1;
  let packageHandle;
  try {
    completion = parseLearningV2ActivityReleasedSessionCompletionV1(
      input.completion,
    );
    packageHandle = parseLearningV2ActivityReleasedSessionPackageV1(
      input.canonicalPackageRaw,
    );
  } catch {
    fail();
  }
  if (
    completion.accountScopeHash !== input.expectedAccountScopeHash ||
    completion.accountGeneration !== input.expectedAccountGeneration ||
    !LEARNING_V2_INTERFACE_LOCALES.includes(
      completion.learnerSourceLocale as LearningV2InterfaceLocale,
    )
  )
    fail();
  const runtime = mountLearningV2ActivityReleasedSessionRuntimeV1({
    packageHandle,
    interfaceLocale:
      completion.learnerSourceLocale as LearningV2InterfaceLocale,
  });
  const summary = getLearningV2ActivityReleasedSessionRuntimeSummaryV1(runtime);
  if (
    completion.seasonId !== summary.seasonId ||
    completion.studyTarget !== summary.studyTarget ||
    completion.learnerSourceLocale !== summary.learnerSourceLocale ||
    completion.releaseId !== summary.releaseId ||
    completion.activeManifestHash !== summary.activeManifestHash ||
    completion.episodeId !== summary.episodeId ||
    completion.stageId !== summary.stageId ||
    completion.activityPackageFingerprint !==
      summary.activityPackageFingerprint ||
    completion.packageFingerprint !== summary.packageFingerprint ||
    completion.sessionId !== summary.sessionId ||
    completion.sessionOrdinal !== summary.sessionOrdinal
  )
    fail();
  const taskClaims = Object.freeze(
    Array.from({ length: 12 }, (_, index) =>
      taskClaim(completion, index + 1, runtime),
    ),
  );
  const body = Object.freeze({
    schemaVersion:
      LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_RECONCILIATION_SCHEMA_V1,
    accountScopeHash: completion.accountScopeHash,
    accountGeneration: completion.accountGeneration,
    releaseId: completion.releaseId,
    activeManifestHash: completion.activeManifestHash,
    episodeId: completion.episodeId,
    stageId: completion.stageId,
    activityPackageFingerprint: completion.activityPackageFingerprint,
    packageFingerprint: completion.packageFingerprint,
    sessionId: completion.sessionId,
    sessionOrdinal: completion.sessionOrdinal,
    localSessionId: completion.localSessionId,
    sessionRunId: completion.sessionRunId,
    completionFingerprint: completion.completionFingerprint,
    taskClaims,
    completedCount: taskClaims.filter(
      (claim) => claim.disposition === "completed",
    ).length,
    skipCount: taskClaims.filter((claim) => claim.disposition === "skipped")
      .length,
    catalogReconciliation:
      "exact_active_release_package_and_12_task_match" as const,
    completionClaimAuthority: "untrusted_client_report_only" as const,
    performanceAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    reconciliationFingerprint: hashCanonicalBody(body),
  });
}
