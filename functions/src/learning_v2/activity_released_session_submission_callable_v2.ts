import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  parseLearningV2ActivityReleasedSessionSubmissionV2,
  rebindLearningV2ActivityReleasedSessionSubmissionV2,
  type LearningV2ActivityReleasedSessionSubmissionV2,
} from "../../../modules/learning-v2/progress/activity_released_session_submission_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { deriveLearningV2EconomicAccountScopeHash } from "../../../modules/learning-v2/progress/economic_account_scope";
import {
  materializeServerWalletRewardRequest,
  parseServerWalletRewardRequest,
  type ServerWalletRewardRequestV1,
} from "../../../modules/learning-v2/progress/server_wallet_reward_receipt";
import {
  createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1,
  getV2FirebaseActivityServerEvaluatorReleaseSummaryV1,
} from "../content_factory/v2_firebase_activity_server_evaluator_release_adapter_v1";
import {
  resolveV2ActivityReleasedServerEnvironmentV1,
  resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1,
} from "../content_factory/v2_activity_released_session_callable_v1";
import { deriveProgressAccountScopeHash } from "./progress_event";
import {
  createProgressEventAuthorization,
  normalizeProgressAuthUid,
  normalizeProgressStableUid,
  type ProgressEventAuthorization,
} from "./progress_event_callable";
import {
  materializeLearningV2ActivityReleasedSessionEvaluationV1,
  type LearningV2ActivityReleasedSessionEvaluationV1,
} from "./activity_released_session_evaluation_v1";
import {
  materializeLearningV2ActivityReleasedSettlementProjectionV1,
  type LearningV2ActivityReleasedSettlementProjectionV1,
} from "./activity_released_session_settlement_projection_v1";
import {
  parseRequiredSessionCourseAwardState,
  parseRequiredSessionPerformanceAwardState,
  projectRequiredSessionPerformanceAward,
} from "./required_session_performance_award";
import {
  V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION,
  materializeProtectedLearningV2WalletRewardReceipt,
  parseProtectedLearningV2WalletRewardReceipt,
} from "../coin_exchange_wallet_reward";

export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_INBOX_SCHEMA_V2 =
  "learning-v2-activity-released-submission-inbox.v2" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_RECEIPT_SCHEMA_V2 =
  "learning-v2-activity-released-submission-server-receipt.v2" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_INBOX_SUBCOLLECTION_V2 =
  "v2_activity_released_submission_inbox" as const;

export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_CALLABLE_OPTIONS_V2 =
  Object.freeze({
    region: "us-central1",
    enforceAppCheck: false,
    timeoutSeconds: 30,
    memory: "512MiB" as const,
    maxInstances: 40,
  });

export interface LearningV2ActivityReleasedSubmissionInboxRecordV2 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_INBOX_SCHEMA_V2;
  readonly stableUid: string;
  readonly accountGeneration: number;
  readonly accountScopeHash: string;
  readonly localSubmissionFingerprint: string;
  readonly serverSubmissionFingerprint: string;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly packageFingerprint: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sessionRunId: string;
  readonly submission: LearningV2ActivityReleasedSessionSubmissionV2;
  readonly evaluation: LearningV2ActivityReleasedSessionEvaluationV1;
  readonly settlementProjection: LearningV2ActivityReleasedSettlementProjectionV1;
  readonly evaluationAuthority: "server_active_release_answer_sequence_only";
  readonly settlementState: "server_economy_settled";
  readonly walletAuthority: "protected_server_reward_receipt_or_none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "server_settled_required_session_progress";
  readonly releaseAuthority: false;
  readonly recordFingerprint: string;
}

export interface LearningV2ActivityReleasedSubmissionServerReceiptV2 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_RECEIPT_SCHEMA_V2;
  readonly localSubmissionFingerprint: string;
  readonly serverSubmissionFingerprint: string;
  readonly recordFingerprint: string;
  readonly evaluationFingerprint: string;
  readonly settlementProjectionFingerprint: string;
  readonly completionKind: "initial" | "repeat";
  readonly awardedSubunits: number;
  readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
  readonly duplicate: boolean;
  readonly catalogAuthority: "firebase_admin_active_release_package_and_sidecar";
  readonly evaluationAuthority: "server_active_release_answer_sequence_only";
  readonly settlementState: "server_economy_settled";
  readonly walletAuthority: "protected_server_reward_receipt_or_none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "server_settled_required_session_progress";
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface LearningV2ActivityReleasedSubmissionMaterialsV2 {
  readonly canonicalPackageRaw: string;
  readonly canonicalSidecarRaw: string;
  readonly activeManifestHash: string;
  readonly releaseId: string;
  readonly courseReleaseId: string;
  readonly episodeOrdinal: number;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
}

