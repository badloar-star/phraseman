import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  parseLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionCompletedSummaryV1,
} from "../../../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  createProgressEventAuthorization,
  normalizeProgressAuthUid,
  normalizeProgressStableUid,
  type ProgressEventAuthorization,
} from "./progress_event_callable";

export const LEARNING_V2_COURSE_SESSION_COMPLETED_INBOX_SCHEMA_V1 =
  "learning-v2-course-session-completed-inbox.v1" as const;
export const LEARNING_V2_COURSE_SESSION_COMPLETED_RECEIPT_SCHEMA_V1 =
  "learning-v2-course-session-completed-server-receipt.v1" as const;
export const LEARNING_V2_COURSE_SESSION_COMPLETED_INBOX_SUBCOLLECTION_V1 =
  "v2_course_session_completed_inbox" as const;

export const LEARNING_V2_COURSE_SESSION_COMPLETED_CALLABLE_OPTIONS_V1 =
  Object.freeze({
    region: "us-central1",
    enforceAppCheck: true,
    timeoutSeconds: 15,
    memory: "256MiB" as const,
    maxInstances: 80,
  });

export type LearningV2CourseSessionCompletedInboxRecordV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_COMPLETED_INBOX_SCHEMA_V1;
  stableUid: string;
  accountGeneration: number;
  localCompletionFingerprint: string;
  completion: LearningV2CourseSessionCompletedSummaryV1;
  answerPayload: "absent";
  serverEvaluationAuthority: "none_server_only_stores_completed_summary";
  completionAuthority: "accepted_completed_summary_for_background_storage_only";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
  recordFingerprint: string;
}>;

export type LearningV2CourseSessionCompletedServerReceiptV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_COMPLETED_RECEIPT_SCHEMA_V1;
  localCompletionFingerprint: string;
  recordFingerprint: string;
  duplicate: boolean;
  answerPayload: "absent";
  serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong";
  completionAuthority: "accepted_completed_summary_for_background_storage_only";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
  receiptFingerprint: string;
}>;

export interface LearningV2CourseSessionCompletedInboxStoreV1 {
  putIfAbsent(
    input: Readonly<{
      authUid: string;
      stableUid: string;
      accountGeneration: number;
      record: LearningV2CourseSessionCompletedInboxRecordV1;
    }>,
  ): Promise<"created" | "existing">;
}

export interface LearningV2CourseSessionCompletedHandlerDependenciesV1 {
  readonly authorize: ProgressEventAuthorization;
  readonly inboxStore: LearningV2CourseSessionCompletedInboxStoreV1;
}

function plain(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseRequest(
  value: unknown,
): LearningV2CourseSessionCompletedSummaryV1 {
  if (
    !plain(value) ||
    Reflect.ownKeys(value).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(value, "completion")
  )
    throw new HttpsError(
      "invalid-argument",
      "course_session_completed_submit_invalid",
    );
  try {
    return parseLearningV2CourseSessionCompletedSummaryV1(value.completion);
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "course_session_completed_submit_invalid",
    );
  }
}

function materializeRecord(
  input: Readonly<{
    stableUid: string;
    accountGeneration: number;
    completion: LearningV2CourseSessionCompletedSummaryV1;
  }>,
): LearningV2CourseSessionCompletedInboxRecordV1 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_INBOX_SCHEMA_V1,
    stableUid: input.stableUid,
    accountGeneration: input.accountGeneration,
    localCompletionFingerprint: input.completion.completionFingerprint,
    completion: input.completion,
    answerPayload: "absent" as const,
    serverEvaluationAuthority:
      "none_server_only_stores_completed_summary" as const,
    completionAuthority:
      "accepted_completed_summary_for_background_storage_only" as const,
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

function materializeReceipt(
  stored: LearningV2CourseSessionCompletedInboxRecordV1,
  duplicate: boolean,
): LearningV2CourseSessionCompletedServerReceiptV1 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_RECEIPT_SCHEMA_V1,
    localCompletionFingerprint: stored.localCompletionFingerprint,
    recordFingerprint: stored.recordFingerprint,
    duplicate,
    answerPayload: "absent" as const,
    serverEvaluationAuthority:
      "none_server_must_not_return_correct_or_wrong" as const,
    completionAuthority:
      "accepted_completed_summary_for_background_storage_only" as const,
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

