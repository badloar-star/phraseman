import { validateLessonStageArtifact } from './lesson_artifacts';

describe('lesson stage artifact contracts', () => {
  const phrase = (index: number) => ({
    id: `phrase-${index}`,
    sourceText: `Русская фраза ${index}`,
    targetText: `English phrase ${index}`,
    meaningKey: `meaning-${index}`,
    cefr: 'A2',
    coverageTag: index % 2 ? 'request' : 'response',
  });

  it('accepts a grounded outline with explicit coverage and exclusions', () => {
    expect(validateLessonStageArtifact({
      stage: 'lesson_outline',
      result: {
        lessonId: 20,
        objective: 'Ask for directions and understand the answer',
        cefr: 'A2',
        coverage: ['request', 'response'],
        exclusions: ['advanced navigation vocabulary'],
        blueprint: { lessonId: 20, registryId: 'english-core:v1', topic: 'Directions', sourceFocusUsed: ['turn left'] },
      },
    }, { kind: 'lesson_outline', count: 1, cefr: 'A2' })).toEqual([]);
  });

  it('requires exactly 50 unique, directionally distinct phrases', () => {
    const items = Array.from({ length: 50 }, (_, index) => phrase(index + 1));
    expect(validateLessonStageArtifact({ stage: 'lesson_phrases', items }, { kind: 'lesson_phrases', count: 50, cefr: 'A2' })).toEqual([]);

    items[49] = { ...items[0], id: 'phrase-50' };
    expect(validateLessonStageArtifact({ stage: 'lesson_phrases', items }, { kind: 'lesson_phrases', count: 50, cefr: 'A2' })).toEqual(expect.arrayContaining(['lesson_phrase_meaning_duplicate']));
  });

  it('rejects an outline that replaces the server-selected blueprint topic or invents its focus', () => {
    const grounding = { registryId: 'english-core-32:v1', blueprintLesson: { lessonId: 16, topic: 'Phrasal verbs', sourcePhrases: ['Turn back.'], vocabularyFocus: ['turn back'], drills: ['phrasal_verbs'] } };
    const artifact = { stage: 'lesson_outline', result: { lessonId: 16, objective: 'Directions', cefr: 'A2', coverage: ['route'], exclusions: [], blueprint: { lessonId: 16, registryId: 'english-core-32:v1', topic: 'Directions', sourceFocusUsed: ['turn left'] } } };
    expect(validateLessonStageArtifact(artifact, { kind: 'lesson_outline', count: 1, cefr: 'A2', grounding })).toEqual(expect.arrayContaining(['lesson_outline_blueprint_identity_mismatch', 'lesson_outline_blueprint_focus_unapproved']));
  });

  it('rejects wrong CEFR, empty coverage and source copied into target', () => {
    const items = Array.from({ length: 50 }, (_, index) => phrase(index + 1));
    items[0] = { ...items[0], targetText: items[0].sourceText, cefr: 'B2', coverageTag: '' };
    expect(validateLessonStageArtifact({ stage: 'lesson_phrases', items }, { kind: 'lesson_phrases', count: 50, cefr: 'A2' })).toEqual(expect.arrayContaining([
      'lesson_phrase_language_direction_invalid',
      'lesson_phrase_cefr_mismatch',
      'lesson_phrase_coverage_required',
    ]));
  });

  it('requires v3 phrase coverage and exclusion receipts to match the approved outline', () => {
    const items = Array.from({ length: 50 }, (_, index) => ({ ...phrase(index + 1), coverageTag: index % 2 ? 'request' : 'response' }));
    const grounding = { outline: { coverage: ['request', 'response'], exclusions: ['advanced geography'] } };
    expect(validateLessonStageArtifact({ stage: 'lesson_phrases', items, coverageReceipt: { coveredTags: ['request', 'response'], respectedExclusions: ['advanced geography'] } }, { kind: 'lesson_phrases', count: 50, cefr: 'A2', grounding, strictV3: true })).toEqual([]);
    items[0] = { ...items[0], coverageTag: 'unapproved-topic', targetText: 'Advanced geography is required.' };
    expect(validateLessonStageArtifact({ stage: 'lesson_phrases', items, coverageReceipt: { coveredTags: ['request'], respectedExclusions: [] } }, { kind: 'lesson_phrases', count: 50, cefr: 'A2', grounding, strictV3: true })).toEqual(expect.arrayContaining(['lesson_phrase_outline_coverage_mismatch', 'lesson_phrase_outline_receipt_mismatch', 'lesson_phrase_outline_exclusion_violated']));
  });
});
