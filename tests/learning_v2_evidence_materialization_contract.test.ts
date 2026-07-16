import {
  buildLearningEvidenceRef,
  buildLearningNonAssessmentRef,
  validateLearningMaterialization,
  type LearningEvidenceBody,
  type LearningNonAssessmentBody,
} from "../modules/learning-v2/contracts/evidence";
import {
  validateAttemptEventEnvelope,
  type V2AttemptEvent,
} from "../modules/learning-v2/contracts/activity_result";
import { buildCanonicalAttemptRef } from "../modules/learning-v2/contracts/attempt";

const attemptRef = {
  schemaVersion: "v2-attempt-ref.v1",
  opId: "op-1",
  attemptBodyHash: "a".repeat(64),
} as const;

const tuple = {
  nodeId: "node-1",
  objectiveId: "objective-1",
  skillId: "skill-1",
  construct: "semantic",
  phase: "near_transfer",
  targetKind: "objective",
  targetId: "objective-1",
} as const;

const evidenceBody = {
  schemaVersion: "learning-evidence-body.v1",
  observationId: "observation-1",
  assessmentStatus: "assessed",
  outcome: "success",
  sourceAttempt: attemptRef,
  policyId: "policy-v1",
  policyVersion: 1,
  ...tuple,
} as const satisfies LearningEvidenceBody;

const nonAssessmentBody = {
  schemaVersion: "learning-non-assessment-body.v1",
  nonAssessmentId: "non-assessment-1",
  sourceAttempt: attemptRef,
  occurredAt: "2026-07-16T00:00:00.000Z",
  assessmentStatus: "not_assessed_system",
  reasonCode: "system_unavailable",
  ...tuple,
} as const satisfies LearningNonAssessmentBody;

describe("Learning V2 evidence/materialization contracts", () => {
  test("builds refs from hash-free bodies and preserves source attempt/tuple", () => {
    const evidenceRef = buildLearningEvidenceRef(evidenceBody);
    const nonAssessmentRef = buildLearningNonAssessmentRef(nonAssessmentBody);
    expect(evidenceRef.sourceAttempt).toEqual(attemptRef);
    expect(nonAssessmentRef.sourceAttempt).toEqual(attemptRef);
    expect(evidenceRef.tupleKey).toMatch(/^letk1\./);
    expect(nonAssessmentRef.tupleKey).toBe(evidenceRef.tupleKey);
    expect(evidenceRef.evidenceBodyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(nonAssessmentRef.nonAssessmentBodyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("rejects a ref whose source attempt or tuple does not match its body", () => {
    const ref = buildLearningEvidenceRef(evidenceBody);
    expect(
      validateLearningMaterialization(evidenceBody, {
        ...ref,
        sourceAttempt: { ...attemptRef, opId: "different-op" },
      }),
    ).toEqual({ ok: false });
    expect(
      validateLearningMaterialization(evidenceBody, {
        ...ref,
        tupleKey: "letk1.invalid",
      }),
    ).toEqual({ ok: false });
  });

  test("keeps the ledger envelope non-hashed and validates its attempt component", () => {
    const attemptBody = {
      schemaVersion: "v2-attempt-body.v1",
      opId: "op-1",
      attemptSurface: { kind: "episode_graph_node" },
      outcome: { resultCode: "CORRECT" },
      evidence: { hintsUsed: 0 },
      provenance: { phase: "near_transfer" },
      inputBinding: { source: "keyboard" },
      learningTupleDispositions: [],
    } as const;
    const event: V2AttemptEvent = {
      schemaVersion: "v2-attempt-envelope.v1",
      attemptBody,
      attemptRef: buildCanonicalAttemptRef(attemptBody),
      learningEvidenceRefs: [],
      learningNonAssessmentRefs: [],
      materializationBasis: { kind: "graph_attempt_body" },
    };
    expect(validateAttemptEventEnvelope(event)).toEqual({ ok: true });
    expect(
      validateAttemptEventEnvelope({ ...event, eventHash: "forbidden" }),
    ).toEqual({ ok: false });
  });
});
