import { IMPULS_DAY_34 } from '../app/plan_content_impuls';
import { contentDayToLessonPhrases } from '../app/plan_content_runtime_adapter';

const phraseTokens = (english: string): string[] =>
  english
    .replace(/[.?!,;]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

describe('Impuls day 34 phrase word alignment', () => {
  it('keeps every word from the canonical English phrase in the runtime lesson', () => {
    const runtimePhrases = contentDayToLessonPhrases(IMPULS_DAY_34);

    for (const phrase of runtimePhrases) {
      expect(phrase.words.map((word) => word.correct)).toEqual(phraseTokens(phrase.english));
      for (const word of phrase.words) {
        expect(word.distractors).toHaveLength(5);
        expect(word.distractors.map((distractor) => distractor.toLowerCase())).not.toContain(
          word.correct.toLowerCase(),
        );
      }
    }
  });
});