export interface LearningV2ActivityReleasedSubmissionInboxStoreV2 {
  putIfAbsent(input: {
    readonly authUid: string;
    readonly stableUid: string;
    readonly accountGeneration: number;
    readonly record: LearningV2ActivityReleasedSubmissionInboxRecordV2;
  }): Promise<{
    readonly status: "created" | "existing";
    readonly completionKind: "initial" | "repeat";
    readonly awardedSubunits: number;
    readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
  }>;
}

export interface LearningV2ActivityReleasedSubmissionHandlerDependenciesV2 {
  readonly authorize: ProgressEventAuthorization;
  readonly resolveMaterials: (
    submission: LearningV2ActivityReleasedSessionSubmissionV2,
    stableUid: string,
  ) => Promise<LearningV2ActivityReleasedSubmissionMaterialsV2>;
  readonly inboxStore: LearningV2ActivityReleasedSubmissionInboxStoreV2;
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseRequest(value: unknown) {
  if (
    !record(value) ||
    Reflect.ownKeys(value).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(value, "submission")
  )
    throw new HttpsError(
      "invalid-argument",
      "activity_released_submission_submit_invalid",
    );
  try {
    return parseLearningV2ActivityReleasedSessionSubmissionV2(value.submission);
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "activity_released_submission_submit_invalid",
    );
  }
}

function materializeRecord(input: {
  readonly stableUid: string;
  readonly localSubmissionFingerprint: string;
  readonly submission: LearningV2ActivityReleasedSessionSubmissionV2;
  readonly evaluation: LearningV2ActivityReleasedSessionEvaluationV1;
  readonly settlementProjection: LearningV2ActivityReleasedSettlementProjectionV1;
}): LearningV2ActivityReleasedSubmissionInboxRecordV2 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_INBOX_SCHEMA_V2,
    stableUid: input.stableUid,
    accountGeneration: input.submission.accountGeneration,
    accountScopeHash: input.submission.accountScopeHash,
    localSubmissionFingerprint: input.localSubmissionFingerprint,
    serverSubmissionFingerprint: input.submission.submissionFingerprint,
    releaseId: input.submission.releaseId,
    activeManifestHash: input.submission.activeManifestHash,
    episodeId: input.submission.episodeId,
    stageId: input.submission.stageId,
    packageFingerprint: input.submission.packageFingerprint,
    sessionId: input.submission.sessionId,
    sessionOrdinal: input.submission.sessionOrdinal,
    sessionRunId: input.submission.sessionRunId,
    submission: input.submission,
    evaluation: input.evaluation,
    settlementProjection: input.settlementProjection,
    evaluationAuthority: "server_active_release_answer_sequence_only" as const,
    settlementState: "server_economy_settled" as const,
    walletAuthority: "protected_server_reward_receipt_or_none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "server_settled_required_session_progress" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({ ...body, recordFingerprint: hashCanonicalBody(body) });
}

function receiptFor(
  stored: LearningV2ActivityReleasedSubmissionInboxRecordV2,
  result: Awaited<
    ReturnType<LearningV2ActivityReleasedSubmissionInboxStoreV2["putIfAbsent"]>
  >,
): LearningV2ActivityReleasedSubmissionServerReceiptV2 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_RECEIPT_SCHEMA_V2,
    localSubmissionFingerprint: stored.localSubmissionFingerprint,
    serverSubmissionFingerprint: stored.serverSubmissionFingerprint,
    recordFingerprint: stored.recordFingerprint,
    evaluationFingerprint: stored.evaluation.evaluationFingerprint,
    settlementProjectionFingerprint:
      stored.settlementProjection.projectionFingerprint,
    completionKind: result.completionKind,
    awardedSubunits: result.awardedSubunits,
    walletRewardRequest: result.walletRewardRequest,
    duplicate: result.status === "existing",
    catalogAuthority:
      "firebase_admin_active_release_package_and_sidecar" as const,
    evaluationAuthority: "server_active_release_answer_sequence_only" as const,
    settlementState: "server_economy_settled" as const,
    walletAuthority: "protected_server_reward_receipt_or_none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "server_settled_required_session_progress" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
}

