import { HttpsError } from "firebase-functions/v2/https";
import { delayedFirestorePath, normalizeDelayedCallableInput } from "./learning_v2_delayed_callable";

const valid = {
  operationId: "op-1",
  stableId: "user-1",
  accountGeneration: 2,
  candidate: {
    schemaVersion: "v2-delayed-attempt-candidate.v1",
    attemptBody: {},
    attemptRef: {},
  },
  assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) },
  launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) },
  probeRef: { probeId: "p1", contentHash: "c".repeat(64) },
  expectedTupleKeys: ["letk1.x"],
  timingReceiptId: "t1",
  failureReceiptId: "f1",
  windowPolicyId: "policy-1",
};

describe("Learning V2 delayed callable input", () => {
  test("normalizes bounded input and copies tuple keys", () => {
    const input = normalizeDelayedCallableInput(valid);
    expect(input.operationId).toBe("op-1");
    expect(input.expectedTupleKeys).toEqual(["letk1.x"]);
    expect(() =>
      (input.expectedTupleKeys as string[]).push("mutate"),
    ).toThrow();
  });

  test("rejects malformed idempotency and numeric identity fields", () => {
    expect(() =>
      normalizeDelayedCallableInput({ ...valid, operationId: "../escape" }),
    ).toThrow(HttpsError);
    expect(() =>
      normalizeDelayedCallableInput({ ...valid, accountGeneration: 0 }),
    ).toThrow(HttpsError);
    expect(() =>
      normalizeDelayedCallableInput({ ...valid, expectedTupleKeys: ["bad"] }),
    ).not.toThrow();
  });

  test("maps every account-bound delayed artifact below the stable owner root", () => {
    expect(delayedFirestorePath("auth_links:provider-auth-1"))
      .toBe("auth_links/provider-auth-1");
    expect(delayedFirestorePath("users:user-1"))
      .toBe("users/user-1");
    expect(delayedFirestorePath("account_deletion_tombstones:user-1"))
      .toBe("account_deletion_tombstones/user-1");
    expect(delayedFirestorePath("learning_v2_assignments:user-1:a1"))
      .toBe("users/user-1/v2_delayed_assignments/a1");
    expect(delayedFirestorePath("learning_v2_launches:user-1:l1"))
      .toBe("users/user-1/v2_delayed_launches/l1");
    expect(delayedFirestorePath("learning_v2_timing_receipts:user-1:t1"))
      .toBe("users/user-1/v2_delayed_timing_receipts/t1");
    expect(delayedFirestorePath("learning_v2_failure_receipts:user-1:f1"))
      .toBe("users/user-1/v2_delayed_failure_receipts/f1");
    expect(delayedFirestorePath("learning-v2:delayed:user-1:op-1"))
      .toBe("users/user-1/v2_delayed_operations/op-1");
  });
});
