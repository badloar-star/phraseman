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
import { createLearningV2ActivityReleasedSessionSubmissionSpoolV2 } from "../modules/learning-v2/progress/activity_released_session_submission_spool_v2";
import type { LearningV2ActivityReleasedSessionSubmissionV2 } from "../modules/learning-v2/progress/activity_released_session_submission_v2";
import type { ProgressAccountScope } from "../modules/learning-v2/progress/progress_store";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  parseServerWalletRewardRequest,
  type ServerWalletRewardRequestV1,
} from "../modules/learning-v2/progress/server_wallet_reward_receipt";
import { commitLearningV2ServerWalletReward } from "./learning_v2_owner_repository_runtime";

const REGION = "us-central1";
const CALLABLE_NAME = "submitLearningV2ActivityReleasedSessionV2";
const HASH_RE = /^[a-f0-9]{64}$/u;
const MAX_PER_FLUSH = 8;

export type LearningV2ActivityReleasedSubmissionSyncAttemptV2 = Readonly<{
  processed: number;
  disposition:
    | "drained"
    | "bounded_continuation"
    | "retryable_failure"
    | "deferred";
}>;

type ServerReceipt = Readonly<{
  schemaVersion: "learning-v2-activity-released-submission-server-receipt.v2";
  localSubmissionFingerprint: string;
  serverSubmissionFingerprint: string;
  recordFingerprint: string;
  evaluationFingerprint: string;
  settlementProjectionFingerprint: string;
  completionKind: "initial" | "repeat";
  awardedSubunits: number;
  walletRewardRequest: ServerWalletRewardRequestV1 | null;
  duplicate: boolean;
  catalogAuthority: "firebase_admin_active_release_package_and_sidecar";
  evaluationAuthority: "server_active_release_answer_sequence_only";
  settlementState: "server_economy_settled";
  walletAuthority: "protected_server_reward_receipt_or_none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  completionAuthority: "server_settled_required_session_progress";
  releaseAuthority: false;
  receiptFingerprint: string;
}>;

const attempt = (
  processed: number,
  disposition: LearningV2ActivityReleasedSubmissionSyncAttemptV2["disposition"],
) => Object.freeze({ processed, disposition });

function parseReceipt(
  value: unknown,
  submission: LearningV2ActivityReleasedSessionSubmissionV2,
): ServerReceipt {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "awardedSubunits|catalogAuthority|completionAuthority|completionKind|duplicate|evaluationAuthority|evaluationFingerprint|evidenceAuthority|localSubmissionFingerprint|masteryAuthority|receiptFingerprint|recordFingerprint|releaseAuthority|schemaVersion|serverSubmissionFingerprint|settlementProjectionFingerprint|settlementState|walletAuthority|walletRewardRequest"
  )
    throw new Error("activity_released_submission_receipt_invalid");
  const receipt = value as ServerReceipt;
  if (
    receipt.schemaVersion !==
      "learning-v2-activity-released-submission-server-receipt.v2" ||
    receipt.localSubmissionFingerprint !== submission.submissionFingerprint ||
    !HASH_RE.test(receipt.serverSubmissionFingerprint) ||
    !HASH_RE.test(receipt.recordFingerprint) ||
    !HASH_RE.test(receipt.evaluationFingerprint) ||
    !HASH_RE.test(receipt.settlementProjectionFingerprint) ||
    (receipt.completionKind !== "initial" &&
      receipt.completionKind !== "repeat") ||
    !Number.isSafeInteger(receipt.awardedSubunits) ||
    receipt.awardedSubunits < 0 ||
    receipt.awardedSubunits > 36 * 10_000 ||
    typeof receipt.duplicate !== "boolean" ||
    receipt.catalogAuthority !==
      "firebase_admin_active_release_package_and_sidecar" ||
    receipt.evaluationAuthority !==
      "server_active_release_answer_sequence_only" ||
    receipt.settlementState !== "server_economy_settled" ||
    receipt.walletAuthority !== "protected_server_reward_receipt_or_none" ||
    receipt.masteryAuthority !== "none" ||
    receipt.evidenceAuthority !== "none" ||
    receipt.completionAuthority !==
      "server_settled_required_session_progress" ||
    receipt.releaseAuthority !== false ||
    !HASH_RE.test(receipt.receiptFingerprint)
  )
    throw new Error("activity_released_submission_receipt_invalid");
  let walletRewardRequest: ServerWalletRewardRequestV1 | null;
  try {
    walletRewardRequest =
      receipt.walletRewardRequest === null
        ? null
        : parseServerWalletRewardRequest(receipt.walletRewardRequest);
  } catch {
    throw new Error("activity_released_submission_receipt_invalid");
  }
  if ((receipt.awardedSubunits === 0) !== (walletRewardRequest === null))
    throw new Error("activity_released_submission_receipt_invalid");
  const { receiptFingerprint: _claimed, ...body } = receipt;
  if (hashCanonicalBody(body) !== receipt.receiptFingerprint)
    throw new Error("activity_released_submission_receipt_invalid");
  return Object.freeze({ ...receipt, walletRewardRequest });
}

async function callServer(
  submission: LearningV2ActivityReleasedSessionSubmissionV2,
): Promise<ServerReceipt> {
  return withBackgroundNetworkLease(
    "learning-v2.activity-released-submission-sync",
    async (lease) => {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      lease.assertCurrent();
      const callable = httpsCallable<
        { submission: LearningV2ActivityReleasedSessionSubmissionV2 },
        ServerReceipt
      >(getFunctions(getApp(), REGION), CALLABLE_NAME);
      const response = await withCallableTimeout(
        callable({ submission }),
        CALLABLE_NAME,
        30_000,
      );
      lease.assertCurrent();
      return parseReceipt(response.data, submission);
    },
  );
}

export async function attemptPendingLearningV2ActivityReleasedSubmissionsV2(): Promise<LearningV2ActivityReleasedSubmissionSyncAttemptV2> {
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
  const spool = createLearningV2ActivityReleasedSessionSubmissionSpoolV2(
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
    for (const submission of pending) {
      if (processed >= MAX_PER_FLUSH)
        return attempt(processed, "bounded_continuation");
      if (!current(candidateScope)) return attempt(processed, "deferred");
      try {
        const receipt = await callServer(submission);
        if (receipt.walletRewardRequest !== null)
          await commitLearningV2ServerWalletReward(receipt.walletRewardRequest);
      } catch (error) {
        return attempt(
          processed,
          isInteractiveNetworkDeferredError(error)
            ? "deferred"
            : "retryable_failure",
        );
      }
      if (!current(candidateScope)) return attempt(processed, "deferred");
      await spool.remove(candidateScope, submission.submissionFingerprint);
      processed += 1;
      remaining -= 1;
    }
  }
  return attempt(processed, remaining > 0 ? "bounded_continuation" : "drained");
}
