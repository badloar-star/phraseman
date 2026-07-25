import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';

const GENERATED_CERTIFIED_LESSON_IDS = [
  'voyazh_d001_content_unit',
  'voyazh_d002_content_unit',
  'voyazh_d003_content_unit',
  'voyazh_d004_content_unit',
  'voyazh_d005_content_unit',
  'voyazh_d006_content_unit',
  'voyazh_d007_content_unit',
  'voyazh_d008_content_unit',
  'voyazh_d009_content_unit',
  'voyazh_d010_content_unit',
  'voyazh_d011_content_unit',
  'mitap_d001_content_unit',
  'mitap_d002_content_unit',
  'mitap_d003_content_unit',
  'mitap_d004_content_unit',
  'mitap_d005_content_unit',
  'mitap_d006_content_unit',
  'mitap_d007_content_unit',
  'mitap_d008_content_unit',
  'mitap_d009_content_unit',
  'mitap_d010_content_unit',
  'mitap_d011_content_unit',
  'gavan_d001_content_unit',
  'gavan_d002_content_unit',
  'gavan_d003_content_unit',
  'gavan_d004_content_unit',
  'gavan_d005_content_unit',
  'gavan_d006_content_unit',
  'gavan_d007_content_unit',
  'gavan_d008_content_unit',
  'gavan_d009_content_unit',
  'gavan_d010_content_unit',
  'gavan_d011_content_unit',
  'impuls_d001_content_unit',
  'impuls_d002_content_unit',
  'impuls_d003_content_unit',
  'impuls_d004_content_unit',
  'impuls_d005_content_unit',
  'impuls_d006_content_unit',
  'impuls_d007_content_unit',
  'impuls_d008_content_unit',
  'impuls_d009_content_unit',
  'impuls_d010_content_unit',
  'impuls_d011_content_unit',
  'echo_d001_content_unit',
  'echo_d002_content_unit',
  'echo_d003_content_unit',
  'echo_d004_content_unit',
  'echo_d005_content_unit',
  'echo_d006_content_unit',
  'echo_d007_content_unit',
  'echo_d008_content_unit',
  'echo_d009_content_unit',
  'echo_d010_content_unit',
  'echo_d011_content_unit',
];

function expectRussianExplanation(text: string) {
  expect(text).toMatch(/[А-Яа-яЁё]/);
  expect(text).not.toMatch(/\bmatches the day phrase\b/i);
  expect(text).not.toMatch(/\banother phrase from this plan day\b/i);
  expect(text).not.toMatch(/\bis a short practical phrase\b/i);
  expect(text).not.toMatch(/\bfocus on the whole message first\b/i);
  expect(text).not.toMatch(/\bfirst match the whole situation\b/i);
  expect(text).not.toMatch(/правильная фраза дня/i);
  expect(text).not.toMatch(/другая фраза из этого дня/i);
}

describe('personal plan generated feedback locale', () => {
  it('keeps generated lesson teaching notes in Russian for every certified generated day', () => {
    for (const lessonId of GENERATED_CERTIFIED_LESSON_IDS) {
      const lesson = getPersonalPlanPhraseLesson(lessonId);
      expect(lesson).not.toBeNull();

      for (const phrase of lesson?.phrases ?? []) {
        for (const word of phrase.words) {
          if (!word.teachingNote) continue;
          expectRussianExplanation(word.teachingNote.correctRu);
          expectRussianExplanation(word.teachingNote.wrongRu);
        }
      }
    }
  });
});
