import { hashCanonicalBody } from "../policies/decision_registry";

const STABLE_UID = /^[A-Za-z0-9._-]{1,160}$/;

/**
 * Stable account-global identity for Learning V2 economics.
 *
 * Account generation is deliberately absent. Generation is a publication
 * fence/provenance coordinate and may advance while the same wallet, lifetime
 * indexes and journal remain reachable.
 */
export const deriveLearningV2EconomicAccountScopeHash = (
  stableUid: unknown,
): string => {
  if (
    typeof stableUid !== "string" ||
    !STABLE_UID.test(stableUid) ||
    stableUid === "." ||
    stableUid === ".."
  ) {
    throw new Error("learning_v2_economic_account_scope_invalid");
  }
  return hashCanonicalBody({
    schemaVersion: "learning-v2-economic-account-scope.v1",
    stableUid,
  });
};
