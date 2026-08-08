import {
  buildSessionWordBank,
  buildTrainerSessionDeck,
  isMeaningfulBankToken,
  normalizeGapToken,
  sessionMeaningfulTokens,
  trainerGapTokenIndex,
  trainerSessionPhrase,
} from '../app/trainer_practice_hall';
import type { TrainerItem } from '../app/trainer_store';

function phraseItem(key: string, errorWord?: string): TrainerItem {
  return {
    key,
    queue: 'phrases',
    translationRu: 'ru',
    translationUk: 'uk',
    errorWord,
    lessonId: 1,
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: 1,
    createdAt: 1,
    archived: false,
  };
}

describe('trainer phrase session helpers', () => {
  it('keeps phrase items and their error word unchanged', () => {
    expect(trainerSessionPhrase(phraseItem('I have been there', 'have')))
      .toEqual({ phrase: 'I have been there', errorWord: 'have' });
  });

  it('uses fill-gap only when the error word exists in the phrase', () => {
    expect(buildTrainerSessionDeck([phraseItem('I have been there', 'have')])[0]?.mode).toBe('fill_gap');
    expect(buildTrainerSessionDeck([phraseItem('I like coffee', 'went')])[0]?.mode).toBe('word_bank');
  });

  it('keeps meaningful tokens, hyphens and apostrophes intact', () => {
    const phrase = "My mother-in-law doesn't stop";
    const tokens = sessionMeaningfulTokens(phrase);
    expect(tokens).toContain('mother-in-law');
    expect(tokens.some((token) => token.toLowerCase() === "doesn't")).toBe(true);
    expect(buildSessionWordBank(phrase).every((tile) => isMeaningfulBankToken(tile.text))).toBe(true);
  });

  it('normalizes edge punctuation and locates gap tokens', () => {
    expect(normalizeGapToken('(went!)')).toBe('went');
    expect(normalizeGapToken("don't")).toBe("don't");
    expect(trainerGapTokenIndex('She went, then left', 'went')).toBe(1);
    expect(trainerGapTokenIndex('She went home', 'missing')).toBe(-1);
  });
});
