import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  parseLearningV2ActivityReleasedSessionCompletionV1,
  rebindLearningV2ActivityReleasedSessionCompletionV1,
  type LearningV2ActivityReleasedSessionCompletionV1,
} from "../../../modules/learning-v2/progress/activity_released_session_completion_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  resolveV2ActivityReleasedServerEnvironmentV1,
  resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1,
  type V2ActivityReleasedSessionResolvedV1,
} from "../content_factory/v2_activity_released_session_callable_v1";
import { deriveProgressAccountScopeHash } from "./progress_event";
import {
  createProgressEventAuthorization,
  normalizeProgressAuthUid,
  normalizeProgressStableUid,
  type ProgressEventAuthorization,
} from "./progress_event_callable";
import {
  materializeLearningV2ActivityReleasedCompletionReconciliationV1,
  type LearningV2ActivityReleasedCompletionReconciliationV1,
} from "./activity_released_session_completion_projection_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_INBOX_SCHEMA_V1 =
  "learning-v2-activity-released-completion-inbox.v1" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_RECEIPT_SCHEMA_V1 =
  "learning-v2-activity-released-completion-server-receipt.v1" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_INBOX_SUBCOLLECTION_V1 =
  "v2_activity_released_completion_inbox" as const;

export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_CALLABLE_OPTIONS_V1 =
  Object.freeze({
    region: "us-central1",
    enforceAppCheck: true,
    timeoutSeconds: 30,
    memory: "512MiB" as const,
    maxInstances: 40,
  });

export interface LearningV2ActivityReleasedCompletionInboxRecordV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_INBOX_SCHEMA_V1;
  readonly stableUid: string;
  readonly accountGeneration: number;
  readonly accountScopeHash: string;
  readonly localCompletionFingerprint: string;
  readonly serverCompletionFingerprint: string;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly packageFingerprint: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly localSessionId: string;
  readonly sessionRunId: string;
  readonly completion: LearningV2ActivityReleasedSessionCompletionV1;
  readonly reconciliation: LearningV2ActivityReleasedCompletionReconciliationV1;
  readonly completionAuthority: "accepted_for_post_session_verification_only";
  readonly performanceAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly recordFingerprint: string;
}

export interface LearningV2ActivityReleasedCompletionServerReceiptV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_RECEIPT_SCHEMA_V1;
  readonly localCompletionFingerprint: string;
  readonly serverCompletionFingerprint: string;
  readonly recordFingerprint: string;
  readonly reconciliationFingerprint: string;
  readonly duplicate: boolean;
  readonly catalogAuthority: "firebase_admin_active_release_12_task_coordinate_match";
  readonly completionAuthority: "accepted_for_post_session_verification_only";
  readonly performanceAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface LearningV2ActivityReleasedCompletionInboxStoreV1 {
  putIfAbsent(input: {
    readonly authUid: string;
    readonly stableUid: string;
    readonly accountGeneration: number;
    readonly record: LearningV2ActivityReleasedCompletionInboxRecordV1;
  }): Promise<"created" | "existing">;
}

export interface LearningV2ActivityReleasedCompletionHandlerDependenciesV1 {
  readonly authorize: ProgressEventAuthorization;
  readonly resolveSession: (
    completion: LearningV2ActivityReleasedSessionCompletionV1,
    stableUid: string,
  ) => Promise<V2ActivityReleasedSessionResolvedV1>;
  readonly inboxStore: LearningV2ActivityReleasedCompletionInboxStoreV1;
}

const HASH_RE = /^[a-f0-9]{64}$/u;

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseRequest(
  value: unknown,
): LearningV2ActivityReleasedSessionCompletionV1 {
  if (
    !record(value) ||
    Reflect.ownKeys(value).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(value, "completion")
  )
    throw new HttpsError(
      "invalid-argument",
      "activity_released_completion_submit_invalid",
    );
  try {
    return parseLearningV2ActivityReleasedSessionCompletionV1(value.completion);
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "activity_released_completion_submit_invalid",
    );
  }
}

