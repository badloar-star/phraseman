import {
  validateLearningEvidenceBody,
  validateLearningNonAssessmentBody,
  type LearningEvidenceBody,
  type LearningNonAssessmentBody,
} from "../contracts/evidence";

export type EvidencePolicyDecision =
  | { readonly kind: "assessed"; readonly body: LearningEvidenceBody }
  | {
      readonly kind: "non_assessment";
      readonly body: LearningNonAssessmentBody;
    }
  | {
      readonly kind: "retry";
      readonly reason: "uncertain" | "invalid" | "technical_failure";
    };

export const performanceStarsDoNotImplyMastery = (): false => false;

export const classifyLearningEvidence = (input: {
  readonly body?: LearningEvidenceBody;
  readonly nonAssessment?: LearningNonAssessmentBody;
  readonly technicalFailure?: boolean;
  readonly uncertain?: boolean;
  readonly invalid?: boolean;
}): EvidencePolicyDecision => {
  if (
    Number(Boolean(input.body)) +
      Number(Boolean(input.nonAssessment)) +
      Number(Boolean(input.technicalFailure)) +
      Number(Boolean(input.uncertain)) +
      Number(Boolean(input.invalid)) >
    1
  ) {
    throw new Error("learning_evidence_input_conflict");
  }
  if (input.technicalFailure)
    return { kind: "retry", reason: "technical_failure" };
  if (input.uncertain) return { kind: "retry", reason: "uncertain" };
  if (input.invalid) return { kind: "retry", reason: "invalid" };
  if (input.body) {
    if (!validateLearningEvidenceBody(input.body).ok)
      throw new Error("learning_evidence_body_invalid");
    return { kind: "assessed", body: input.body };
  }
  if (input.nonAssessment) {
    if (!validateLearningNonAssessmentBody(input.nonAssessment).ok)
      throw new Error("learning_non_assessment_body_invalid");
    return { kind: "non_assessment", body: input.nonAssessment };
  }
  throw new Error("learning_evidence_input_invalid");
};

export const isOutsideWindowNonAssessment = (
  body: LearningNonAssessmentBody,
): boolean =>
  body.assessmentStatus === "not_assessed_for_window" &&
  body.reasonCode === "outside_pinned_assessment_window";
