import {
  classifyLearningEvidence,
  isOutsideWindowNonAssessment,
} from "../modules/learning-v2/progress/learning_evidence_policy";

describe("Learning V2 evidence policy", () => {
  it("fails closed on contradictory evidence branches", () => {
    expect(() =>
      classifyLearningEvidence({ technicalFailure: true, uncertain: true }),
    ).toThrow("learning_evidence_input_conflict");
  });

  it("does not convert technical or uncertain outcomes into learning evidence", () => {
    expect(classifyLearningEvidence({ technicalFailure: true })).toEqual({
      kind: "retry",
      reason: "technical_failure",
    });
    expect(classifyLearningEvidence({ uncertain: true })).toEqual({
      kind: "retry",
      reason: "uncertain",
    });
  });

  it("recognises only the pinned outside-window reason", () => {
    const body = {
      assessmentStatus: "not_assessed_for_window",
      reasonCode: "outside_pinned_assessment_window",
    } as any;
    expect(isOutsideWindowNonAssessment(body)).toBe(true);
    expect(
      isOutsideWindowNonAssessment({ ...body, reasonCode: "outside_window" }),
    ).toBe(false);
  });
});
