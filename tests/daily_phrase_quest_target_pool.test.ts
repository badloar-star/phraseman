import { getDailyPhraseQuestPoolForTarget } from '../app/daily_phrase_system';
import { getIdiomsSync } from '../app/idioms_lazy';

describe('Daily Phrase quest target pool isolation', () => {
  it('returns the original English idiom objects and numeric ids for legacy ranking parity', () => {
    const idioms = getIdiomsSync();
    const pool = getDailyPhraseQuestPoolForTarget('en', 'ru');

    expect(pool[0]).toBe(idioms[0]);
    expect(typeof pool[0]?.id).toBe('number');
  });

  it.each(['es', 'de'] as const)(
    'does not expose English idioms as %s distractors before a native pack exists',
    (target) => {
      expect(getDailyPhraseQuestPoolForTarget(target, 'ru')).toEqual([]);
    },
  );

  it('does not use the English local idiom ids as a French quest fallback', () => {
    const frenchPool = getDailyPhraseQuestPoolForTarget('fr', 'ru');
    expect(frenchPool.some((phrase) => String(phrase.id).startsWith('local-'))).toBe(false);
  });

  it('fails closed instead of exposing English idioms for an unknown target', () => {
    expect(getDailyPhraseQuestPoolForTarget('xx', 'ru')).toEqual([]);
  });
});
