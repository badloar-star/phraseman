import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('removed Candy Blue theme contract', () => {
  it('does not expose Candy Blue in the theme catalog or settings label', () => {
    const picker = read('app/settings_themes.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const options = picker.slice(picker.indexOf('const THEME_OPTIONS'), picker.indexOf('function themeSwatches'));
    const labels = settings.slice(settings.indexOf('const currentThemeLabel'), settings.indexOf('const refreshSupplementalAccessState'));

    expect(options).not.toContain("mode: 'candyBlue'");
    expect(options).not.toMatch(/Кенди Блу|Кенді Блу|Azul caramelo|Azul candy|Xanh kẹo|Biru permen|Şeker mavisi|Cukrowy błękit/);
    expect(labels).not.toContain('candyBlue:');
    expect(labels).not.toMatch(/Кенди Блу|Кенді Блу|Azul caramelo|Azul candy|Xanh kẹo|Biru permen|Şeker mavisi|Cukrowy błękit/);
  });

  // зачем (темы 2.0, сессия «ТЕМЫ 2.0», 04.10): раньше ThemeContext перечислял удалённые темы
  // поимённо; теперь миграция общая — ЛЮБОЕ старое значение app_theme кроме 'dark' перезаписывается
  // в Графит, неизвестный id темы → graphite. Гарантия та же, проверяется поведением, а не строкой.
  it('migrates existing Candy Blue selections to the current default theme', () => {
    const source = read('components/ThemeContext.tsx');
    const { themeAccessTier, isThemeUnlockedFor } = require('../app/theme_access_policy');
    const { resolveLiquidGlassTheme, LIQUID_GLASS_THEME_IDS } = require('../constants/liquidGlassThemePalette');
    const { THEME_DISPLAY_NAMES } = require('../app/theme_display_names');

    expect(themeAccessTier('candyBlue')).toBe('unavailable');
    expect(isThemeUnlockedFor('candyBlue', { hasPremium: true, ownedThemeModes: ['candyBlue'], isGoldUnlocked: true, grandfatheredModes: ['candyBlue'], devUnlockAll: true })).toBe(false);
    expect(resolveLiquidGlassTheme('candyBlue')).toBe('graphite');
    expect(LIQUID_GLASS_THEME_IDS).not.toContain('candyBlue');
    expect(THEME_DISPLAY_NAMES).not.toHaveProperty('candyBlue');
    // Общая перезапись сохранённого старого выбора в Графит.
    expect(source).toContain("if (themeStr !== LEGACY_GRAPHITE_THEME_MODE) {");
    expect(source).toContain("AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE)");
    expect(source).not.toContain("migrated === 'candyBlue'");
  });
});