export function createLearningV2ActivityReleasedSubmissionHandlerV2(
  dependencies: LearningV2ActivityReleasedSubmissionHandlerDependenciesV2,
) {
  return async (request: {
    readonly data: unknown;
    readonly auth?: { readonly uid?: unknown } | null;
  }): Promise<LearningV2ActivityReleasedSubmissionServerReceiptV2> => {
    const authUid = normalizeProgressAuthUid(request.auth?.uid);
    const localSubmission = parseRequest(request.data);
    const binding = await dependencies.authorize(authUid);
    const stableUid = normalizeProgressStableUid(binding.stableUid);
    if (
      !Number.isSafeInteger(binding.accountGeneration) ||
      binding.accountGeneration < 1
    )
      throw new HttpsError(
        "failed-precondition",
        "account_generation_unavailable",
      );
    const accountGeneration = binding.accountGeneration;
    const accountScopeHash = deriveProgressAccountScopeHash(
      stableUid,
      accountGeneration,
    );
    let submission: LearningV2ActivityReleasedSessionSubmissionV2;
    try {
      submission = rebindLearningV2ActivityReleasedSessionSubmissionV2(
        localSubmission,
        { accountScopeHash, accountGeneration },
      );
    } catch {
      throw new HttpsError(
        "invalid-argument",
        "activity_released_submission_rebind_invalid",
      );
    }
    let materials: LearningV2ActivityReleasedSubmissionMaterialsV2;
    try {
      materials = await dependencies.resolveMaterials(submission, stableUid);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "unavailable",
        "activity_released_submission_catalog_unavailable",
      );
    }
    if (
      materials.activeManifestHash !== submission.activeManifestHash ||
      materials.releaseId !== submission.releaseId ||
      materials.stageId !== submission.stageId ||
      materials.activityPackageFingerprint !==
        submission.activityPackageFingerprint
    )
      throw new HttpsError(
        "failed-precondition",
        "activity_released_submission_active_release_changed",
      );
    let evaluation: LearningV2ActivityReleasedSessionEvaluationV1;
    try {
      evaluation = materializeLearningV2ActivityReleasedSessionEvaluationV1({
        submission,
        canonicalPackageRaw: materials.canonicalPackageRaw,
        canonicalSidecarRaw: materials.canonicalSidecarRaw,
        expectedAccountScopeHash: accountScopeHash,
        expectedAccountGeneration: accountGeneration,
      });
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "activity_released_submission_evaluation_failed",
      );
    }
    let settlementProjection: LearningV2ActivityReleasedSettlementProjectionV1;
    try {
      settlementProjection =
        materializeLearningV2ActivityReleasedSettlementProjectionV1({
          submission,
          evaluation,
          courseReleaseId: materials.courseReleaseId,
          episodeOrdinal: materials.episodeOrdinal,
          economicAccountScopeHash:
            deriveLearningV2EconomicAccountScopeHash(stableUid),
        });
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "activity_released_submission_settlement_projection_failed",
      );
    }
    const inboxRecord = materializeRecord({
      stableUid,
      localSubmissionFingerprint: localSubmission.submissionFingerprint,
      submission,
      evaluation,
      settlementProjection,
    });
    let result: Awaited<
      ReturnType<
        LearningV2ActivityReleasedSubmissionInboxStoreV2["putIfAbsent"]
      >
    >;
    try {
      result = await dependencies.inboxStore.putIfAbsent({
        authUid,
        stableUid,
        accountGeneration,
        record: inboxRecord,
      });
    } catch (error) {
      if (
        error instanceof HttpsError ||
        (error instanceof Error &&
          error.message === "activity_released_submission_conflict")
      )
        throw new HttpsError(
          "failed-precondition",
          "activity_released_submission_conflict",
        );
      throw error;
    }
    return receiptFor(inboxRecord, result);
  };
}

function documentId(
  recordValue: LearningV2ActivityReleasedSubmissionInboxRecordV2,
) {
  return `arsi2_${hashCanonicalBody({
    schemaVersion: "learning-v2-activity-released-submission-inbox-key.v2",
    accountScopeHash: recordValue.accountScopeHash,
    releaseId: recordValue.releaseId,
    episodeId: recordValue.episodeId,
    sessionId: recordValue.sessionId,
    sessionRunId: recordValue.sessionRunId,
  })}`;
}

