import fs from 'fs';
import path from 'path';

const BANNER_DIR = path.join(process.cwd(), 'assets', 'images', 'settings', 'referral_theme');
const COMPONENT_PATH = path.join(process.cwd(), 'components', 'ReferralInviteBannerArt.tsx');

/**
 * Темы читаем из типа ThemeMode — единственного источника правды.
 * зачем: так тест сам падает при добавлении новой темы, и не нужен
 * искусственный рантайм-экспорт списка тем только ради теста.
 */
function readThemeModes(): string[] {
  const source = fs.readFileSync(path.join(process.cwd(), 'constants', 'theme.ts'), 'utf8');
  const match = source.match(/export type ThemeMode\s*=\s*([^;]+);/);
  if (!match) throw new Error('ThemeMode type not found in constants/theme.ts');

  const modes = Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1]);
  expect(modes.length).toBeGreaterThan(0);
  return modes;
}

describe('referral invite banner themed art', () => {
  it('has a unique banner asset for every interface theme', () => {
    // зачем: добавили тему — обязаны добавить и баннер, иначе карточка
    // приглашения останется без картинки на этой теме.
    for (const theme of readThemeModes()) {
      const assetPath = path.join(BANNER_DIR, `invite-${theme}-v2.webp`);
      expect(fs.existsSync(assetPath)).toBe(true);
    }
  });

  it('never reuses the same artwork for two themes', () => {
    // зачем: баг 2026-07-26 — на теме «Индиго» показывался volt-баннер.
    // Одинаковые файлы означают, что тема визуально не отличается.
    const files = fs.readdirSync(BANNER_DIR).filter((f) => f.endsWith('.webp'));
    const seen = new Map<string, string>();

    for (const file of files) {
      const digest = fs.readFileSync(path.join(BANNER_DIR, file)).toString('base64');
      const duplicate = seen.get(digest);
      expect(duplicate === undefined || `${duplicate} === ${file}`).toBe(true);
      seen.set(digest, file);
    }
  });

  it('resets the cached native frame when the theme changes', () => {
    // зачем: expo-image переиспользует нативную вьюху и держит кадр прошлой
    // темы. recyclingKey/key по теме — единственное, что сбрасывает картинку.
    const source = fs.readFileSync(COMPONENT_PATH, 'utf8');

    expect(source).toContain('recyclingKey={themeMode}');
    expect(source).toContain('key={themeMode}');
  });

  it('keeps referral banner art bundled in OTA updates', () => {
    // зачем: баннеры лежат во вложенной папке settings/referral_theme —
    // одиночная звёздочка её не покрывает и картинки не доедут в OTA.
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const patterns: string[] = appJson.expo.updates.assetPatternsToBeBundled;

    expect(patterns).toContain('assets/images/settings/**/*');
    expect(patterns).not.toContain('assets/images/settings/*');
  });
});
