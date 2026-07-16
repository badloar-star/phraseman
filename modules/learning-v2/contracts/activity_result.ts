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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isAttemptRef = (value: unknown): value is CanonicalAttemptRef =>
  isRecord(value) &&
  exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  typeof value.opId === "string" &&
  value.opId.length > 0 &&
  isHash(value.attemptBodyHash);
const sameAttempt = (left: unknown, right: CanonicalAttemptRef): boolean =>
  isAttemptRef(left) &&
  left.schemaVersion === right.schemaVersion &&
  left.opId === right.opId &&
  left.attemptBodyHash === right.attemptBodyHash;
const isEvidenceRef = (value: unknown): value is LearningEvidenceRef =>
  isRecord(value) &&
  exactKeys(value, [
    "observationId",
    "evidenceBodyHash",
    "tupleKey",
    "sourceAttempt",
  ]) &&
  typeof value.observationId === "string" &&
  value.observationId.length > 0 &&
  isHash(value.evidenceBodyHash) &&
  typeof value.tupleKey === "string" &&
  /^letk1\.[A-Za-z0-9_-]+$/.test(value.tupleKey) &&
  isAttemptRef(value.sourceAttempt);
const isNonAssessmentRef = (
  value: unknown,
): value is LearningNonAssessmentRef =>
  isRecord(value) &&
  exactKeys(value, [
    "nonAssessmentId",
    "nonAssessmentBodyHash",
    "tupleKey",
    "sourceAttempt",
  ]) &&
  typeof value.nonAssessmentId === "string" &&
  value.nonAssessmentId.length > 0 &&
  isHash(value.nonAssessmentBodyHash) &&
  typeof value.tupleKey === "string" &&
  /^letk1\.[A-Za-z0-9_-]+$/.test(value.tupleKey) &&
  isAttemptRef(value.sourceAttempt);
const isBasis = (value: unknown): value is V2AttemptMaterializationBasis => {
  if (!isRecord(value)) return false;
  if (value.kind === "graph_attempt_body")
    return isAttemptRef(value.sourceAttempt);
  return (
    (value.kind === "delayed_timing_receipt" &&
      typeof value.timingReceiptRef === "string" &&
      value.timingReceiptRef.length > 0) ||
    (value.kind === "delayed_system_failure_receipt" &&
      typeof value.failureReceiptRef === "string" &&
      value.failureReceiptRef.length > 0)
  );
};

export const validateAttemptEventEnvelope = (
  event: unknown,
): { readonly ok: boolean } => {
  if (typeof event !== "object" || event === null) return { ok: false };
  const candidate = event as Partial<V2AttemptEvent>;
  if (
    !isRecord(event) ||
    !Object.keys(event).every((key) =>
      [
        "schemaVersion",
        "attemptBody",
        "attemptRef",
        "learningEvidenceRefs",
        "learningNonAssessmentRefs",
        "materializationBasis",
      ].includes(key),
    ) ||
    candidate.schemaVersion !== "v2-attempt-envelope.v1" ||
    !Array.isArray(candidate.learningEvidenceRefs) ||
    !Array.isArray(candidate.learningNonAssessmentRefs) ||
    !isBasis(candidate.materializationBasis) ||
    !isAttemptRef(candidate.attemptRef) ||
    candidate.learningEvidenceRefs.some((ref) => !isEvidenceRef(ref)) ||
    candidate.learningNonAssessmentRefs.some((ref) => !isNonAssessmentRef(ref))
  ) {
    return { ok: false };
  }
  const graph =
    isRecord(candidate.attemptBody) &&
    isRecord(candidate.attemptBody.attemptSurface) &&
    candidate.attemptBody.attemptSurface.kind === "episode_graph_node";
  if (
    (graph && candidate.materializationBasis.kind !== "graph_attempt_body") ||
    (!graph && candidate.materializationBasis.kind === "graph_attempt_body") ||
    (candidate.materializationBasis.kind === "graph_attempt_body" &&
      !sameAttempt(
        candidate.materializationBasis.sourceAttempt,
        candidate.attemptRef!,
      ))
  )
    return { ok: false };
  const refs = [
    ...candidate.learningEvidenceRefs,
    ...candidate.learningNonAssessmentRefs,
  ];
  if (
    refs.some(
      (ref) => !sameAttempt(ref.sourceAttempt, candidate.attemptRef!),
    ) ||
    new Set(refs.map((ref) => ref.tupleKey)).size !== refs.length
  )
    return { ok: false };
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
  if (
    input.learningEvidenceRefs.some((ref) => !isEvidenceRef(ref)) ||
    input.learningNonAssessmentRefs.some((ref) => !isNonAssessmentRef(ref)) ||
    !isBasis(input.materializationBasis)
  )
    throw new Error("attempt_event_materialization_ref_invalid");
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
