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
  | { readonly kind: "graph_attempt_body" }
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
