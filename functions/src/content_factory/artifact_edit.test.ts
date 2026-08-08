import { parseArtifactEditRequest, prepareArtifactEdit } from './artifact_edit';

const stage = { stageId: 'req:challenge_questions:topic-1:r1', requestId: 'req', kind: 'challenge_questions' as const, scopeId: 'topic-1', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', count: 10, revision: 1, artifactId: 'artifact:req:challenge_questions:topic-1:r1' };
const item = (index: number) => ({ id: `q${index}`, prompt: `Question ${index}?`, choices: ['A', 'B', 'C', 'D'], correctIndex: 0, optionExplanations: ['a', 'b', 'c', 'd'], difficulty: index < 4 ? 'easy' : index < 8 ? 'medium' : 'hard', skillTag: 'travel', sourcePhraseIds: ['p1'] });
const baseArtifact = { stage: 'challenge_questions', items: Array.from({ length: 10 }, (_, index) => item(index)) };

describe('immutable artifact edit contract', () => {
  test('parses a bounded exact-base edit request', () => {
    const result = parseArtifactEditRequest({ baseStageId: stage.stageId, expectedBaseReviewFingerprint: 'a'.repeat(64), idempotencyKey: 'edit-1', reason: 'Fix an incorrect distractor', artifact: baseArtifact });
    expect(result).toMatchObject({ baseStageId: stage.stageId, idempotencyKey: 'edit-1' });
    expect(() => parseArtifactEditRequest({ ...result, reason: 'bad', serverField: true })).toThrow('artifact_edit_invalid');
  });

  test('creates a new revision identity and semantic diff without mutating the base', () => {
    const candidate = structuredClone(baseArtifact);
    candidate.items[0].prompt = 'Corrected question?';
    const prepared = prepareArtifactEdit(stage, baseArtifact, candidate, 'edit-1');
    expect(prepared).toMatchObject({ baseStageId: stage.stageId, newStageId: 'req:challenge_questions:topic-1:r2', newArtifactId: 'artifact:req:challenge_questions:topic-1:r2', revision: 2 });
    expect(prepared.objectPath).toMatch(/^content-factory-stages\/[a-f0-9]{64}\/r2\/a1-[a-f0-9]{64}\.json$/);
    expect(prepared.diff.summary.changed).toBeGreaterThan(0);
    expect(baseArtifact.items[0].prompt).toBe('Question 0?');
  });

  test('rejects invalid answer index, changed count, identity and unapproved source references', () => {
    const invalidIndex = structuredClone(baseArtifact); invalidIndex.items[0].correctIndex = 9;
    expect(() => prepareArtifactEdit(stage, baseArtifact, invalidIndex, 'edit-1')).toThrow('artifact_edit_validation_failed:question_correct_index_invalid');
    expect(() => prepareArtifactEdit(stage, baseArtifact, { ...baseArtifact, items: baseArtifact.items.slice(1) }, 'edit-1')).toThrow('artifact_edit_item_identity_changed');
    const invalidRef = structuredClone(baseArtifact); invalidRef.items[0].sourcePhraseIds = ['unapproved'];
    expect(() => prepareArtifactEdit(stage, baseArtifact, invalidRef, 'edit-1')).toThrow('artifact_edit_reference_not_approved');
    expect(() => prepareArtifactEdit(stage, baseArtifact, { ...baseArtifact, stage: 'flashcard_items' }, 'edit-1')).toThrow('artifact_edit_stage_identity_changed');
  });

  test('rejects no-op edits', () => {
    expect(() => prepareArtifactEdit(stage, baseArtifact, structuredClone(baseArtifact), 'edit-1')).toThrow('artifact_edit_no_changes');
  });

  test('fails closed for a stage kind outside the active catalog', () => {
    const retiredStage = {
      ...stage,
      kind: 'retired_surface',
      stageId: 'req:retired_surface:topic-1:r1',
    } as any;
    const retiredArtifact = { stage: 'retired_surface', items: [] };
    expect(() => prepareArtifactEdit(retiredStage, retiredArtifact, { ...retiredArtifact, note: 'changed' }, 'edit-1'))
      .toThrow('artifact_edit_kind_unsupported');
  });
});
