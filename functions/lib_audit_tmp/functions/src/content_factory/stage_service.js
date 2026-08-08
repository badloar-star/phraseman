"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredPrerequisiteKinds = requiredPrerequisiteKinds;
exports.buildGenerationStagePlan = buildGenerationStagePlan;
const stage_contracts_1 = require("./stage_contracts");
const stage_capabilities_1 = require("./stage_capabilities");
function requiredPrerequisiteKinds(kind) {
    return (0, stage_capabilities_1.stageCapability)(kind).prerequisiteKinds;
}
function buildGenerationStagePlan(input) {
    const { approvedPrerequisites, ...stageInput } = input;
    const prerequisiteKinds = requiredPrerequisiteKinds(input.kind);
    (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind: input.kind, count: input.count, cefr: input.cefr, studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, prerequisiteKinds });
    const prerequisiteArtifactIds = prerequisiteKinds.map((kind) => {
        const match = approvedPrerequisites.find((candidate) => candidate.kind === kind);
        if (!match)
            throw new Error(`generation_stage_prerequisite_missing:${kind}`);
        if (match.state !== 'approved')
            throw new Error(`generation_stage_prerequisite_unapproved:${kind}`);
        return match.artifactId;
    });
    const { cefr: _cefr, ...unitInput } = stageInput;
    const unit = (0, stage_contracts_1.createGenerationStageUnit)({ ...unitInput, prerequisiteArtifactIds });
    return Object.freeze({ unit, prerequisiteKinds: Object.freeze([...prerequisiteKinds]) });
}
//# sourceMappingURL=stage_service.js.map