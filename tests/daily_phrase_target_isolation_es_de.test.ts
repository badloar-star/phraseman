import {
  dailyPhraseContentAvailableForTarget,
  dailyPhraseContentGateForTarget,
  dailyPhraseGateCopyForTarget,
} from '../app/daily_phrase_target_gate';
import { getTodayPhraseSyncForTarget } from '../app/daily_phrase_system';
import { dailyPhraseKey } from '../app/target_storage_keys';

describe('Daily Phrase ES/DE target isolation', () => {
  it.each(['es', 'de'] as const)(
    'does not substitute an English idiom when the %s target has no native pack',
    (target) => {
      expect(dailyPhraseContentAvailableForTarget(target)).toBe(false);
      expect(getTodayPhraseSyncForTarget(target, 'ru')).toBeNull();
      expect(dailyPhraseKey(target)).not.toBe(dailyPhraseKey('en'));
    },
  );

  it('fails closed for an unknown target instead of normalizing it to English', () => {
    expect(dailyPhraseContentAvailableForTarget('xx')).toBe(false);
    expect(dailyPhraseContentGateForTarget('xx')).toMatchObject({
      enabled: false,
      studyTarget: 'xx',
      reason: 'unsupported_daily_phrase_target',
    });
    expect(getTodayPhraseSyncForTarget('xx', 'ru')).toBeNull();
  });

  it.each([
    ['es', 'Spanish'],
    ['de', 'German'],
  ] as const)('uses target-aware blocked copy for %s without French wording', (target, targetLabel) => {
    for (const locale of ['ru', 'uk'] as const) {
      const copy = dailyPhraseGateCopyForTarget(target, locale);
      expect(`${copy.title} ${copy.body}`).toContain(targetLabel);
      expect(`${copy.title} ${copy.body}`).not.toMatch(/French|француз|французьк/i);
    }
  });
});
