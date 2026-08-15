import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "./account_generation";
import { initFirebaseAppCheckIfAvailable } from "./app_check_init";
import { withCallableTimeout } from "./callable_timeout";
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from "./config";
import {
  isInteractiveNetworkDeferredError,
  withBackgroundNetworkLease,
} from "./interactive_network_quiet";
import { getStableId } from "./stable_id";
import { createLearningV2CourseSessionCompletedSpoolV1 } from "./learning_v2_course_session_completed_spool_v1";
import type { LearningV2CourseSessionCompletedSummaryV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const REGION = "us-central1";
const CALLABLE_NAME = "submitLearningV2CourseSessionCompletedV1";
const MAX_PER_FLUSH = 8;
const HASH_RE = /^[a-f0-9]{64}$/u;

export type LearningV2CourseSessionCompletedSyncAttemptV1 = Readonly<{
  processed: number;
  disposition:
    | "drained"
    | "bounded_continuation"
    | "retryable_failure"
    | "deferred";
}>;

type ServerReceipt = Readonly<{
  schemaVersion: "learning-v2-course-session-completed-server-receipt.v1";
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

const attempt = (
  processed: number,
  disposition: LearningV2CourseSessionCompletedSyncAttemptV1["disposition"],
) => Object.freeze({ processed, disposition });

function parseReceipt(
  value: unknown,
  completion: LearningV2CourseSessionCompletedSummaryV1,
): ServerReceipt {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "answerPayload|completionAuthority|duplicate|evidenceAuthority|localCompletionFingerprint|masteryAuthority|receiptFingerprint|recordFingerprint|releaseAuthority|schemaVersion|serverEvaluationAuthority|walletAuthority"
  )
    throw new Error("course_session_completed_receipt_invalid");
  const receipt = value as ServerReceipt;
  if (
    receipt.schemaVersion !==
      "learning-v2-course-session-completed-server-receipt.v1" ||
    receipt.localCompletionFingerprint !== completion.completionFingerprint ||
    !HASH_RE.test(receipt.recordFingerprint) ||
    typeof receipt.duplicate !== "boolean" ||
    receipt.answerPayload !== "absent" ||
    receipt.serverEvaluationAuthority !==
      "none_server_must_not_return_correct_or_wrong" ||
    receipt.completionAuthority !==
      "accepted_completed_summary_for_background_storage_only" ||
    receipt.walletAuthority !== "none" ||
    receipt.masteryAuthority !== "none" ||
    receipt.evidenceAuthority !== "none" ||
    receipt.releaseAuthority !== false ||
    !HASH_RE.test(receipt.receiptFingerprint)
  )
    throw new Error("course_session_completed_receipt_invalid");
  const { receiptFingerprint: _claimed, ...body } = receipt;
  if (hashCanonicalBody(body) !== receipt.receiptFingerprint)
    throw new Error("course_session_completed_receipt_invalid");
  return Object.freeze({ ...receipt });
}

async function callServer(
  completion: LearningV2CourseSessionCompletedSummaryV1,
): Promise<ServerReceipt> {
  return withBackgroundNetworkLease(
    "learning-v2.course-session-completed-sync",
    async (lease) => {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      lease.assertCurrent();
      const callable = httpsCallable<
        { completion: LearningV2CourseSessionCompletedSummaryV1 },
        ServerReceipt
      >(getFunctions(getApp(), REGION), CALLABLE_NAME);
      const response = await withCallableTimeout(
        callable({ completion }),
        CALLABLE_NAME,
        30_000,
      );
      lease.assertCurrent();
      return parseReceipt(response.data, completion);
    },
  );
}

export async function attemptPendingLearningV2CourseSessionCompletedV1(): Promise<LearningV2CourseSessionCompletedSyncAttemptV1> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return attempt(0, "drained");
  const captured = await withAccountTransitionLock(async () => {
    const token = captureAccountGeneration();
    if (token.phase !== "active" || !token.stableId) return null;
    const stableId = await getStableId();
    return isCurrentAccountGeneration(token, stableId)
      ? Object.freeze({ stableId, token })
      : null;
  });
  if (!captured) return attempt(0, "deferred");
  const { stableId, token } = captured;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const spool = createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage);
  const pending = await spool.list(accountScopeHash);
  let processed = 0;
  for (const completion of pending) {
    if (processed >= MAX_PER_FLUSH)
      return attempt(processed, "bounded_continuation");
    if (!isCurrentAccountGeneration(token, stableId))
      return attempt(processed, "deferred");
    try {
      await callServer(completion);
    } catch (error) {
      return attempt(
        processed,
        isInteractiveNetworkDeferredError(error)
          ? "deferred"
          : "retryable_failure",
      );
    }
    if (!isCurrentAccountGeneration(token, stableId))
      return attempt(processed, "deferred");
    await spool.remove(accountScopeHash, completion.completionFingerprint);
    processed += 1;
  }
  return attempt(processed, "drained");
}
