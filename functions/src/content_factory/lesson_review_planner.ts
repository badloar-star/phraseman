import { approveLessonLedger, rollbackLessonLedger, type LessonLedger } from './dedupe_ledger';
import type { LessonCandidate } from './lesson_extractors';

export function planLessonPhraseLedgerReview(input: { readonly status: 'approved' | 'rejected'; readonly ledger: LessonLedger; readonly lessonId: number; readonly phraseArtifactId: string; readonly candidates: readonly LessonCandidate[] }) {
  if (input.status === 'rejected') {
    const staleLessonIds = Object.freeze(Object.keys(input.ledger.lessons).map(Number).filter((id) => id >= input.lessonId).sort((a, b) => a - b));
    return Object.freeze({ ledger: rollbackLessonLedger(input.ledger, input.lessonId), staleLessonIds });
  }
  const previousEntry = input.ledger.lessons[input.lessonId];
  const approved = approveLessonLedger(input.ledger, { lessonId: input.lessonId, phraseArtifactId: input.phraseArtifactId, candidates: input.candidates });
  const staleLessonIds = previousEntry && previousEntry.phraseArtifactId !== input.phraseArtifactId ? Object.freeze([input.lessonId, ...approved.staleLessonIds]) : approved.staleLessonIds;
  return Object.freeze({ ledger: approved.ledger, staleLessonIds });
}
