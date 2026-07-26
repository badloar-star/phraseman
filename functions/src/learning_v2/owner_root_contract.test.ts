import { readFileSync } from "node:fs";
import path from "node:path";
import { firestoreV2AccessPath } from "../learning_v2_access_adapter";
import { delayedFirestorePath } from "../learning_v2_delayed_callable";

const PRODUCTION_PATH_OWNERS = [
  "../learning_v2_access_adapter.ts",
  "../learning_v2_access_callable.ts",
  "../learning_v2_access_production_callable.ts",
  "../learning_v2_delayed_adapter.ts",
  "../learning_v2_delayed_callable.ts",
  "firestore_progress_event_store.ts",
  "progress_event_callable.ts",
] as const;

const LEGACY_ACCOUNT_BOUND_COLLECTIONS = [
  "learning_v2_progress",
  "learning_v2_progress_operations",
  "learning_v2_progress_attempts",
  "learning_v2_evidence",
  "learning_v2_delayed_terminals",
  "learning_v2_assignments",
  "learning_v2_launches",
  "learning_v2_timing_receipts",
  "learning_v2_failure_receipts",
  "learning_v2_receipt_operations",
  "learning_v2_access_quotes",
  "learning_v2_access_operations",
  "learning_v2_access_ledger",
] as const;

describe("Learning V2 canonical stable-owner root contract", () => {
  it("contains no account-bound production Firestore path rooted at a legacy top-level collection", () => {
    const sources = PRODUCTION_PATH_OWNERS.map((relativePath) => ({
      relativePath,
      source: readFileSync(path.resolve(__dirname, relativePath), "utf8"),
    }));

    for (const { relativePath, source } of sources) {
      for (const collection of LEGACY_ACCOUNT_BOUND_COLLECTIONS) {
        expect({
          relativePath,
          collection,
          hasLegacyPath:
            source.includes(`"${collection}"`) ||
            source.includes(`'${collection}'`) ||
            source.includes(`\`${collection}\``) ||
            source.includes(`${collection}/`),
        }).toEqual({
          relativePath,
          collection,
          hasLegacyPath: false,
        });
      }
    }
  });

  it("maps access and delayed durable artifacts below users/{stableUid}", () => {
    expect(firestoreV2AccessPath("learning-v2:access-quote:stable-a:quote-a"))
      .toBe("users/stable-a/v2_access_quotes/quote-a");
    expect(firestoreV2AccessPath("learning-v2:access-operation:stable-a:op-a"))
      .toBe("users/stable-a/v2_access_operations/op-a");
    expect(firestoreV2AccessPath("learning-v2:access-receipt:stable-a:op-a"))
      .toBe("users/stable-a/v2_access_ledger/op-a");
    expect(delayedFirestorePath("learning_v2_timing_receipts:stable-a:receipt-a"))
      .toBe("users/stable-a/v2_delayed_timing_receipts/receipt-a");
    expect(delayedFirestorePath("learning_v2_delayed_terminals:stable-a:attempt-a"))
      .toBe("users/stable-a/v2_delayed_attempts/attempt-a");
    expect(delayedFirestorePath("learning-v2:delayed:stable-a:op-a"))
      .toBe("users/stable-a/v2_delayed_operations/op-a");
  });
});
