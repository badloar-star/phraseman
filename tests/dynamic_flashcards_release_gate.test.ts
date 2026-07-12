import { SYSTEM_CARDS } from '../app/flashcards/system-cards';
import {
  __resetCourseReleaseFlashcardRuntimeForTests,
  primeCourseReleaseFlashcardsFromBundle,
} from '../app/language_runtime/course_release_flashcard_loader';
import { flashcardsSystemCardsForTarget } from '../app/flashcards_target_gate';

const hash = 'a'.repeat(64);

describe('dynamic release flashcard gate', () => {
  afterEach(() => __resetCourseReleaseFlashcardRuntimeForTests());

  it('never substitutes English system cards for a dynamic study target', () => {
    expect(flashcardsSystemCardsForTarget(SYSTEM_CARDS, 'de', 'ru')).toEqual([]);
  });

  it('shows only cards bound to the active target/source release', () => {
    primeCourseReleaseFlashcardsFromBundle({
      releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'flashcard',
      entries: [{ lessonId: 1, contentHash: hash, payload: { lessonId: 1, surface: 'flashcard', items: [{ id: 'c1', front: 'Guten Tag', back: 'Добрый день' }] } }],
    });
    const cards = flashcardsSystemCardsForTarget(SYSTEM_CARDS, 'de', 'ru');
    expect(cards).toEqual([expect.objectContaining({ en: 'Guten Tag', ru: 'Добрый день' })]);
    expect(flashcardsSystemCardsForTarget(SYSTEM_CARDS, 'de', 'uk')).toEqual([]);
  });
});
