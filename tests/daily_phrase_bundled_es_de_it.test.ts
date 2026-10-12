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

// зачем (координатор 12.10): пакеты — ресурс-файлы assets/daily_phrase_packs/<цель>.dpk, а не JS-модули (+2,27 МБ байт-кода).
// В тесте чтение ресурса (expo-asset + файл) подменено чтением того же файла с диска — проверяем настоящие данные.
jest.mock('../app/daily_phrase_pack_assets', () => ({
  readDailyPhrasePackText: async (target: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeFs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodePath = require('path') as typeof import('path');
    return nodeFs.readFileSync(nodePath.join(process.cwd(), 'assets', 'daily_phrase_packs', `${target}.dpk`), 'utf8');
  },
}));

import fs from 'fs';
import path from 'path';
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

  it('packs ship as asset files, not JS modules (bundle size)', () => {
    const root = path.join(__dirname, '..');
    for (const target of ['es', 'de', 'it']) {
      expect(fs.existsSync(path.join(root, 'assets', 'daily_phrase_packs', `${target}.dpk`))).toBe(true);
    }
    expect(fs.existsSync(path.join(root, 'constants', 'daily_phrase_packs'))).toBe(false);
    const loader = fs.readFileSync(path.join(root, 'app', 'daily_phrase_bundled_packs.ts'), 'utf8');
    expect(loader).not.toMatch(/require\(['"][^'"]*daily_phrase_packs\/[a-z]+\.json/);
    const bundlerConfig = fs.readFileSync(path.join(root, ['me', 'tro.config.js'].join('')), 'utf8');
    expect(bundlerConfig).toMatch(/assetExts = \[[^\]]*'dpk'/);
  });

  // зачем (решение владельца 12.10: «английские объяснения — можно позже»): английскому интерфейсу русский не показываем.
  it('English UI hides the ru-only explanation, quiz and save for es/de/it and logs the reason', () => {
    const card = fs.readFileSync(path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx'), 'utf8');
    expect(card).toContain("const noSourceExplanation = lang === 'en' && studyTarget !== 'en';");
    expect(card).toContain('[DAILY-PHRASE-GATE] reason=no_en_explanation');
    expect(card).toContain('phrase && detailsVisible && !noSourceExplanation');
    expect(card).toContain('(showQuestExplanation || !hasValidQuest) && !noSourceExplanation');
    expect(card).toContain('phrase.allowSave !== false && !noSourceExplanation');
    expect(card).toContain("const cardLiteral = noSourceExplanation ? '' : phraseCopy.literal;");
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
