import { hashCanonicalBody } from "../policies/decision_registry";

/** Account scope shared by the offline envelope and the server inbox. */
export const deriveProgressAccountScopeHash = (
  stableUid: string,
  generation: number,
): string => {
  if (typeof stableUid !== "string" || !stableUid.trim() ||
    !Number.isSafeInteger(generation) || generation < 1) {
    throw new Error("v2_progress_account_identity_invalid");
  }
  return hashCanonicalBody({
    schemaVersion: "v2-progress-account-scope.v1",
    stableUid,
    generation,
  });
};

/**
 * Local Learning V2 drafts are stable across process restarts. The app's
 * process-local account generation is only a race fence and must never be
 * serialized as the server's durable account generation. Background transport
 * rebinds an exact completion to a server-owned binding before upload.
 */
export const LOCAL_OFFLINE_PROGRESS_GENERATION = 0 as const;

export const deriveLocalOfflineProgressAccountScopeHash = (
  stableUid: string,
): string => {
  if (typeof stableUid !== "string" || !stableUid.trim()) {
    throw new Error("v2_local_progress_account_identity_invalid");
  }
  return hashCanonicalBody({
    schemaVersion: "v2-local-progress-account-scope.v1",
    stableUid,
  });
};