function materializeRecord(input: {
  readonly stableUid: string;
  readonly localCompletionFingerprint: string;
  readonly completion: LearningV2ActivityReleasedSessionCompletionV1;
  readonly reconciliation: LearningV2ActivityReleasedCompletionReconciliationV1;
}): LearningV2ActivityReleasedCompletionInboxRecordV1 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_INBOX_SCHEMA_V1,
    stableUid: input.stableUid,
    accountGeneration: input.completion.accountGeneration,
    accountScopeHash: input.completion.accountScopeHash,
    localCompletionFingerprint: input.localCompletionFingerprint,
    serverCompletionFingerprint: input.completion.completionFingerprint,
    releaseId: input.completion.releaseId,
    activeManifestHash: input.completion.activeManifestHash,
    episodeId: input.completion.episodeId,
    stageId: input.completion.stageId,
    packageFingerprint: input.completion.packageFingerprint,
    sessionId: input.completion.sessionId,
    sessionOrdinal: input.completion.sessionOrdinal,
    localSessionId: input.completion.localSessionId,
    sessionRunId: input.completion.sessionRunId,
    completion: input.completion,
    reconciliation: input.reconciliation,
    completionAuthority: "accepted_for_post_session_verification_only" as const,
    performanceAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    recordFingerprint: hashCanonicalBody(body),
  });
}

function receiptFor(
  stored: LearningV2ActivityReleasedCompletionInboxRecordV1,
  duplicate: boolean,
): LearningV2ActivityReleasedCompletionServerReceiptV1 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_RECEIPT_SCHEMA_V1,
    localCompletionFingerprint: stored.localCompletionFingerprint,
    serverCompletionFingerprint: stored.serverCompletionFingerprint,
    recordFingerprint: stored.recordFingerprint,
    reconciliationFingerprint: stored.reconciliation.reconciliationFingerprint,
    duplicate,
    catalogAuthority:
      "firebase_admin_active_release_12_task_coordinate_match" as const,
    completionAuthority: "accepted_for_post_session_verification_only" as const,
    performanceAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
}

export function createLearningV2ActivityReleasedCompletionHandlerV1(
  dependencies: LearningV2ActivityReleasedCompletionHandlerDependenciesV1,
) {
  return async (request: {
    readonly data: unknown;
    readonly auth?: { readonly uid?: unknown } | null;
  }): Promise<LearningV2ActivityReleasedCompletionServerReceiptV1> => {
    const authUid = normalizeProgressAuthUid(request.auth?.uid);
    const localCompletion = parseRequest(request.data);
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
    let completion: LearningV2ActivityReleasedSessionCompletionV1;
    try {
      completion = rebindLearningV2ActivityReleasedSessionCompletionV1(
        localCompletion,
        { accountScopeHash, accountGeneration },
      );
    } catch {
      throw new HttpsError(
        "invalid-argument",
        "activity_released_completion_rebind_invalid",
      );
    }
    let resolved: V2ActivityReleasedSessionResolvedV1;
    try {
      resolved = await dependencies.resolveSession(completion, stableUid);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "unavailable",
        "activity_released_completion_catalog_unavailable",
      );
    }
    if (
      resolved.activeManifestHash !== completion.activeManifestHash ||
      !HASH_RE.test(resolved.auxiliaryIndexFingerprint)
    )
      throw new HttpsError(
        "failed-precondition",
        "activity_released_completion_active_release_changed",
      );
    let reconciliation: LearningV2ActivityReleasedCompletionReconciliationV1;
    try {
      reconciliation =
        materializeLearningV2ActivityReleasedCompletionReconciliationV1({
          completion,
          canonicalPackageRaw: resolved.canonicalPackageRaw,
          expectedAccountScopeHash: accountScopeHash,
          expectedAccountGeneration: accountGeneration,
        });
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "activity_released_completion_reconciliation_failed",
      );
    }
    const inboxRecord = materializeRecord({
      stableUid,
      localCompletionFingerprint: localCompletion.completionFingerprint,
      completion,
      reconciliation,
    });
    let status: "created" | "existing";
    try {
      status = await dependencies.inboxStore.putIfAbsent({
        authUid,
        stableUid,
        accountGeneration,
        record: inboxRecord,
      });
    } catch (error) {
      if (
        error instanceof HttpsError ||
        (error instanceof Error &&
          error.message === "activity_released_completion_conflict")
      )
        throw new HttpsError(
          "failed-precondition",
          "activity_released_completion_conflict",
        );
      throw error;
    }
    return receiptFor(inboxRecord, status === "existing");
  };
}

