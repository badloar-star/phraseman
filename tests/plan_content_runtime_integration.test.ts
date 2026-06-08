import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';

/**
 * Integration guard for the authored-content runtime path.
 *
 * The catalog/navigation request content units positionally as
 * `${lessonId}_phrase_${N}` and the exercise item builders filter lesson phrases by
 * those exact ids. Authored content (plan_content_voyazh etc.) uses internal phrase ids
 * (voyazh_d1_p1) that would NOT match — so buildGeneratedPlanPhraseLesson must re-key
 * authored phrases to the positional scheme. If it doesn't, every exercise task shows
 * "задание не открылось". Unit tests miss this because it's a cross-module id contract;
 * this test locks it.
 */

const VOYAZH_DAY1_LESSON = 'voyazh_d001_content_unit';
const requestedIds = (count: number) =>
  Array.from({ length: count }, (_, i) => `${VOYAZH_DAY1_LESSON}_phrase_${i + 1}`);

describe('authored plan content runtime integration', () => {
  it('serves the authored etalon for voyazh day 1', () => {
    const lesson = getPersonalPlanPhraseLesson(VOYAZH_DAY1_LESSON);
    expect(lesson).not.toBeNull();
    // etalon content actually present
    expect(lesson!.phrases.map((p) => p.english)).toContain("I'm lost.");
  });

  it('re-keys authored phrase ids to the positional content-unit scheme', () => {
    const lesson = getPersonalPlanPhraseLesson(VOYAZH_DAY1_LESSON)!;
    lesson.phrases.forEach((phrase, index) => {
      expect(String(phrase.id)).toBe(`${VOYAZH_DAY1_LESSON}_phrase_${index + 1}`);
    });
  });

  it('builds missing-word items for the requested content units (not zero)', () => {
    const items = getPersonalPlanMissingWordItems({
      lessonId: VOYAZH_DAY1_LESSON,
      contentUnitIds: requestedIds(5),
    });
    expect(items.length).toBe(5);
    // each item carries authored distractors (not empty)
    for (const item of items) {
      expect(item.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('builds choose-natural items for the requested content units (not zero)', () => {
    const items = getPersonalPlanChooseNaturalPhraseItems({
      lessonId: VOYAZH_DAY1_LESSON,
      contentUnitIds: requestedIds(5),
    });
    expect(items.length).toBe(5);
  });
});
