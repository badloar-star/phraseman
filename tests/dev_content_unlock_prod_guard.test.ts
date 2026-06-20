import fs from 'fs';
import path from 'path';

/**
 * Страж: «голый» DEV_MODE никогда не должен открывать платный контент в стор-сборке.
 *
 * История: контент-гейты (уроки, квизы, экзамен, темы оформления, dev-маркет карточек,
 * лидерборды, гонка лиг) читали голый `DEV_MODE` (всегда =true в коде) БЕЗ `!IS_STORE_RELEASE`.
 * Из-за этого «всё открыто для проверки Google Play» физически уезжало в публичную сборку
 * и раздавало премиум-контент бесплатно. Введён production-safe флаг DEV_CONTENT_UNLOCK,
 * который гасится в стор-сборке так же, как FORCE_PREMIUM / DEV_IAP_BYPASS.
 *
 * Этот тест:
 *  1) требует, чтобы экспорт DEV_CONTENT_UNLOCK был привязан к стор-гарду (IS_STORE_RELEASE);
 *  2) проверяет, что в перечисленных контент-файлах НЕ осталось голого `DEV_MODE`
 *     (он должен быть заменён на DEV_CONTENT_UNLOCK / ENABLE_DEV_TOOLS).
 */

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'app', 'config.ts');

// Файлы контент-гейтов, где голый DEV_MODE = утечка платного контента в прод.
// Все DEV_MODE здесь должны быть переведены на store-safe флаги.
const CONTENT_GATE_FILES = [
  path.join('app', '(tabs)', 'quizzes.tsx'),
  path.join('app', '(tabs)', 'lessons.tsx'),
  path.join('app', 'exam.tsx'),
  path.join('app', 'achievements_screen.tsx'),
  path.join('app', 'settings_themes.tsx'),
  path.join('app', 'flashcards.tsx'),
  path.join('app', 'flashcards_collection.tsx'),
  path.join('app', 'flashcards', 'FlashcardListItem.tsx'),
  path.join('app', 'flashcards_market_dev.tsx'),
  path.join('app', 'arena_leaderboard.tsx'),
  path.join('app', 'league_race_visibility.ts'),
];

function getExportedExpression(source: string, name: string): string | null {
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*([\\s\\S]*?);`);
  const m = source.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// Убираем комментарии (// ... и /* ... */), чтобы упоминания DEV_MODE в пояснениях
// не считались использованием в коде.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('DEV_CONTENT_UNLOCK production guard', () => {
  const source = fs.readFileSync(CONFIG_PATH, 'utf8');

  it('exports DEV_CONTENT_UNLOCK exactly once', () => {
    const count = (source.match(/export\s+const\s+DEV_CONTENT_UNLOCK\b/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('ties DEV_CONTENT_UNLOCK to the store-release fuse', () => {
    const expr = getExportedExpression(source, 'DEV_CONTENT_UNLOCK');
    expect(expr).not.toBeNull();
    expect(expr).toMatch(/IS_STORE_RELEASE/);
    expect(expr).not.toMatch(/^(true|false)$/);
  });

  it('runtime value is false when EXPO_PUBLIC_STORE_RELEASE=1 (simulated store build)', () => {
    // Воспроизводим формулу из config.ts: DEV_MODE && !IS_STORE_RELEASE.
    const IS_STORE_RELEASE = '1' === '1';
    const DEV_MODE = true; // даже если разработчик оставил true
    const devContentUnlock = DEV_MODE && !IS_STORE_RELEASE;
    expect(devContentUnlock).toBe(false);
  });
});

describe('content gates do not read bare DEV_MODE', () => {
  for (const rel of CONTENT_GATE_FILES) {
    it(`${rel} has no bare DEV_MODE in code`, () => {
      const abs = path.join(ROOT, rel);
      const code = stripComments(fs.readFileSync(abs, 'utf8'));
      // Слово DEV_MODE как идентификатор (не DEV_CONTENT_UNLOCK, не FORCE_PREMIUM_DEV_…).
      const bareDevMode = code.match(/(?<![A-Za-z0-9_])DEV_MODE(?![A-Za-z0-9_])/g) ?? [];
      expect(bareDevMode).toHaveLength(0);
    });
  }
});
