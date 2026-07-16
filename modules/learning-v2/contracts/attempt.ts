import {
  buildLearningEvidenceTupleKey,
  type LearningEvidenceTupleIdentity,
} from "./evidence";
import { hashCanonicalBody } from "../policies/decision_registry";

export type V2AttemptEventBody = Readonly<Record<string, unknown>>;
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

/** Removes post-hash chain members; the sanitizer never accepts an envelope. */
export const sanitizeAttemptBody = (
  input: Readonly<Record<string, unknown>>,
): V2AttemptEventBody => {
  const {
    learningEvidenceRefs: _evidence,
    learningNonAssessmentRefs: _nonAssessment,
    attemptBodyHash: _hash,
    canonicalAttemptRef: _ref,
    ...body
  } = input;
  return Object.freeze(body);
};

export const buildCanonicalAttemptRef = (
  body: V2AttemptEventBody,
): CanonicalAttemptRef => ({
  schemaVersion: "v2-attempt-ref.v1",
  opId: String(body.opId ?? ""),
  attemptBodyHash: hashCanonicalBody(body),
});

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
