import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { phraseCanonicalAnswer } from '../app/phrase_target_utils';

describe('Impuls day 36 phrase integrity', () => {
  it('offers every word required by "I make coffee every morning"', () => {
    const lesson = getPersonalPlanPhraseLesson('impuls_d036_content_unit');
    const phrase = lesson?.phrases.find((row) => row.id === 'impuls_d036_content_unit_phrase_2');
    expect(phrase).toBeDefined();
    expect(phrase!.words.map((word) => word.correct ?? word.text)).toEqual([
      'I', 'make', 'coffee', 'every', 'morning',
    ]);
    expect(phraseCanonicalAnswer(phrase!, 'en')).toBe('I make coffee every morning');
  });
});
