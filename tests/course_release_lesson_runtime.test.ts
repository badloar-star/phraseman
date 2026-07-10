import { lessonRowsFromCourseReleasePayload } from '../app/language_runtime/course_release_lesson_runtime';

const payload = {
  lessonId: 1,
  phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `Phrase ${index}`, targetText: `Je suis pret ${index}.` })),
  vocabulary: [{ lemma: 'ready', partOfSpeech: 'adjective', targetText: 'pret' }],
  drills: [],
};

describe('canonical release lesson adapter', () => {
  it('maps a generic target into playable lesson rows without losing source locale', () => {
    const rows = lessonRowsFromCourseReleasePayload(payload, { studyTarget: 'fr', learnerSourceLocale: 'ru', lessonId: 1 });
    expect(rows).toHaveLength(50);
    expect(rows[0]).toMatchObject({ id: 'p-0', english: 'Je suis pret 0.', russian: 'Phrase 0', french: 'Je suis pret 0.' });
    expect(rows[0].wordsFr?.map((word) => word.correct).join(' ')).toContain('Je suis pret 0');
  });

  it('rejects incomplete or cross-lesson payloads instead of falling back to English', () => {
    expect(() => lessonRowsFromCourseReleasePayload({ ...payload, lessonId: 2 }, { studyTarget: 'fr', learnerSourceLocale: 'ru', lessonId: 1 })).toThrow('course_release_lesson_identity_mismatch');
    expect(() => lessonRowsFromCourseReleasePayload({ ...payload, phrases: payload.phrases.slice(0, 49) }, { studyTarget: 'de', learnerSourceLocale: 'ru', lessonId: 1 })).toThrow('course_release_lesson_invalid');
  });
});
