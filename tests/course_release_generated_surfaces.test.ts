import {
  quizRowsFromCourseSurfaceBundle,
  selectCourseReleaseQuizRows,
} from '../app/language_runtime/course_release_quiz_runtime';
import { flashcardRowsFromCourseSurfaceBundle } from '../app/language_runtime/course_release_flashcard_runtime';
import {
  __resetCourseReleaseQuizRuntimeForTests,
  primeCourseReleaseQuizRowsFromBundle,
} from '../app/language_runtime/course_release_quiz_loader';
import { getQuizPhrasesLoaded } from '../app/quiz_phrases_loader';

const hash = 'a'.repeat(64);

function bundle(surface: 'quiz' | 'flashcard') {
  return {
    releaseId: 'de-ru-r1',
    studyTarget: 'de',
    learnerSourceLocale: 'ru',
    surface,
    entries: [
      {
        lessonId: 1,
        contentHash: hash,
        payload: surface === 'quiz'
          ? { lessonId: 1, surface, items: [{ id: 'q1', prompt: 'Как сказать «Я готов»?', answer: 'Ich bin bereit', options: ['Ich bin bereit', 'Du bist bereit'] }] }
          : { lessonId: 1, surface, items: [{ id: 'c1', front: 'Ich bin bereit', back: 'Я готов' }] },
      },
    ],
  } as any;
}

describe('generated course release surface adapters', () => {
  afterEach(() => __resetCourseReleaseQuizRuntimeForTests());

  it('maps quiz questions to the existing playable quiz model', () => {
    const rows = quizRowsFromCourseSurfaceBundle(bundle('quiz'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sourceText: 'Как сказать «Я готов»?', answer: 'Ich bin bereit', correct: 0, lessonNum: 1, level: 'A1', questionId: 'de-ru-r1:q1' });
    expect(selectCourseReleaseQuizRows(rows, 'easy', 10, () => 0)).toHaveLength(1);
    expect(selectCourseReleaseQuizRows(rows, 'hard', 10, () => 0)).toEqual([]);
  });

  it('maps flashcards with target on the front and learner language on the back', () => {
    expect(flashcardRowsFromCourseSurfaceBundle(bundle('flashcard'))).toEqual([
      expect.objectContaining({ id: 'de-ru-r1:c1', en: 'Ich bin bereit', ru: 'Я готов', uk: '', isSystem: true, sourceId: 'RELEASE:de-ru-r1:1' }),
    ]);
  });

  it('rejects malformed options instead of publishing an unplayable quiz', () => {
    const malformed = bundle('quiz');
    (malformed.entries[0].payload as any).items[0].options = ['Du bist bereit', 'Er ist bereit'];
    expect(() => quizRowsFromCourseSurfaceBundle(malformed)).toThrow('course_release_quiz_invalid');
  });

  it('feeds the existing quiz screen loader without an English fallback', () => {
    primeCourseReleaseQuizRowsFromBundle(bundle('quiz'));
    expect(getQuizPhrasesLoaded('easy', 10, 'ru', 'de')).toEqual([
      expect.objectContaining({ answer: 'Ich bin bereit', sourceText: 'Как сказать «Я готов»?', quizItemType: 'course_release' }),
    ]);
    expect(getQuizPhrasesLoaded('easy', 10, 'uk', 'de')).toEqual([]);
  });
});
