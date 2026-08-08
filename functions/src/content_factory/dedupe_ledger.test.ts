import { approveLessonLedger, dedupeLessonCandidates, parseLessonLedger, rollbackLessonLedger, type LessonLedger } from './dedupe_ledger';

describe('cumulative lesson dedupe ledger', () => {
  const empty: LessonLedger = { studyTarget: 'en', revision: 0, lessons: {} };
  const candidate = (lemma: string, partOfSpeech: 'word' | 'preposition' = 'word') => ({ lemma, surface: lemma, partOfSpeech, sourcePhraseIds: ['p1'] as readonly string[] });

  it('deduplicates by lemma plus part of speech while retaining homonyms', () => {
    const first = approveLessonLedger(empty, { lessonId: 1, phraseArtifactId: 'a1', candidates: [candidate('book'), candidate('in', 'preposition')] });
    const receipt = dedupeLessonCandidates(first.ledger, { lessonId: 2, phraseArtifactId: 'a2', candidates: [candidate('book'), candidate('book', 'preposition'), candidate('train')] });
    expect(receipt.accepted).toEqual(expect.arrayContaining([expect.objectContaining({ lemma: 'book', partOfSpeech: 'preposition' }), expect.objectContaining({ lemma: 'train' })]));
    expect(receipt.excludedPrevious).toEqual([expect.objectContaining({ lemma: 'book', partOfSpeech: 'word', previousLessonId: 1 })]);
  });

  it('fails closed when any previous lesson is missing', () => {
    const ledger: LessonLedger = { studyTarget: 'en', revision: 1, lessons: { 1: { phraseArtifactId: 'a1', candidateKeys: ['word\u0000book'], fingerprint: 'a'.repeat(64) } } };
    expect(dedupeLessonCandidates(ledger, { lessonId: 3, phraseArtifactId: 'a3', candidates: [candidate('train')] })).toMatchObject({ state: 'review_required', missingPreviousLessonIds: [2] });
  });

  it('marks later lessons stale when an earlier lesson fingerprint changes and supports rollback', () => {
    const one = approveLessonLedger(empty, { lessonId: 1, phraseArtifactId: 'a1', candidates: [candidate('book')] });
    const two = approveLessonLedger(one.ledger, { lessonId: 2, phraseArtifactId: 'a2', candidates: [candidate('train')] });
    const regenerated = approveLessonLedger(two.ledger, { lessonId: 1, phraseArtifactId: 'a1-r2', candidates: [candidate('travel')] });
    expect(regenerated.staleLessonIds).toEqual([2]);
    expect(regenerated.ledger.lessons[2]?.state).toBe('stale');
    expect(rollbackLessonLedger(regenerated.ledger, 1).lessons[1]).toBeUndefined();
  });

  it('parses an absent ledger as empty but rejects corrupt persisted state', () => {
    expect(parseLessonLedger(undefined, 'en')).toEqual(empty);
    expect(() => parseLessonLedger({ studyTarget: 'fr', revision: 1, lessons: {} }, 'en')).toThrow('lesson_ledger_invalid');
  });
});
