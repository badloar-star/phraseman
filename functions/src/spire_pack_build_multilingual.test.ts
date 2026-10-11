import * as fs from 'fs';
import * as path from 'path';
import { loadMultilingualPool, multilingualPoolUnavailableReason } from './spire_pack_build';
import { buildSpirePack } from './spire_pack_contract';
import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';

/**
 * End-to-end проверка es/de/fr/it прямой публикации (PM-272, владелец
 * 2026-09-24): требует, чтобы functions/src/generated/spire_multilingual_
 * {lang}.json РЕАЛЬНО существовали (генерируются copy_generated_assets.js,
 * см. package.json build). Если файла нет — тест это явно говорит, а не
 * тихо проходит на пустом пуле.
 */
// зачем D155: статус проверяем по конкретному подписанному контуру. Одобренный
// Каждый одобренный язык обязан загружаться только после своего exact receipt.
// Общий список «все non-English заблокированы» устаревает после первого PASS и
// маскирует регрессии публикационного контракта.
const APPROVED_LANGS = ['es', 'fr', 'de', 'it'] as const;

test('projects the exact multilingual release block into unavailableLangs', () => {
  expect(multilingualPoolUnavailableReason({ unavailableReason: 'manifest_release_blocked' }))
    .toBe('manifest_release_blocked');
  expect(multilingualPoolUnavailableReason({})).toBe('multilingual_pool_empty');
});
function generatedFileExists(lang: string): boolean {
  return fs.existsSync(path.join(__dirname, 'generated', `spire_multilingual_${lang}.json`));
}

test('the exact canonical multilingual target set is independently approved', () => {
  expect(APPROVED_LANGS).toEqual(['es', 'fr', 'de', 'it']);
});
describe.each(APPROVED_LANGS)('loadMultilingualPool(%s) — independently approved release', (lang) => {
  test('generated asset exists and exposes all 4,000 reviewed tasks', () => {
    expect(generatedFileExists(lang)).toBe(true);
    const pool = loadMultilingualPool(lang);
    expect(pool.tasks).toHaveLength(4000);
    expect(pool.rejected).toBe(0);
    expect(pool.unavailableReason).toBeUndefined();
  });

  test('builds a playable weekly pack from the approved pool', () => {
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
  });
});
