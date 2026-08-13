import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';

/**
 * Integration guard for the authored-content runtime path.
 *
 * The catalog/navigation request content units positionally as
 * `${lessonId}_phrase_${N}` and the exercise item builders filter lesson phrases by
 * those exact ids. Authored content (plan_content_mitap etc.) uses internal phrase ids
 * (mitap_d1_p1) that would NOT match — so buildGeneratedPlanPhraseLesson must re-key
 * authored phrases to the positional scheme. If it doesn't, every exercise task shows
 * "задание не открылось". Unit tests miss this because it's a cross-module id contract;
 * this test locks it.
 *
 * 2026-06-10: re-pointed from voyazh to mitap — the old voyazh authored content was
 * deleted by owner decision (full rewrite under the new concept in Ф4). The contract
 * itself is plan-agnostic; it just needs ANY registered authored day to exercise it.
 */

const MITAP_DAY1_LESSON = 'mitap_d001_content_unit';
const requestedIds = (count: number) =>
  Array.from({ length: count }, (_, i) => `${MITAP_DAY1_LESSON}_phrase_${i + 1}`);

describe('authored plan content runtime integration', () => {
  it('serves the authored content for mitap day 1', () => {
    const lesson = getPersonalPlanPhraseLesson(MITAP_DAY1_LESSON);
    expect(lesson).not.toBeNull();
    // authored content actually present
    expect(lesson!.phrases.map((p) => p.english)).toContain('The next steps are clear.');
  });

  it('re-keys authored phrase ids to the positional content-unit scheme', () => {
    const lesson = getPersonalPlanPhraseLesson(MITAP_DAY1_LESSON)!;
    lesson.phrases.forEach((phrase, index) => {
      expect(String(phrase.id)).toBe(`${MITAP_DAY1_LESSON}_phrase_${index + 1}`);
    });
  });

  it('builds missing-word items for the requested content units (not zero)', () => {
    const items = getPersonalPlanMissingWordItems({
      lessonId: MITAP_DAY1_LESSON,
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
      lessonId: MITAP_DAY1_LESSON,
      contentUnitIds: requestedIds(5),
    });
    expect(items.length).toBe(5);
  });
});
