import fs from 'fs';
import path from 'path';

describe('ThemeContext default theme', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');
  const settingsThemesSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings_themes.tsx'), 'utf8');
  const themeSource = fs.readFileSync(path.join(__dirname, '..', 'constants', 'theme.ts'), 'utf8');

  it('uses Indigo as the first-run and fallback app theme', () => {
    expect(source).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'indigo'");
    expect(source).toContain('useState<ThemeMode>(DEFAULT_THEME_MODE)');
    expect(source).toContain("void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE)");
    expect(source).not.toContain("const DEFAULT_THEME_MODE: ThemeMode = 'compass'");
  });

  it('keeps Indigo and Sage Porcelain free, Midnight premium-grandfathered, and Gold reward-only', () => {
    expect(source).toContain("from '../app/theme_access_policy';");
    expect(source).not.toContain('const PREMIUM_ONLY_THEMES');
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'midnight'[^}]*\}/);
    // Замок кандидата считает единая политика (isThemeAvailable), а «Олива»
    // осталась единственной подписочной темой — см. theme_access_policy.test.ts.
    expect(settingsThemesSource).toContain('!isThemeAvailable(candidate)');
    expect(source).toContain('const valid = isSelectableThemeMode(migrated);');
    expect(source).toContain("'minimalDark', 'candyBlue'");
    expect(settingsThemesSource).not.toMatch(/\{\s*mode: '(?:minimalDark|candyBlue)'/);
    expect(settingsThemesSource).toContain('isThemeRewardOnly(item.mode)');
  });

  it('removes Coral and migrates its persisted value to Indigo', () => {
    expect(themeSource).not.toMatch(/export const CORAL\b/);
    expect(themeSource).not.toMatch(/export type ThemeMode\s*=.*'coral'/);
    expect(source).toMatch(/REMOVED_THEME_MODES[^\n]*'coral'/);
    expect(source).not.toContain("migrated === 'coral'");
    expect(settingsThemesSource).not.toMatch(/\{\s*mode: 'coral'/);
    // зачем без расширения: иконки тем переведены png→webp (2026-08-23). Проверка на
    // одно лишь «coral.png» стала бы дырявой — вернувшийся coral.webp прошёл бы мимо.
    expect(settingsThemesSource).not.toContain("theme-icons/coral");
  });

  it('removes Coral theme assets while preserving independent Coral Sunset card backs', () => {
    const assetsRoot = path.join(__dirname, '..', 'assets');
    const coralAssets: string[] = [];
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(absolutePath);
        } else {
          const relativePath = path.relative(assetsRoot, absolutePath).replace(/\\/g, '/');
          if (/coral/i.test(relativePath)) coralAssets.push(relativePath);
        }
      }
    };
    visit(assetsRoot);

    expect(coralAssets.sort()).toEqual([
      'images/flashcard_backs/community_02_coral_sunset.webp',
      'images/flashcard_backs/community_02_coral_sunset_fan.webp',
    ]);
  });

  // зачем (2026-08-24): смысл правила не изменился — «дедушка» Полночи не теряет
  // тему НИКОГДА. Изменилась реализация: три раздельных замка заменены единой
  // политикой isThemeUnlockedFor, поэтому тест сторожит те же гарантии по новым
  // строкам, а не по старым. Проверки специально идут по всем трём путям:
  // загрузка сохранённой темы, применение темы и перебор тем.
  it('preserves every Midnight grandfather exception', () => {
    expect(source).toContain("const grandfathered = pairs[2]?.[1] === '1' || themeStr === 'midnight';");
    // 1) применение: явная ветка «дедушки» до любых замков
    expect(source).toContain("if (m === 'midnight' && midnightGrandfathered) {");
    // 2) единая политика получает «дедушкины» темы, включая midnight
    expect(source).toContain('grandfatheredModes: midnightGrandfathered');
    expect(source).toMatch(/grandfatheredModes:[\s\S]{0,120}'midnight'/);
    // 3) перебор тем (toggle) идёт через ту же политику, а не через свой замок
    expect(source).toContain('const cycle = CYCLE.filter((mode) => isThemeAvailable(mode));');
    // Загрузка сохранённой темы тоже решается политикой, а не локальным premiumLocked.
    expect(source).toContain('const unlocked = isThemeUnlockedFor(t, {');
    expect(source).not.toContain('const premiumLocked =');
  });

  // зачем: новые правила полок (владелец 2026-08-24) — покупка за жемчуг не
  // должна «утечь» в подписку ни в одном из путей контекста.
  it('never unlocks a shard-purchasable theme by subscription', () => {
    expect(source).toContain("if (!DEV_THEME_UNLOCKS && isThemeShardPurchasable(m)) return;");
    expect(source).toContain('markThemePurchased');
    expect(source).toContain('ownedThemeModes');
  });

  // зачем (аудит 2026-08-25, найдено независимым ревью): app/config.ts объявляет
  // `export const DEV_MODE = true;` БЕЗУСЛОВНО (комментарий там же: временная
  // мера «для проверки Google Play») — этот флаг НЕ гасится в релизной сборке.
  // Прежняя строка `const DEV_THEME_UNLOCKS = DEV_MODE || ENABLE_DEV_TOOLS;`
  // из-за этого была ВСЕГДА true в проде: все платные темы (200 жемчужин каждая)
  // и наградное «Золото» открывались бесплатно любому пользователю. Проверка
  // «строка с DEV_THEME_UNLOCKS существует» эту дыру не поймала бы — тест
  // обязан проверять, ЧТО именно образует значение, а не факт использования.
  //
  // ENABLE_DEV_TOOLS — единственный безопасный источник (сам гасится
  // !IS_STORE_RELEASE в config.ts), settings_themes.tsx использует его же.
  it('never derives the theme dev-unlock flag from the always-true DEV_MODE constant', () => {
    expect(source).toContain('const DEV_THEME_UNLOCKS = ENABLE_DEV_TOOLS;');
    expect(source).not.toMatch(/DEV_THEME_UNLOCKS\s*=\s*DEV_MODE/);
    // Мёртвый импорт DEV_MODE — сигнал, что кто-то забыл его убрать при откате правки.
    expect(source).not.toMatch(/import\s*\{[^}]*\bDEV_MODE\b[^}]*\}\s*from\s*'\.\.\/app\/config'/);
    // settings_themes.tsx — тот же класс бага, уже исправленный там раньше;
    // оба места обязаны использовать один и тот же безопасный источник.
    expect(settingsThemesSource).toContain('const DEV_THEME_UNLOCKS = ENABLE_DEV_TOOLS;');
  });
});
