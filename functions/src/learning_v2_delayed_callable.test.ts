import { HttpsError } from "firebase-functions/v2/https";
import { normalizeDelayedCallableInput } from "./learning_v2_delayed_callable";

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
});
