import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dailyPhraseContentGateForTarget,
  dailyPhraseContentAvailableForTarget,
} from '../app/daily_phrase_target_gate';
import {
  getTodayPhraseForTarget,
  getTodayPhraseSyncForTarget,
  setDailyPhraseSavedOnServerForTarget,
  subscribeTodayPhraseForTarget,
} from '../app/daily_phrase_system';
import {
  assertTargetKey,
  dailyPhraseKey,
  dailyPhraseLastDateKey,
  dailyPhraseRemoteCacheKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
  },
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

describe('Gustav French daily phrase target gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks English daily phrase runtime for French until approved source evidence exists', async () => {
    expect(dailyPhraseContentAvailableForTarget('fr')).toBe(false);
    expect(dailyPhraseContentGateForTarget('fr')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_daily_phrase_source_gate',
    });
    expect(dailyPhraseContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_daily_phrase_bank',
      'ru_uk_daily_phrase_prompt_review',
    ]));

    expect(getTodayPhraseSyncForTarget('fr')).toBeNull();
    await expect(getTodayPhraseForTarget('fr')).resolves.toBeNull();
    await setDailyPhraseSavedOnServerForTarget('remote-phrase', true, 'fr');
    const unsubscribe = subscribeTodayPhraseForTarget(() => {
      throw new Error('French daily phrase subscription must be gated');
    }, 'fr');
    unsubscribe();

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('keeps English legacy behavior and reserves scoped French storage keys for future approved packets', async () => {
    const phrase = getTodayPhraseSyncForTarget('en');
    expect(phrase?.english).toBeTruthy();
    await expect(getTodayPhraseForTarget('en')).resolves.toMatchObject({ allowSave: true });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('daily_phrase_v3', expect.any(String));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('last_phrase_date_v3', expect.any(String));

    expect(dailyPhraseKey('en')).toBe('daily_phrase_v3');
    expect(dailyPhraseLastDateKey('en')).toBe('last_phrase_date_v3');
    expect(dailyPhraseRemoteCacheKey('en')).toBe('daily_phrase_remote_cache_v1');
    expect(dailyPhraseKey('fr')).toBe('daily_phrase_v2::fr::daily_phrase_v3');
    expect(dailyPhraseLastDateKey('fr')).toBe('daily_phrase_v2::fr::last_phrase_date_v3');
    expect(dailyPhraseRemoteCacheKey('fr')).toBe('daily_phrase_v2::fr::daily_phrase_remote_cache_v1');

    expect(() => assertTargetKey('daily_phrase_v3')).toThrow(/Raw target-sensitive key/);
    expect(assertTargetKey(dailyPhraseKey('fr'))).toBe(dailyPhraseKey('fr'));
  });
});
