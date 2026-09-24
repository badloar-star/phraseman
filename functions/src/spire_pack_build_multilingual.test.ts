import * as fs from 'fs';
import * as path from 'path';
import { loadMultilingualPool } from './spire_pack_build';
import { buildSpirePack } from './spire_pack_contract';
import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';

/**
 * End-to-end проверка es/de/fr прямой публикации (PM-272, владелец
 * 2026-09-24): требует, чтобы functions/src/generated/spire_multilingual_
 * {lang}.json РЕАЛЬНО существовали (генерируются copy_generated_assets.js,
 * см. package.json build). Если файла нет — тест это явно говорит, а не
 * тихо проходит на пустом пуле.
 */
const LANGS = ['es', 'de', 'fr'] as const;

function generatedFileExists(lang: string): boolean {
  return fs.existsSync(path.join(__dirname, 'generated', `spire_multilingual_${lang}.json`));
}

describe.each(LANGS)('loadMultilingualPool(%s) — сквозная проверка require() пути', (lang) => {
  test('файл сгенерирован (npm run build / copy_generated_assets.js уже выполнялся)', () => {
    expect(generatedFileExists(lang)).toBe(true);
  });

  test('реально загружает и конвертирует пул через require, без сети', () => {
    if (!generatedFileExists(lang)) {
      // зачем: не роняем сьют молча, если build-шаг не выполнен — явный skip с причиной.
      console.warn(`[skip] spire_multilingual_${lang}.json отсутствует — прогони npm run build в functions/`);
      return;
    }
    const pool = loadMultilingualPool(lang);
    expect(pool.tasks.length).toBe(3808);
    expect(pool.rejected).toBe(192);
    expect(pool.reads).toBe(0);
  });

  test('buildSpirePack собирает реальную ступень из этого пула (этаж 1, ступень 0)', () => {
    if (!generatedFileExists(lang)) return;
    const pool = loadMultilingualPool(lang);
    const built = buildSpirePack({
      weekId: '2026-W40',
      lang,
      tier: 0,
      pool: pool.tasks,
      timer: SPIRE_CONFIG_DEFAULTS.timer,
      source: { poolVersion: `spire-multilingual-direct-${lang}`, publicationFingerprint: 'spire-multilingual-direct', legacyPool: false },
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.pack.floors.length).toBeGreaterThan(0);
      expect(built.pack.floors[0].steps.length).toBeGreaterThan(0);
      expect(built.pack.floors[0].steps[0].sets.length).toBeGreaterThan(0);
      expect(built.pack.floors[0].steps[0].sets[0].tasks.length).toBe(10);
    }
  });
});
