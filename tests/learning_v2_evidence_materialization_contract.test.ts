import {
  buildLearningEvidenceRef,
  buildLearningNonAssessmentRef,
  validateLearningEvidenceRef,
  validateLearningNonAssessmentRef,
  validateLearningEvidenceBody,
  validateLearningNonAssessmentBody,
} from "../modules/learning-v2/contracts/evidence";
import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
} from "../modules/learning-v2/contracts/attempt";
import { buildV2AttemptEvent } from "../modules/learning-v2/contracts/activity_result";

const attemptBody = sanitizeAttemptBody({
  schemaVersion: "v2-attempt-body.v1",
  opId: "op-materialization-1",
  attemptSurface: { kind: "episode_graph_node" },
  outcome: { resultCode: "CORRECT" },
  evidence: { hintsUsed: 0 },
  provenance: { phase: "near_transfer" },
  inputBinding: { source: "keyboard" },
  learningTupleDispositions: [],
});
const sourceAttempt = buildCanonicalAttemptRef(attemptBody);
const tuple = {
  nodeId: "node-1",
  objectiveId: "objective-1",
  skillId: "skill-1",
  construct: "semantic" as const,
  phase: "near_transfer" as const,
  targetKind: "objective" as const,
  targetId: "objective-1",
};

describe("Learning V2 evidence materialization contracts", () => {
  test("hashes evidence and non-assessment bodies separately from their refs", () => {
    const evidence = {
      schemaVersion: "learning-evidence-body.v1" as const,
      observationId: "observation-1",
      ...tuple,
      assessmentStatus: "assessed" as const,
      outcome: "success" as const,
      sourceAttempt,
      policyId: "policy-1",
      policyVersion: 1,
      provenance: {
        phase: "near_transfer" as const,
        support: { hintsUsed: 0 },
        context: { contextId: "ctx-1" },
        prompt: { promptId: "prompt-1" },
      },
      route: {
        kind: "non_voice" as const,
        input: {
          source: "keyboard" as const,
          runtimeEvidenceRef: {
            runtimeEvidenceHash: "a".repeat(64),
            sourceAttempt,
          },
        },
      },
      timing: { occurredAt: "2026-07-16T00:00:00.000Z" },
    };
    const nonAssessment = {
      schemaVersion: "learning-non-assessment-body.v1" as const,
      nonAssessmentId: "non-assessment-1",
      ...tuple,
      assessmentStatus: "not_assessed_accessibility" as const,
      reasonCode: "microphone_unavailable",
      sourceAttempt,
      occurredAt: "2026-07-16T00:00:00.000Z",
    };
    const evidenceRef = buildLearningEvidenceRef(evidence);
    const nonAssessmentRef = buildLearningNonAssessmentRef(nonAssessment);

    expect(validateLearningEvidenceRef(evidence, evidenceRef)).toEqual({
      ok: true,
    });
    expect(
      validateLearningNonAssessmentRef(nonAssessment, nonAssessmentRef),
    ).toEqual({ ok: true });
    expect(evidence).not.toHaveProperty("evidenceBodyHash");
    expect(nonAssessment).not.toHaveProperty("nonAssessmentBodyHash");
    expect(validateLearningEvidenceBody(evidence)).toEqual({ ok: true });
    expect(validateLearningNonAssessmentBody(nonAssessment)).toEqual({
      ok: true,
    });
  });

  test("joins bodies and refs in a non-hashed attempt envelope with exact basis", () => {
    const evidence = {
      schemaVersion: "learning-evidence-body.v1" as const,
      observationId: "observation-1",
      ...tuple,
      assessmentStatus: "assessed" as const,
      outcome: "success" as const,
      sourceAttempt,
      policyId: "policy-1",
      policyVersion: 1,
      provenance: {
        phase: "near_transfer" as const,
        support: { hintsUsed: 0 },
        context: { contextId: "ctx-1" },
        prompt: { promptId: "prompt-1" },
      },
      route: {
        kind: "non_voice" as const,
        input: {
          source: "keyboard" as const,
          runtimeEvidenceRef: {
            runtimeEvidenceHash: "a".repeat(64),
            sourceAttempt,
          },
        },
      },
      timing: { occurredAt: "2026-07-16T00:00:00.000Z" },
    };
    const event = buildV2AttemptEvent({
      attemptBody,
      canonicalAttemptRef: sourceAttempt,
      materializationBasis: { kind: "graph_attempt_body", sourceAttempt },
      learningEvidenceRefs: [buildLearningEvidenceRef(evidence)],
      learningNonAssessmentRefs: [],
    });
    expect(event).not.toHaveProperty("attemptEventHash");
    expect(event.learningEvidenceRefs).toHaveLength(1);
    expect(() =>
      buildV2AttemptEvent({
        ...event,
        canonicalAttemptRef: {
          ...sourceAttempt,
          attemptBodyHash: "0".repeat(64),
        },
      }),
    ).toThrow("attempt_event_canonical_ref_mismatch");
  });

  test("fails closed for unknown fields and invalid assessed phase/timing", () => {
    const evidence = {
      schemaVersion: "learning-evidence-body.v1" as const,
      observationId: "observation-2",
      ...tuple,
      assessmentStatus: "assessed" as const,
      outcome: "success" as const,
      sourceAttempt,
      policyId: "policy-1",
      policyVersion: 1,
      provenance: {
        phase: "delayed_probe" as const,
        support: { hintsUsed: 0 },
        context: { contextId: "ctx-1" },
        prompt: { promptId: "prompt-1" },
      },
      route: {
        kind: "non_voice" as const,
        input: {
          source: "keyboard" as const,
          runtimeEvidenceRef: {
            runtimeEvidenceHash: "a".repeat(64),
            sourceAttempt,
          },
        },
      },
      timing: { occurredAt: "2026-07-16T00:00:00.000Z" },
    };
    expect(validateLearningEvidenceBody(evidence)).toEqual({ ok: false });
    expect(
      validateLearningNonAssessmentBody({
        ...evidence,
        schemaVersion: "learning-non-assessment-body.v1",
        nonAssessmentId: "na-2",
        assessmentStatus: "not_assessed_for_window",
        reasonCode: "outside_pinned_assessment_window",
      }),
    ).toEqual({ ok: false });
  });
});
