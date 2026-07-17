import { planLessonPhraseLedgerReview } from './lesson_review_planner';
import type { LessonLedger } from './dedupe_ledger';

describe('lesson phrase approval and rollback planner', () => {
  const ledger: LessonLedger = { studyTarget: 'en', revision: 2, lessons: { 1: { phraseArtifactId: 'old-1', candidateKeys: ['word\u0000book'], fingerprint: 'a'.repeat(64) }, 2: { phraseArtifactId: 'old-2', candidateKeys: ['word\u0000train'], fingerprint: 'b'.repeat(64) } } };
  const candidates = [{ lemma: 'travel', surface: 'travel', partOfSpeech: 'word' as const, sourcePhraseIds: ['p1'] }];

  it('invalidates current and later lesson scopes when a phrase revision changes', () => {
    const result = planLessonPhraseLedgerReview({ status: 'approved', ledger, lessonId: 1, phraseArtifactId: 'new-1', candidates });
    expect(result.staleLessonIds).toEqual([1, 2]);
    expect(result.ledger.lessons[2]?.state).toBe('stale');
  });

  it('rolls back the current entry and invalidates all following lessons', () => {
    const result = planLessonPhraseLedgerReview({ status: 'rejected', ledger, lessonId: 1, phraseArtifactId: 'old-1', candidates: [] });
    expect(result.staleLessonIds).toEqual([1, 2]);
    expect(result.ledger.lessons[1]).toBeUndefined();
    expect(result.ledger.lessons[2]?.state).toBe('stale');
  });
});
