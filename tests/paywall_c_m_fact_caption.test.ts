import { paywallCFactCaption } from '../components/paywall/paywall_c_fact_caption';

const person = {
  lessonsDone: 7,
  streakDays: 4,
  phrasesLearned: 120,
  activeDays: 8,
} as const;

describe('paywall C retained M facts', () => {
  test.each(['general', 'energy', 'streak', 'lock', 'refused'] as const)(
    'does not attach unrelated M copy to a %s context',
    (kind) => {
      expect(paywallCFactCaption(true, kind, 'en', person, {})).toBeUndefined();
    },
  );

  test('retains complete first-dialog facts and correction', () => {
    expect(paywallCFactCaption(true, 'dialog', 'en', person, {
      dialogMinutes: 12,
      dialogPhrases: 18,
      correctionWas: 'I go yesterday',
      correctionNow: 'I went yesterday',
    })).toContain('12');
    expect(paywallCFactCaption(true, 'dialog', 'en', person, {
      correctionWas: 'I go yesterday',
      correctionNow: 'I went yesterday',
    })).toBe('I go yesterday → I went yesterday');
  });

  test('retains complete workshop facts and rejects incomplete facts', () => {
    expect(paywallCFactCaption(true, 'workshop', 'en', person, {
      lockedLesson: 9,
      workshopPhrases: 24,
    })).toContain('24');
    expect(paywallCFactCaption(true, 'workshop', 'en', person, {
      lockedLesson: 9,
    })).toBeUndefined();
    expect(paywallCFactCaption(false, 'dialog', 'en', person, {
      dialogMinutes: 12,
      dialogPhrases: 18,
    })).toBeUndefined();
  });
});
