import {
  buildLearningEvidenceTupleKey,
  type LearningEvidenceTupleIdentity,
} from "./evidence";
import { hashCanonicalBody } from "../policies/decision_registry";

export type V2AttemptOutcome = {
  readonly resultCode:
    | "CORRECT"
    | "WRONG"
    | "COMPLETED"
    | "SKIPPED"
    | "PASS_CONFIDENT"
    | "NEEDS_WORK_CONFIDENT"
    | "UNCERTAIN"
    | "INVALID_AUDIO_OR_SYSTEM";
};
export interface V2AttemptEvidence {
  readonly hintsUsed: number;
}
export interface V2AttemptProvenance {
  readonly phase:
    | "encounter_build"
    | "near_transfer"
    | "independent_probe"
    | "delayed_probe";
}
export interface V2AttemptInputBinding {
  readonly source:
    | "keyboard"
    | "tap"
    | "word_bank"
    | "microphone"
    | "accessibility_alternative";
}
interface V2AttemptEventBodyBase {
  readonly schemaVersion: "v2-attempt-body.v1";
  readonly opId: string;
  readonly outcome: V2AttemptOutcome;
  readonly evidence: V2AttemptEvidence;
  readonly provenance: V2AttemptProvenance;
  readonly inputBinding: V2AttemptInputBinding;
}
export type V2AttemptEventBody =
  | (V2AttemptEventBodyBase & {
      readonly attemptSurface: { readonly kind: "episode_graph_node" };
      readonly learningTupleDispositions: readonly V2GraphTupleDisposition[];
    })
  | (V2AttemptEventBodyBase & {
      readonly attemptSurface: { readonly kind: "scheduled_delayed_probe" };
      readonly learningTupleDispositions: readonly V2GraphTupleDisposition[];
    });
export interface CanonicalAttemptRef {
  readonly schemaVersion: "v2-attempt-ref.v1";
  readonly opId: string;
  readonly attemptBodyHash: string;
}
export type V2GraphTupleDisposition = LearningEvidenceTupleIdentity & {
  readonly terminalDisposition:
    | "assessed_candidate"
    | "non_assessment_candidate"
    | "no_record";
  readonly reasonCode?: "skipped_by_learner";
};

const postHashAttemptBodyKeys = [
  "learningEvidenceRefs",
  "learningNonAssessmentRefs",
  "attemptBodyHash",
  "canonicalAttemptRef",
] as const;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOneOf = <T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] => typeof value === "string" && allowed.includes(value);

/**
 * Accepts only the hash-free canonical body.  Post-hash chain fields belong to
 * a later materialization envelope and are never silently removed here.
 */
export const sanitizeAttemptBody = (input: unknown): V2AttemptEventBody => {
  if (!isRecord(input)) throw new Error("attempt_body_invalid");
  if (
    postHashAttemptBodyKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(input, key),
    )
  ) {
    throw new Error("attempt_body_post_hash_field_forbidden");
  }

  const surface = input.attemptSurface;
  const outcome = input.outcome;
  const evidence = input.evidence;
  const provenance = input.provenance;
  const inputBinding = input.inputBinding;
  if (
    input.schemaVersion !== "v2-attempt-body.v1" ||
    typeof input.opId !== "string" ||
    !isRecord(surface) ||
    !hasOneOf(surface.kind, [
      "episode_graph_node",
      "scheduled_delayed_probe",
    ] as const) ||
    !isRecord(outcome) ||
    !hasOneOf(outcome.resultCode, [
      "CORRECT",
      "WRONG",
      "COMPLETED",
      "SKIPPED",
      "PASS_CONFIDENT",
      "NEEDS_WORK_CONFIDENT",
      "UNCERTAIN",
      "INVALID_AUDIO_OR_SYSTEM",
    ] as const) ||
    !isRecord(evidence) ||
    typeof evidence.hintsUsed !== "number" ||
    !isRecord(provenance) ||
    !hasOneOf(provenance.phase, [
      "encounter_build",
      "near_transfer",
      "independent_probe",
      "delayed_probe",
    ] as const) ||
    !isRecord(inputBinding) ||
    !hasOneOf(inputBinding.source, [
      "keyboard",
      "tap",
      "word_bank",
      "microphone",
      "accessibility_alternative",
    ] as const) ||
    !Array.isArray(input.learningTupleDispositions)
  ) {
    throw new Error("attempt_body_invalid");
  }
  return Object.freeze({ ...input }) as unknown as V2AttemptEventBody;
};

export const buildCanonicalAttemptRef = (
  body: V2AttemptEventBody,
): CanonicalAttemptRef => ({
  schemaVersion: "v2-attempt-ref.v1",
  opId: body.opId,
  attemptBodyHash: hashCanonicalBody(body),
});

/** Verifies that a ref is the exact canonical hash of a hash-free body. */
export const validateCanonicalAttemptRef = (
  body: unknown,
  ref: CanonicalAttemptRef,
): { readonly ok: boolean } => {
  try {
    const sanitized = sanitizeAttemptBody(body);
    return {
      ok:
        ref.schemaVersion === "v2-attempt-ref.v1" &&
        ref.opId === sanitized.opId &&
        ref.attemptBodyHash === hashCanonicalBody(sanitized),
    };
  } catch {
    return { ok: false };
  }
};

export const validateGraphTupleDispositions = (
  declarations: readonly LearningEvidenceTupleIdentity[],
  dispositions: readonly V2GraphTupleDisposition[],
  resultCode: string,
): { readonly ok: boolean } => {
  const expected = declarations.map(buildLearningEvidenceTupleKey).sort();
  const actual = dispositions.map(buildLearningEvidenceTupleKey).sort();
  const exact =
    expected.length === actual.length &&
    expected.every((key, index) => key === actual[index]);
  const skipped = resultCode === "SKIPPED";
  return {
    ok:
      exact &&
      dispositions.every((entry) =>
        skipped
          ? entry.terminalDisposition === "no_record" &&
            entry.reasonCode === "skipped_by_learner"
          : entry.terminalDisposition !== "no_record",
      ),
  };
};
