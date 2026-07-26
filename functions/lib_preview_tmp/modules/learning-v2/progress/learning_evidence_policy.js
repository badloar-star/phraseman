"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutsideWindowNonAssessment = exports.classifyLearningEvidence = exports.performanceStarsDoNotImplyMastery = void 0;
const evidence_1 = require("../contracts/evidence");
const performanceStarsDoNotImplyMastery = () => false;
exports.performanceStarsDoNotImplyMastery = performanceStarsDoNotImplyMastery;
const classifyLearningEvidence = (input) => {
    if (Number(Boolean(input.body)) +
        Number(Boolean(input.nonAssessment)) +
        Number(Boolean(input.technicalFailure)) +
        Number(Boolean(input.uncertain)) +
        Number(Boolean(input.invalid)) >
        1) {
        throw new Error("learning_evidence_input_conflict");
    }
    if (input.technicalFailure)
        return { kind: "retry", reason: "technical_failure" };
    if (input.uncertain)
        return { kind: "retry", reason: "uncertain" };
    if (input.invalid)
        return { kind: "retry", reason: "invalid" };
    if (input.body) {
        if (!(0, evidence_1.validateLearningEvidenceBody)(input.body).ok)
            throw new Error("learning_evidence_body_invalid");
        return { kind: "assessed", body: input.body };
    }
    if (input.nonAssessment) {
        if (!(0, evidence_1.validateLearningNonAssessmentBody)(input.nonAssessment).ok)
            throw new Error("learning_non_assessment_body_invalid");
        return { kind: "non_assessment", body: input.nonAssessment };
    }
    throw new Error("learning_evidence_input_invalid");
};
exports.classifyLearningEvidence = classifyLearningEvidence;
const isOutsideWindowNonAssessment = (body) => body.assessmentStatus === "not_assessed_for_window" &&
    body.reasonCode === "outside_pinned_assessment_window";
exports.isOutsideWindowNonAssessment = isOutsideWindowNonAssessment;
//# sourceMappingURL=learning_evidence_policy.js.map