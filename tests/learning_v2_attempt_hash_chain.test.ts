import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
  validateCanonicalAttemptRef,
} from "../modules/learning-v2/contracts/attempt";

describe("Learning V2 attempt hash chain", () => {
  const validGraphBody = {
    schemaVersion: "v2-attempt-body.v1",
    opId: "op-1",
    attemptSurface: { kind: "episode_graph_node" },
    outcome: { resultCode: "CORRECT" },
    evidence: { hintsUsed: 0 },
    provenance: { phase: "near_transfer" },
    inputBinding: { source: "keyboard" },
    learningTupleDispositions: [],
  } as const;

  test.each([
    "learningEvidenceRefs",
    "learningNonAssessmentRefs",
    "attemptBodyHash",
    "canonicalAttemptRef",
  ])("rejects post-hash %s instead of silently stripping it", (key) => {
    expect(() =>
      sanitizeAttemptBody({
        ...validGraphBody,
        [key]: [{ forbidden: true }],
      }),
    ).toThrow("attempt_body_post_hash_field_forbidden");
  });

  test("rejects incomplete bodies rather than treating an envelope as canonical", () => {
    expect(() =>
      sanitizeAttemptBody({
        schemaVersion: "v2-attempt-body.v1",
        opId: "op-1",
        evidence: { hintsUsed: 0 },
      }),
    ).toThrow("attempt_body_invalid");
  });

  test("derives a ref only from an exact hash-free graph body", () => {
    const body = sanitizeAttemptBody(validGraphBody);
    const ref = buildCanonicalAttemptRef(body);
    expect(ref.attemptBodyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(validateCanonicalAttemptRef(body, ref)).toEqual({ ok: true });
    expect(
      validateCanonicalAttemptRef(
        { ...body, attemptBodyHash: ref.attemptBodyHash },
        ref,
      ),
    ).toEqual({ ok: false });
    expect(
      validateCanonicalAttemptRef(body, {
        ...ref,
        attemptBodyHash: "0".repeat(64),
      }),
    ).toEqual({ ok: false });
  });
});
