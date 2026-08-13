import { contentDayToLessonPhrases } from '../app/plan_content_runtime_adapter';
import { listAuthoredPlanContentDays } from '../app/plan_content_registry';

function tokens(english: string): string[] {
  return english.replace(/[.?!,;]+/g, ' ').split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

describe('bundled plan-content runtime alignment', () => {
  it('renders every canonical English token with valid word-bank metadata', () => {
    for (const day of listAuthoredPlanContentDays()) {
      const runtimePhrases = contentDayToLessonPhrases(day);
      for (const [index, sourcePhrase] of day.phrases.entries()) {
        const runtimePhrase = runtimePhrases[index];
        expect(runtimePhrase.words.map((word) => word.correct)).toEqual(tokens(sourcePhrase.english));
        for (const word of runtimePhrase.words) {
          expect(word.distractors).toHaveLength(5);
          expect(word.distractors.map((item) => item.toLowerCase())).not.toContain(word.correct.toLowerCase());
        }
      }
    }
  });
});
