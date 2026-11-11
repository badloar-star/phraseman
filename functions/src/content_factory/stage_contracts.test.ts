import { createGenerationStageUnit, type GenerationStageKind } from './stage_contracts';

describe('versioned content generation stages', () => {

  it('rejects invalid counts and unversioned contracts', () => {
    expect(() => createGenerationStageUnit({ requestId: 'r', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1', schemaVersion: 0, promptVersion: '', count: 0, prerequisiteArtifactIds: [], qaPolicy: '', revision: 0 })).toThrow('generation_stage_invalid');
  });
});
