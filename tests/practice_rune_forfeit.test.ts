import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  forfeitPendingPracticeRunes,
} from '../app/practice_rune_earnings';

test('forfeiting a session buffer clears only unclaimed runes and keeps paid ids', () => {
  const started = createPracticeRuneEarnings({
    activity: 'vocabulary',
    sessionKey: 'premium-forfeit',
    firstCompletion: true,
  });
  const paid = awardPracticeRune(awardPracticeRune(started, 'word-a').earnings, 'word-b').earnings;

  const forfeited = forfeitPendingPracticeRunes(paid);

  expect(forfeited).toMatchObject({ pendingRunes: 0, creditedItemIds: ['word-a', 'word-b'] });
  expect(awardPracticeRune(forfeited, 'word-a').awarded).toBe(0);
  expect(awardPracticeRune(forfeited, 'word-c').awarded).toBe(3);
});
