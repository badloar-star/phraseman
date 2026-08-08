import { cardIdFromMemoryKey, worstStatus } from '../app/flashcards/cardStatus';

describe('flashcard status key audit', () => {
  it('reduces composite storage keys to the card id', () => {
    expect(cardIdFromMemoryKey('saved:all:abc123')).toBe('abc123');
    expect(cardIdFromMemoryKey('custom:all:xyz')).toBe('xyz');
    expect(cardIdFromMemoryKey('pack:movies:card_7')).toBe('card_7');
  });

  it('keeps bare card ids and handles empty keys', () => {
    expect(cardIdFromMemoryKey('abc123')).toBe('abc123');
    expect(cardIdFromMemoryKey('')).toBe('');
    expect(cardIdFromMemoryKey(':')).toBe('');
  });

  it('keeps the least-mastered status when modes disagree', () => {
    expect(worstStatus('mastered', 'weak')).toBe('weak');
    expect(worstStatus('weak', 'mastered')).toBe('weak');
    expect(worstStatus('learning', 'review')).toBe('review');
    expect(worstStatus('mastered', 'new')).toBe('new');
    expect(worstStatus('mastered', 'learning')).toBe('learning');
    expect(worstStatus('weak', 'weak')).toBe('weak');
  });
});
