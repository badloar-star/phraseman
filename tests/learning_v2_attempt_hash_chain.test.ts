import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
} from "../modules/learning-v2/contracts/attempt";

describe("Learning V2 attempt hash chain", () => {
  test("sanitizes a hash-free body before deriving its attempt ref", () => {
    const body = sanitizeAttemptBody({
      schemaVersion: "v2-attempt-body.v1",
      opId: "op-1",
      evidence: { hintsUsed: 0 },
      learningEvidenceRefs: [{ forbidden: true }],
      attemptBodyHash: "forbidden",
    });
    expect(body).not.toHaveProperty("learningEvidenceRefs");
    expect(body).not.toHaveProperty("attemptBodyHash");
    expect(buildCanonicalAttemptRef(body).attemptBodyHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });
});