interface LearningV2ActivityReleasedSettlementDecisionV1 {
  readonly schemaVersion: "learning-v2-activity-released-settlement-decision.v1";
  readonly submissionRecordFingerprint: string;
  readonly settlementProjectionFingerprint: string;
  readonly candidateFingerprint: string;
  readonly completionKind: "initial" | "repeat";
  readonly awardedSubunits: number;
  readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
  readonly decisionFingerprint: string;
}

function materializeSettlementDecision(input: {
  readonly submissionRecordFingerprint: string;
  readonly settlementProjectionFingerprint: string;
  readonly candidateFingerprint: string;
  readonly completionKind: "initial" | "repeat";
  readonly awardedSubunits: number;
  readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
}): LearningV2ActivityReleasedSettlementDecisionV1 {
  if (
    !/^[a-f0-9]{64}$/u.test(input.submissionRecordFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(input.settlementProjectionFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(input.candidateFingerprint) ||
    !Number.isSafeInteger(input.awardedSubunits) ||
    input.awardedSubunits < 0 ||
    input.awardedSubunits > 36 * 10_000
  )
    throw new Error("activity_released_settlement_decision_invalid");
  const walletRewardRequest =
    input.walletRewardRequest === null
      ? null
      : parseServerWalletRewardRequest(input.walletRewardRequest);
  if ((input.awardedSubunits === 0) !== (walletRewardRequest === null))
    throw new Error("activity_released_settlement_decision_invalid");
  const body = Object.freeze({
    schemaVersion:
      "learning-v2-activity-released-settlement-decision.v1" as const,
    submissionRecordFingerprint: input.submissionRecordFingerprint,
    settlementProjectionFingerprint: input.settlementProjectionFingerprint,
    candidateFingerprint: input.candidateFingerprint,
    completionKind: input.completionKind,
    awardedSubunits: input.awardedSubunits,
    walletRewardRequest,
  });
  return Object.freeze({
    ...body,
    decisionFingerprint: hashCanonicalBody(body),
  });
}

function parseSettlementDecision(
  value: unknown,
): LearningV2ActivityReleasedSettlementDecisionV1 {
  if (!record(value))
    throw new Error("activity_released_settlement_decision_invalid");
  let rebuilt: LearningV2ActivityReleasedSettlementDecisionV1;
  try {
    rebuilt = materializeSettlementDecision({
      submissionRecordFingerprint: String(value.submissionRecordFingerprint),
      settlementProjectionFingerprint: String(
        value.settlementProjectionFingerprint,
      ),
      candidateFingerprint: String(value.candidateFingerprint),
      completionKind: value.completionKind as "initial" | "repeat",
      awardedSubunits: Number(value.awardedSubunits),
      walletRewardRequest:
        value.walletRewardRequest as ServerWalletRewardRequestV1 | null,
    });
  } catch {
    throw new Error("activity_released_settlement_decision_invalid");
  }
  if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(value))
    throw new Error("activity_released_settlement_decision_invalid");
  return rebuilt;
}

function performanceAwardStateDocumentId(
  row: LearningV2ActivityReleasedSubmissionInboxRecordV2,
) {
  return `rspasv1_${row.settlementProjection.candidate.initialCreditSubjectFingerprint}`;
}

function courseAwardStateDocumentId(
  row: LearningV2ActivityReleasedSubmissionInboxRecordV2,
) {
  const candidate = row.settlementProjection.candidate;
  return `rscasv1_${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-course-award-key.v1",
    economicAccountScopeHash: candidate.economicAccountScopeHash,
    courseId: candidate.courseId,
    studyTarget: candidate.studyTarget,
  })}`;
}

function settlementDecisionDocumentId(
  row: LearningV2ActivityReleasedSubmissionInboxRecordV2,
) {
  return `arsdv1_${hashCanonicalBody({
    schemaVersion: "learning-v2-activity-released-settlement-decision-key.v1",
    economicAccountScopeHash:
      row.settlementProjection.candidate.economicAccountScopeHash,
    submissionFingerprint: row.serverSubmissionFingerprint,
  })}`;
}

export function createFirestoreLearningV2ActivityReleasedSubmissionInboxStoreV2(
  db: Firestore,
): LearningV2ActivityReleasedSubmissionInboxStoreV2 {
  return Object.freeze({
    putIfAbsent: async ({
      authUid,
      stableUid,
      accountGeneration,
      record: row,
    }: Parameters<
      LearningV2ActivityReleasedSubmissionInboxStoreV2["putIfAbsent"]
    >[0]) =>
      db.runTransaction(async (transaction) => {
        const authRef = db.collection("auth_links").doc(authUid);
        const userRef = db.collection("users").doc(stableUid);
        const tombstoneRef = db
          .collection("account_deletion_tombstones")
          .doc(stableUid);
        const rowRef = userRef
          .collection(
            LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_INBOX_SUBCOLLECTION_V2,
          )
          .doc(documentId(row));
        const awardStateRef = userRef
          .collection("v2_required_session_performance_awards")
          .doc(performanceAwardStateDocumentId(row));
        const courseAwardStateRef = userRef
          .collection("v2_required_session_course_awards")
          .doc(courseAwardStateDocumentId(row));
        const settlementDecisionRef = userRef
          .collection("v2_activity_released_settlement_decisions")
          .doc(settlementDecisionDocumentId(row));
        const [
          auth,
          user,
          tombstone,
          existing,
          awardStateSnapshot,
          courseAwardStateSnapshot,
          settlementDecisionSnapshot,
        ] = await Promise.all([
          transaction.get(authRef),
          transaction.get(userRef),
          transaction.get(tombstoneRef),
          transaction.get(rowRef),
          transaction.get(awardStateRef),
          transaction.get(courseAwardStateRef),
          transaction.get(settlementDecisionRef),
        ]);
        if (
          !auth.exists ||
          auth.data()?.stable_id !== stableUid ||
          tombstone.exists ||
          !user.exists ||
          Number(user.data()?.accountGeneration ?? user.data()?.generation) !==
            accountGeneration
        )
          throw new HttpsError(
            "failed-precondition",
            "account_generation_mismatch",
          );
        if (existing.exists) {
          let exact = false;
          try {
            exact = canonicalJsonV1(existing.data()) === canonicalJsonV1(row);
          } catch {
            exact = false;
          }
          if (!exact) throw new Error("activity_released_submission_conflict");
          if (!settlementDecisionSnapshot.exists)
            throw new HttpsError(
              "data-loss",
              "activity_released_settlement_decision_missing",
            );
          const decision = parseSettlementDecision(
            settlementDecisionSnapshot.data(),
          );
          if (
            decision.submissionRecordFingerprint !== row.recordFingerprint ||
            decision.settlementProjectionFingerprint !==
              row.settlementProjection.projectionFingerprint ||
            decision.candidateFingerprint !==
              row.settlementProjection.candidate.candidateFingerprint
          )
            throw new HttpsError(
              "data-loss",
              "activity_released_settlement_conflict",
            );
          return Object.freeze({
            status: "existing" as const,
            completionKind: decision.completionKind,
            awardedSubunits: decision.awardedSubunits,
            walletRewardRequest: decision.walletRewardRequest,
          });
        }
        if (settlementDecisionSnapshot.exists)
          throw new HttpsError(
            "data-loss",
            "activity_released_settlement_orphan_decision",
          );
        const previousState = awardStateSnapshot.exists
          ? parseRequiredSessionPerformanceAwardState(awardStateSnapshot.data())
          : null;
        const previousCourseState = courseAwardStateSnapshot.exists
          ? parseRequiredSessionCourseAwardState(
              courseAwardStateSnapshot.data(),
            )
          : null;
        const projection = projectRequiredSessionPerformanceAward({
          candidate: row.settlementProjection.candidate,
          previousState,
          previousCourseState,
        });
        if (projection.completionKind === "legacy_deferred")
          throw new HttpsError(
            "failed-precondition",
            "activity_released_settlement_candidate_invalid",
          );
        const walletRewardRequest =
          projection.reward === null
            ? null
            : materializeServerWalletRewardRequest(projection.reward);
        const decision = materializeSettlementDecision({
          submissionRecordFingerprint: row.recordFingerprint,
          settlementProjectionFingerprint:
            row.settlementProjection.projectionFingerprint,
          candidateFingerprint:
            row.settlementProjection.candidate.candidateFingerprint,
          completionKind: projection.completionKind,
          awardedSubunits: projection.awardedSubunits,
          walletRewardRequest,
        });
        let rewardRef: FirebaseFirestore.DocumentReference | null = null;
        let protectedReward: ReturnType<
          typeof materializeProtectedLearningV2WalletRewardReceipt
        > | null = null;
        let rewardSnapshot: FirebaseFirestore.DocumentSnapshot | null = null;
        if (projection.reward !== null) {
          protectedReward = materializeProtectedLearningV2WalletRewardReceipt(
            projection.reward,
          );
          rewardRef = userRef
            .collection(V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION)
            .doc(protectedReward.rewardId);
          rewardSnapshot = await transaction.get(rewardRef);
          if (rewardSnapshot.exists) {
            const storedReward = parseProtectedLearningV2WalletRewardReceipt(
              rewardSnapshot.data(),
            );
            if (
              canonicalJsonV1(storedReward) !== canonicalJsonV1(protectedReward)
            )
              throw new HttpsError(
                "data-loss",
                "activity_released_settlement_reward_conflict",
              );
          }
        }
        transaction.create(
          rowRef,
          row as unknown as FirebaseFirestore.DocumentData,
        );
        transaction.create(
          settlementDecisionRef,
          decision as unknown as FirebaseFirestore.DocumentData,
        );
        if (projection.nextState === null)
          throw new HttpsError(
            "failed-precondition",
            "activity_released_settlement_state_invalid",
          );
        if (awardStateSnapshot.exists)
          transaction.set(
            awardStateRef,
            projection.nextState as unknown as FirebaseFirestore.DocumentData,
            { merge: false },
          );
        else
          transaction.create(
            awardStateRef,
            projection.nextState as unknown as FirebaseFirestore.DocumentData,
          );
        if (
          projection.nextCourseState !== null &&
          projection.nextCourseState.stateFingerprint !==
            projection.previousCourseState?.stateFingerprint
        ) {
          if (courseAwardStateSnapshot.exists)
            transaction.set(
              courseAwardStateRef,
              projection.nextCourseState as unknown as FirebaseFirestore.DocumentData,
              { merge: false },
            );
          else
            transaction.create(
              courseAwardStateRef,
              projection.nextCourseState as unknown as FirebaseFirestore.DocumentData,
            );
        }
        if (
          rewardRef &&
          protectedReward &&
          rewardSnapshot &&
          !rewardSnapshot.exists
        )
          transaction.create(
            rewardRef,
            protectedReward as unknown as FirebaseFirestore.DocumentData,
          );
        return Object.freeze({
          status: "created" as const,
          completionKind: projection.completionKind,
          awardedSubunits: projection.awardedSubunits,
          walletRewardRequest,
        });
      }),
  });
}

async function resolveProductionMaterials(
  submission: LearningV2ActivityReleasedSessionSubmissionV2,
  stableUid: string,
): Promise<LearningV2ActivityReleasedSubmissionMaterialsV2> {
  const environment = resolveV2ActivityReleasedServerEnvironmentV1();
  const released =
    await resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1(
      {
        environment,
        studyTarget: submission.completion.studyTarget,
        learnerSourceLocale: submission.completion.learnerSourceLocale,
        seasonId: submission.completion.seasonId,
        expectedActiveManifestHash: submission.activeManifestHash,
        episodeId: submission.episodeId,
        sessionOrdinal: submission.sessionOrdinal,
      },
      stableUid,
    );
  const evaluator =
    createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1();
  const evaluatorHandle = await evaluator.load({
    environment,
    studyTarget: submission.completion.studyTarget,
    learnerSourceLocale: submission.completion.learnerSourceLocale,
    seasonId: submission.completion.seasonId,
    episodeId: submission.episodeId,
  });
  const evaluatorSummary =
    getV2FirebaseActivityServerEvaluatorReleaseSummaryV1(evaluatorHandle);
  const evaluatorSession = await evaluator.resolveSession(
    evaluatorHandle,
    submission.sessionOrdinal,
  );
  return Object.freeze({
    canonicalPackageRaw: released.canonicalPackageRaw,
    canonicalSidecarRaw: evaluatorSession.sidecarRaw,
    activeManifestHash: evaluatorSummary.activeManifestHash,
    releaseId: evaluatorSummary.releaseId,
    courseReleaseId: evaluatorSummary.courseReleaseId,
    episodeOrdinal: evaluatorSummary.episodeOrdinal,
    stageId: evaluatorSummary.stageId,
    activityPackageFingerprint: evaluatorSummary.activityPackageFingerprint,
  });
}

export const submitLearningV2ActivityReleasedSessionV2 = onCall(
  LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_CALLABLE_OPTIONS_V2,
  async (request) => {
    const db = admin.firestore();
    return createLearningV2ActivityReleasedSubmissionHandlerV2({
      authorize: createProgressEventAuthorization(db),
      resolveMaterials: resolveProductionMaterials,
      inboxStore:
        createFirestoreLearningV2ActivityReleasedSubmissionInboxStoreV2(db),
    })(request);
  },
);
