// зачем (владелец 12.10 через координатора: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ», D163): фраза дня для
// es/de/it — из принятых пакетов, встроенных в сборку. Сторож: при каждой цели и каждом языке объяснений фраза есть, на целевом
// языке (не английская идиома, без кириллицы), объяснение на языке источника, гейт открыт без dev-сервера, сеть не трогается.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

import { IDIOMS } from '../app/idioms_data';
import { dailyPhraseContentGateForTarget } from '../app/daily_phrase_target_gate';
import {
  ensureTargetRemoteDailyPhrases,
  getCachedTargetRemoteDailyPhrasePool,
} from '../app/multilingual_daily_phrase_remote_runtime';
import { getTodayPhraseSyncForTarget } from '../app/daily_phrase_system';

const CYRILLIC = /[а-яёіїєґ]/i;
const englishIdioms = new Set(IDIOMS.map((idiom) => idiom.english.trim().toLowerCase()));

describe('Daily phrase for es/de/it is bundled (D163)', () => {
  let fetchSpy: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as never).mockImplementation((() => {
      throw new Error('network must not be used for bundled daily phrases');
    }) as never);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    log.mockRestore();
  });

  it.each(['es', 'de', 'it'] as const)('%s: the gate is open without the dev server', (target) => {
    expect(dailyPhraseContentGateForTarget(target)).toMatchObject({ enabled: true, reason: 'target_daily_phrase_bundled_pack' });
  });

  it.each([
    ['es', 'ru'], ['es', 'uk'], ['de', 'ru'], ['de', 'uk'], ['it', 'ru'], ['it', 'uk'],
  ] as const)('%s / %s: a daily phrase exists, in the target language, explained in the source language', async (target, locale) => {
    await ensureTargetRemoteDailyPhrases(target, locale);
    const pool = getCachedTargetRemoteDailyPhrasePool(target, locale);
    expect(pool).toHaveLength(176);
    for (const phrase of pool) {
      expect(phrase.studyTarget).toBe(target);
      expect(phrase.english.trim().length).toBeGreaterThan(0);
      expect(CYRILLIC.test(phrase.english)).toBe(false);
      expect(englishIdioms.has(phrase.english.trim().toLowerCase())).toBe(false);
      expect(CYRILLIC.test(phrase.meaning)).toBe(true);
    }
    const today = getTodayPhraseSyncForTarget(target, locale);
    expect(today).not.toBeNull();
    expect(today?.studyTarget).toBe(target);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the three targets carry different phrases (no shared or substituted pack)', async () => {
    const pools = await Promise.all((['es', 'de', 'it'] as const).map(async (target) => {
      await ensureTargetRemoteDailyPhrases(target, 'ru');
      return new Set(getCachedTargetRemoteDailyPhrasePool(target, 'ru').map((phrase) => phrase.english));
    }));
    const [es, de, it] = pools;
    expect([...es!].filter((text) => de!.has(text) || it!.has(text))).toEqual([]);
  });
});