function documentId(
  recordValue: LearningV2ActivityReleasedCompletionInboxRecordV1,
): string {
  return `arci1_${hashCanonicalBody({
    schemaVersion: "learning-v2-activity-released-completion-inbox-key.v1",
    accountScopeHash: recordValue.accountScopeHash,
    releaseId: recordValue.releaseId,
    episodeId: recordValue.episodeId,
    sessionId: recordValue.sessionId,
    sessionRunId: recordValue.sessionRunId,
  })}`;
}

export function createFirestoreLearningV2ActivityReleasedCompletionInboxStoreV1(
  db: Firestore,
): LearningV2ActivityReleasedCompletionInboxStoreV1 {
  return Object.freeze({
    putIfAbsent: async ({
      authUid,
      stableUid,
      accountGeneration,
      record: inboxRecord,
    }: Parameters<
      LearningV2ActivityReleasedCompletionInboxStoreV1["putIfAbsent"]
    >[0]) =>
      db.runTransaction(async (transaction) => {
        const authRef = db.collection("auth_links").doc(authUid);
        const userRef = db.collection("users").doc(stableUid);
        const tombstoneRef = db
          .collection("account_deletion_tombstones")
          .doc(stableUid);
        const recordRef = userRef
          .collection(
            LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_INBOX_SUBCOLLECTION_V1,
          )
          .doc(documentId(inboxRecord));
        const [auth, user, tombstone, existing] = await Promise.all([
          transaction.get(authRef),
          transaction.get(userRef),
          transaction.get(tombstoneRef),
          transaction.get(recordRef),
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
            exact =
              canonicalJsonV1(existing.data()) === canonicalJsonV1(inboxRecord);
          } catch {
            exact = false;
          }
          if (!exact) throw new Error("activity_released_completion_conflict");
          return "existing" as const;
        }
        transaction.create(
          recordRef,
          inboxRecord as unknown as FirebaseFirestore.DocumentData,
        );
        return "created" as const;
      }),
  });
}

export function createLearningV2ActivityReleasedCompletionProductionCallableV1(
  db: Firestore = admin.firestore(),
) {
  const handler = createLearningV2ActivityReleasedCompletionHandlerV1({
    authorize: createProgressEventAuthorization(db),
    resolveSession: async (completion, stableUid) =>
      resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1(
        {
          environment: resolveV2ActivityReleasedServerEnvironmentV1(),
          studyTarget: completion.studyTarget,
          learnerSourceLocale: completion.learnerSourceLocale,
          seasonId: completion.seasonId,
          expectedActiveManifestHash: completion.activeManifestHash,
          episodeId: completion.episodeId,
          sessionOrdinal: completion.sessionOrdinal,
        },
        stableUid,
      ),
    inboxStore:
      createFirestoreLearningV2ActivityReleasedCompletionInboxStoreV1(db),
  });
  return onCall(
    LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_CALLABLE_OPTIONS_V1,
    handler,
  );
}

export const submitLearningV2ActivityReleasedCompletionV1 = onCall(
  LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_CALLABLE_OPTIONS_V1,
  async (request) => {
    const db = admin.firestore();
    const handler = createLearningV2ActivityReleasedCompletionHandlerV1({
      authorize: createProgressEventAuthorization(db),
      resolveSession: async (completion, stableUid) =>
        resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1(
          {
            environment: resolveV2ActivityReleasedServerEnvironmentV1(),
            studyTarget: completion.studyTarget,
            learnerSourceLocale: completion.learnerSourceLocale,
            seasonId: completion.seasonId,
            expectedActiveManifestHash: completion.activeManifestHash,
            episodeId: completion.episodeId,
            sessionOrdinal: completion.sessionOrdinal,
          },
          stableUid,
        ),
      inboxStore:
        createFirestoreLearningV2ActivityReleasedCompletionInboxStoreV1(db),
    });
    return handler(request);
  },
);
