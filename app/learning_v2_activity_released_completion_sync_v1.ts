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
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from "../modules/learning-v2/progress/progress_account_scope";
import { createLearningV2ActivityReleasedSessionCompletionSpoolV1 } from "../modules/learning-v2/progress/activity_released_session_completion_spool_v1";
import type { LearningV2ActivityReleasedSessionCompletionV1 } from "../modules/learning-v2/progress/activity_released_session_completion_v1";
import type { ProgressAccountScope } from "../modules/learning-v2/progress/progress_store";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const REGION = "us-central1";
const CALLABLE_NAME = "submitLearningV2ActivityReleasedCompletionV1";
const HASH_RE = /^[a-f0-9]{64}$/u;
const MAX_PER_FLUSH = 8;

export type LearningV2ActivityReleasedCompletionSyncAttemptV1 = Readonly<{
  processed: number;
  disposition:
    | "drained"
    | "bounded_continuation"
    | "retryable_failure"
    | "deferred";
}>;

type ServerReceipt = Readonly<{
  schemaVersion: "learning-v2-activity-released-completion-server-receipt.v1";
  localCompletionFingerprint: string;
  serverCompletionFingerprint: string;
  recordFingerprint: string;
  reconciliationFingerprint: string;
  duplicate: boolean;
  catalogAuthority: "firebase_admin_active_release_12_task_coordinate_match";
  completionAuthority: "accepted_completed_summary_for_storage_only";
  performanceAuthority: "none";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
  receiptFingerprint: string;
}>;

const attempt = (
  processed: number,
  disposition: LearningV2ActivityReleasedCompletionSyncAttemptV1["disposition"],
) => Object.freeze({ processed, disposition });

function parseReceipt(
  value: unknown,
  completion: LearningV2ActivityReleasedSessionCompletionV1,
): ServerReceipt {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "catalogAuthority|completionAuthority|duplicate|evidenceAuthority|localCompletionFingerprint|masteryAuthority|performanceAuthority|receiptFingerprint|reconciliationFingerprint|recordFingerprint|releaseAuthority|schemaVersion|serverCompletionFingerprint|walletAuthority"
  )
    throw new Error("activity_released_completion_receipt_invalid");
  const receipt = value as ServerReceipt;
  if (
    receipt.schemaVersion !==
      "learning-v2-activity-released-completion-server-receipt.v1" ||
    receipt.localCompletionFingerprint !== completion.completionFingerprint ||
    !HASH_RE.test(receipt.serverCompletionFingerprint) ||
    !HASH_RE.test(receipt.recordFingerprint) ||
    !HASH_RE.test(receipt.reconciliationFingerprint) ||
    typeof receipt.duplicate !== "boolean" ||
    receipt.catalogAuthority !==
      "firebase_admin_active_release_12_task_coordinate_match" ||
    receipt.completionAuthority !==
      "accepted_completed_summary_for_storage_only" ||
    receipt.performanceAuthority !== "none" ||
    receipt.walletAuthority !== "none" ||
    receipt.masteryAuthority !== "none" ||
    receipt.evidenceAuthority !== "none" ||
    receipt.releaseAuthority !== false ||
    !HASH_RE.test(receipt.receiptFingerprint)
  )
    throw new Error("activity_released_completion_receipt_invalid");
  const { receiptFingerprint: _claimed, ...body } = receipt;
  if (hashCanonicalBody(body) !== receipt.receiptFingerprint)
    throw new Error("activity_released_completion_receipt_invalid");
  return Object.freeze({ ...receipt });
}

async function callServer(
  completion: LearningV2ActivityReleasedSessionCompletionV1,
): Promise<ServerReceipt> {
  return withBackgroundNetworkLease(
    "learning-v2.activity-released-completion-sync",
    async (lease) => {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      lease.assertCurrent();
      const callable = httpsCallable<
        { completion: LearningV2ActivityReleasedSessionCompletionV1 },
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

export async function attemptPendingLearningV2ActivityReleasedCompletionsV1(): Promise<LearningV2ActivityReleasedCompletionSyncAttemptV1> {
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
  const scope: ProgressAccountScope = Object.freeze({
    stableId,
    generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
    accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(stableId),
    seasonId: "learning-v2",
    studyTarget: "en",
    learnerSourceLocale: "ru",
  });
  const current = (candidate: ProgressAccountScope) =>
    isCurrentAccountGeneration(token, candidate.stableId);
  const spool = createLearningV2ActivityReleasedSessionCompletionSpoolV1(
    AsyncStorage,
    current,
  );
  const scopes = await spool.discoverAccountScopes(scope);
  if (scopes.length === 0) return attempt(0, "drained");
  let processed = 0;
  let remaining = 0;
  for (const candidateScope of scopes) {
    const pending = await spool.list(candidateScope);
    remaining += pending.length;
    for (const completion of pending) {
      if (processed >= MAX_PER_FLUSH)
        return attempt(processed, "bounded_continuation");
      if (!current(candidateScope)) return attempt(processed, "deferred");
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
      if (!current(candidateScope)) return attempt(processed, "deferred");
      await spool.remove(candidateScope, completion.completionFingerprint);
      processed += 1;
      remaining -= 1;
    }
  }
  return attempt(processed, remaining > 0 ? "bounded_continuation" : "drained");
}
