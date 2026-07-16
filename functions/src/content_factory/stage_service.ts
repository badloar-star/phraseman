import { createGenerationStageUnit, type GenerationStageKind, type GenerationStageUnit } from './stage_contracts';
import { assertStageCapabilityRequest, stageCapability } from './stage_capabilities';

export interface ApprovedStagePrerequisite {
  readonly kind: GenerationStageKind;
  readonly artifactId: string;
  readonly state: 'needs_review' | 'approved' | 'rejected' | 'superseded';
}

export interface GenerationStagePlan {
  readonly unit: GenerationStageUnit;
  readonly prerequisiteKinds: readonly GenerationStageKind[];
}

export function requiredPrerequisiteKinds(kind: GenerationStageKind): readonly GenerationStageKind[] {
  return stageCapability(kind).prerequisiteKinds;
}

export function buildGenerationStagePlan(input: {
  requestId: string;
  kind: GenerationStageKind;
  studyTarget: string;
  sourceLocale: string;
  cefr: string;
  scopeId: string;
  schemaVersion: number;
  promptVersion: string;
  count: number;
  qaPolicy: string;
  revision: number;
  approvedPrerequisites: readonly ApprovedStagePrerequisite[];
}): GenerationStagePlan {
  const { approvedPrerequisites, ...stageInput } = input;
  const prerequisiteKinds = requiredPrerequisiteKinds(input.kind);
  assertStageCapabilityRequest({ kind: input.kind, count: input.count, cefr: input.cefr, studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, prerequisiteKinds });
  const prerequisiteArtifactIds = prerequisiteKinds.map((kind) => {
    const match = approvedPrerequisites.find((candidate) => candidate.kind === kind);
    if (!match) throw new Error(`generation_stage_prerequisite_missing:${kind}`);
    if (match.state !== 'approved') throw new Error(`generation_stage_prerequisite_unapproved:${kind}`);
    return match.artifactId;
  });
  const { cefr: _cefr, ...unitInput } = stageInput;
  const unit = createGenerationStageUnit({ ...unitInput, prerequisiteArtifactIds });
  return Object.freeze({ unit, prerequisiteKinds: Object.freeze([...prerequisiteKinds]) });
}