export function createLearningV2CourseSessionCompletedHandlerV1(
  dependencies: LearningV2CourseSessionCompletedHandlerDependenciesV1,
) {
  return async (request: {
    readonly data: unknown;
    readonly auth?: { readonly uid?: unknown } | null;
  }): Promise<LearningV2CourseSessionCompletedServerReceiptV1> => {
    const authUid = normalizeProgressAuthUid(request.auth?.uid);
    const completion = parseRequest(request.data);
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
    const record = materializeRecord({
      stableUid,
      accountGeneration,
      completion,
    });
    let status: "created" | "existing";
    try {
      status = await dependencies.inboxStore.putIfAbsent({
        authUid,
        stableUid,
        accountGeneration,
        record,
      });
    } catch (error) {
      if (
        error instanceof HttpsError ||
        (error instanceof Error &&
          error.message === "course_session_completed_conflict")
      )
        throw new HttpsError(
          "failed-precondition",
          "course_session_completed_conflict",
        );
      throw new HttpsError(
        "unavailable",
        "course_session_completed_storage_unavailable",
      );
    }
    return materializeReceipt(record, status === "existing");
  };
}

function documentId(
  value: LearningV2CourseSessionCompletedInboxRecordV1,
): string {
  return `csc1_${hashCanonicalBody({
    schemaVersion: "learning-v2-course-session-completed-inbox-key.v1",
    stableUid: value.stableUid,
    releaseId: value.completion.releaseId,
    lessonId: value.completion.lessonId,
    courseSessionId: value.completion.courseSessionId,
    sessionRunId: value.completion.sessionRunId,
  })}`;
}

export function createFirestoreLearningV2CourseSessionCompletedInboxStoreV1(
  db: Firestore,
): LearningV2CourseSessionCompletedInboxStoreV1 {
  return Object.freeze({
    putIfAbsent: async ({
      authUid,
      stableUid,
      accountGeneration,
      record,
    }: Parameters<
      LearningV2CourseSessionCompletedInboxStoreV1["putIfAbsent"]
    >[0]) =>
      db.runTransaction(async (transaction) => {
        const authRef = db.collection("auth_links").doc(authUid);
        const userRef = db.collection("users").doc(stableUid);
        const tombstoneRef = db
          .collection("account_deletion_tombstones")
          .doc(stableUid);
        const recordRef = userRef
          .collection(
            LEARNING_V2_COURSE_SESSION_COMPLETED_INBOX_SUBCOLLECTION_V1,
          )
          .doc(documentId(record));
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
              canonicalJsonV1(existing.data()) === canonicalJsonV1(record);
          } catch {
            exact = false;
          }
          if (!exact) throw new Error("course_session_completed_conflict");
          return "existing" as const;
        }
        transaction.create(
          recordRef,
          record as unknown as FirebaseFirestore.DocumentData,
        );
        return "created" as const;
      }),
  });
}

export function createLearningV2CourseSessionCompletedProductionCallableV1(
  db: Firestore = admin.firestore(),
) {
  const handler = createLearningV2CourseSessionCompletedHandlerV1({
    authorize: createProgressEventAuthorization(db),
    inboxStore: createFirestoreLearningV2CourseSessionCompletedInboxStoreV1(db),
  });
  return onCall(
    LEARNING_V2_COURSE_SESSION_COMPLETED_CALLABLE_OPTIONS_V1,
    handler,
  );
}

export const submitLearningV2CourseSessionCompletedV1 = onCall(
  LEARNING_V2_COURSE_SESSION_COMPLETED_CALLABLE_OPTIONS_V1,
  async (request) => {
    const db = admin.firestore();
    const handler = createLearningV2CourseSessionCompletedHandlerV1({
      authorize: createProgressEventAuthorization(db),
      inboxStore:
        createFirestoreLearningV2CourseSessionCompletedInboxStoreV1(db),
    });
    return handler(request);
  },
);
