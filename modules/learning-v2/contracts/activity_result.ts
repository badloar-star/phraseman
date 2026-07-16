/** Result is intentionally separate from attempt hash/materialization records. */
import {
  validateCanonicalAttemptRef,
  type CanonicalAttemptRef,
  type V2AttemptEventBody,
} from "./attempt";
import type { LearningEvidenceRef, LearningNonAssessmentRef } from "./evidence";

export type V2ActivityResultCode =
  | "PASS_CONFIDENT"
  | "NEEDS_WORK_CONFIDENT"
  | "UNCERTAIN"
  | "INVALID_AUDIO_OR_SYSTEM"
  | "CORRECT"
  | "WRONG"
  | "COMPLETED"
  | "SKIPPED";
export interface V2ActivityResult {
  readonly resultCode: V2ActivityResultCode;
  readonly candidatePerformanceStars: 0 | 1 | 2 | 3;
}

export type V2AttemptMaterializationBasis =
  | {
      readonly kind: "graph_attempt_body";
      readonly sourceAttempt: CanonicalAttemptRef;
    }
  | {
      readonly kind: "delayed_timing_receipt";
      readonly timingReceiptRef: string;
    }
  | {
      readonly kind: "delayed_system_failure_receipt";
      readonly failureReceiptRef: string;
    };

/** Non-hashed ledger join; integrity is checked per component, never as a whole. */
export interface V2AttemptEvent {
  readonly schemaVersion: "v2-attempt-envelope.v1";
  readonly attemptBody: V2AttemptEventBody;
  readonly attemptRef: CanonicalAttemptRef;
  readonly learningEvidenceRefs: readonly LearningEvidenceRef[];
  readonly learningNonAssessmentRefs: readonly LearningNonAssessmentRef[];
  readonly materializationBasis: V2AttemptMaterializationBasis;
}

export const validateAttemptEventEnvelope = (
  event: unknown,
): { readonly ok: boolean } => {
  if (typeof event !== "object" || event === null) return { ok: false };
  const candidate = event as Partial<V2AttemptEvent>;
  if (
    candidate.schemaVersion !== "v2-attempt-envelope.v1" ||
    !Array.isArray(candidate.learningEvidenceRefs) ||
    !Array.isArray(candidate.learningNonAssessmentRefs) ||
    candidate.materializationBasis === undefined ||
    Object.prototype.hasOwnProperty.call(candidate, "eventHash")
  ) {
    return { ok: false };
  }
  return validateCanonicalAttemptRef(
    candidate.attemptBody,
    candidate.attemptRef!,
  );
};

export const buildV2AttemptEvent = (input: {
  readonly attemptBody: V2AttemptEventBody;
  readonly canonicalAttemptRef: CanonicalAttemptRef;
  readonly learningEvidenceRefs: readonly LearningEvidenceRef[];
  readonly learningNonAssessmentRefs: readonly LearningNonAssessmentRef[];
  readonly materializationBasis: V2AttemptMaterializationBasis;
}): V2AttemptEvent => {
  if (
    !validateCanonicalAttemptRef(input.attemptBody, input.canonicalAttemptRef)
      .ok
  ) {
    throw new Error("attempt_event_canonical_ref_mismatch");
  }
  const graph = input.attemptBody.attemptSurface.kind === "episode_graph_node";
  if (
    (graph && input.materializationBasis.kind !== "graph_attempt_body") ||
    (!graph && input.materializationBasis.kind === "graph_attempt_body") ||
    (input.materializationBasis.kind === "graph_attempt_body" &&
      (input.materializationBasis.sourceAttempt.opId !==
        input.canonicalAttemptRef.opId ||
        input.materializationBasis.sourceAttempt.attemptBodyHash !==
          input.canonicalAttemptRef.attemptBodyHash))
  ) {
    throw new Error("attempt_event_materialization_basis_mismatch");
  }
  const refs = [
    ...input.learningEvidenceRefs,
    ...input.learningNonAssessmentRefs,
  ];
  if (
    refs.some(
      (ref) =>
        ref.sourceAttempt.schemaVersion !==
          input.canonicalAttemptRef.schemaVersion ||
        ref.sourceAttempt.opId !== input.canonicalAttemptRef.opId ||
        ref.sourceAttempt.attemptBodyHash !==
          input.canonicalAttemptRef.attemptBodyHash ||
        !/^letk1\./.test(ref.tupleKey) ||
        ("evidenceBodyHash" in ref
          ? !/^[a-f0-9]{64}$/.test(ref.evidenceBodyHash)
          : !/^[a-f0-9]{64}$/.test(ref.nonAssessmentBodyHash)),
    ) ||
    new Set(refs.map((ref) => ref.tupleKey)).size !== refs.length
  ) {
    throw new Error("attempt_event_materialization_ref_invalid");
  }
  return Object.freeze({
    schemaVersion: "v2-attempt-envelope.v1",
    attemptBody: input.attemptBody,
    attemptRef: input.canonicalAttemptRef,
    learningEvidenceRefs: Object.freeze([...input.learningEvidenceRefs]),
    learningNonAssessmentRefs: Object.freeze([
      ...input.learningNonAssessmentRefs,
    ]),
    materializationBasis: input.materializationBasis,
  });
};
