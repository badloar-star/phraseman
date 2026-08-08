import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { getPersonalPlanListenBuildItems, validatePersonalPlanListenBuildItem } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems, validatePersonalPlanMissingWordItemQuality } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';

const GENERATED_LESSON_IDS = [
  'voyazh_d001_content_unit',
  'voyazh_d005_content_unit',
  'mitap_d005_content_unit',
  'mitap_d006_content_unit',
  'mitap_d007_content_unit',
  'mitap_d008_content_unit',
  'mitap_d009_content_unit',
  'mitap_d010_content_unit',
  'mitap_d011_content_unit',
  'gavan_d005_content_unit',
  'gavan_d006_content_unit',
  'gavan_d007_content_unit',
  'gavan_d008_content_unit',
  'gavan_d009_content_unit',
  'gavan_d010_content_unit',
  'gavan_d011_content_unit',
  'impuls_d005_content_unit',
  'impuls_d006_content_unit',
  'impuls_d007_content_unit',
  'impuls_d008_content_unit',
  'impuls_d009_content_unit',
  'impuls_d010_content_unit',
  'impuls_d011_content_unit',
  'echo_d005_content_unit',
  'echo_d006_content_unit',
  'voyazh_d006_content_unit',
  'voyazh_d007_content_unit',
  'voyazh_d008_content_unit',
  'voyazh_d009_content_unit',
  'voyazh_d010_content_unit',
  'voyazh_d011_content_unit',
  'echo_d007_content_unit',
  'echo_d008_content_unit',
  'echo_d009_content_unit',
  'echo_d010_content_unit',
  'echo_d011_content_unit',
];

function startsWithAnswerOrder(targetWords: string[], wordOptions: string[]): boolean {
  return targetWords.every((word, index) => wordOptions[index] === word);
}

describe('generated personal plan option ordering', () => {
  it('does not put the correct answer first in generated choice modes', () => {
    for (const lessonId of GENERATED_LESSON_IDS) {
      const lesson = getPersonalPlanPhraseLesson(lessonId);
      expect(lesson).not.toBeNull();
      const contentUnitIds = lesson?.phrases.map((phrase) => String(phrase.id)) ?? [];

      const missingWordItems = getPersonalPlanMissingWordItems({ lessonId, contentUnitIds });
      const chooseItems = getPersonalPlanChooseNaturalPhraseItems({ lessonId, contentUnitIds });
      const listenChooseItems = getPersonalPlanListenChooseItems({ lessonId, contentUnitIds });

      // The generator intentionally drops a phrase when it cannot produce at
      // least three unambiguous options; every emitted item must still be safe.
      expect(missingWordItems.length).toBeGreaterThan(0);
      expect(missingWordItems.length).toBeLessThanOrEqual(contentUnitIds.length);
      expect(chooseItems).toHaveLength(contentUnitIds.length);
      expect(listenChooseItems).toHaveLength(contentUnitIds.length);
      expect(validatePersonalPlanMissingWordItemQuality(missingWordItems)).toEqual([]);
      expect(missingWordItems.every((item) => item.options[0] !== item.correctAnswer)).toBe(true);
      expect(chooseItems.every((item) => item.options[0] !== item.correctAnswer)).toBe(true);
      expect(listenChooseItems.every((item) => item.options[0] !== item.correctAnswer)).toBe(true);
    }
  });

  it('does not show listen-build word banks in the final answer order', () => {
    for (const lessonId of GENERATED_LESSON_IDS) {
      const lesson = getPersonalPlanPhraseLesson(lessonId);
      expect(lesson).not.toBeNull();
      const contentUnitIds = lesson?.phrases.map((phrase) => String(phrase.id)) ?? [];
      const items = getPersonalPlanListenBuildItems({ lessonId, contentUnitIds });

      expect(items).toHaveLength(contentUnitIds.length);
      for (const item of items) {
        expect(validatePersonalPlanListenBuildItem(item)).toEqual([]);
        expect(startsWithAnswerOrder(item.targetWords, item.wordOptions)).toBe(false);
      }
    }
  });

});
