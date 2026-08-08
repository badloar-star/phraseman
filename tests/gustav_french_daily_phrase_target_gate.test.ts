import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import {
  dailyPhraseContentGateForTarget,
  dailyPhraseContentAvailableForTarget,
} from '../app/daily_phrase_target_gate';
import {
  getTodayPhraseForTarget,
  getTodayPhraseSyncForTarget,
  setDailyPhraseSavedOnServerForTarget,
} from '../app/daily_phrase_system';
import {
  assertTargetKey,
  dailyPhraseKey,
  dailyPhraseLastDateKey,
  dailyPhraseRemoteCacheKey,
} from '../app/target_storage_keys';

const ROOT = path.join(__dirname, '..');

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

const mockFrenchCards = [
  {
    id: 'fr-ru-card-1',
    en: 'Bonjour',
    ru: 'Здравствуйте',
    uk: '',
    categoryId: 'situations',
    isSystem: true,
  },
  {
    id: 'fr-ru-card-2',
    en: 'Merci beaucoup',
    ru: 'Большое спасибо',
    uk: '',
    categoryId: 'situations',
    isSystem: true,
  },
];

jest.mock('../app/french_flashcard_remote_runtime', () => ({
  ensureFrenchRemoteFlashcards: jest.fn(async () => {}),
  getCachedFrenchRemoteFlashcards: jest.fn(() => mockFrenchCards),
}));

describe('Gustav French daily phrase target gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens French daily phrase from the remote system flashcard pack without English idiom fallback', async () => {
    expect(dailyPhraseContentAvailableForTarget('fr')).toBe(true);
    expect(dailyPhraseContentGateForTarget('fr')).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_flashcard_system_daily_phrase_available',
      blockedSurfaces: [],
    });
    expect(dailyPhraseContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_flashcard_system_bank',
      'french_daily_phrase_from_remote_flashcards_runtime',
      'target_scoped_daily_phrase_cache',
      'no_english_idiom_bank_fallback',
    ]));

    expect(getTodayPhraseSyncForTarget('fr', 'ru')).toMatchObject({
      english: expect.any(String),
      meaning: expect.any(String),
      allowSave: true,
    });
    await expect(getTodayPhraseForTarget('fr', 'ru')).resolves.toMatchObject({
      id: expect.stringContaining('fr-daily-'),
      allowSave: true,
    });
    await setDailyPhraseSavedOnServerForTarget('remote-phrase', true, 'fr');

    expect(AsyncStorage.getItem).toHaveBeenCalledWith(dailyPhraseLastDateKey('fr'));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(dailyPhraseKey('fr'), expect.any(String));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(dailyPhraseLastDateKey('fr'), expect.any(String));
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('daily_phrase_v3', expect.any(String));
  });

  it('keeps the home daily phrase surface wired to the target-aware runtime', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
    const card = fs.readFileSync(path.join(ROOT, 'components', 'DailyPhraseCard.tsx'), 'utf8');
    const system = fs.readFileSync(path.join(ROOT, 'app', 'daily_phrase_system.ts'), 'utf8');

    expect(home).toContain('<DailyPhraseCard variant="homeAdditional" />');
    expect(home).toContain(': <DailyPhraseCard />}');
    expect(home).not.toContain("studyTarget !== 'fr' && <DailyPhraseCard");
    expect(home).not.toContain("studyTarget !== 'fr' ? <DailyPhraseCard");
    expect(card).toContain('const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget)');
    expect(card).toContain('getTodayPhraseSyncForTarget(studyTarget, lang)');
    expect(card).toContain('getTodayPhraseForTarget(studyTarget, lang)');
    expect(card).not.toContain("if (studyTarget === 'fr')");
    expect(system).toContain("ensureFrenchRemoteFlashcards(sourceLocale)");
    expect(system).toContain("dailyPhraseKey('fr')");
    expect(system).toContain("dailyPhraseLastDateKey('fr')");
    expect(system).not.toContain('IDIOMS.find');
    expect(dailyPhraseContentAvailableForTarget('fr')).toBe(true);
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
