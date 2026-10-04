import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('removed Onyx theme contract', () => {
  it('does not expose Onyx in the theme catalog or settings label', () => {
    const picker = read('app/settings_themes.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const options = picker.slice(picker.indexOf('const THEME_OPTIONS'), picker.indexOf('function themeSwatches'));
    const labels = settings.slice(settings.indexOf('const currentThemeLabel'), settings.indexOf('const refreshSupplementalAccessState'));

    expect(options).not.toContain("mode: 'minimalDark'");
    expect(options).not.toMatch(/Оникс|Онікс|Onyx|Ónix|Ônix|Oniks|Onyks/);
    expect(labels).not.toContain('minimalDark:');
    expect(labels).not.toMatch(/Оникс|Онікс|Onyx|Ónix|Ônix|Oniks|Onyks/);
  });

  // зачем (темы 2.0, сессия «ТЕМЫ 2.0», 04.10): раньше ThemeContext перечислял удалённые темы
  // поимённо; теперь миграция общая — ЛЮБОЕ старое значение app_theme кроме 'dark' перезаписывается
  // в Графит, неизвестный id темы → graphite. Гарантия та же, проверяется поведением, а не строкой.
  it('migrates existing Onyx selections to the current default theme', () => {
    const source = read('components/ThemeContext.tsx');
    const { themeAccessTier, isThemeUnlockedFor } = require('../app/theme_access_policy');
    const { resolveLiquidGlassTheme, LIQUID_GLASS_THEME_IDS } = require('../constants/liquidGlassThemePalette');
    const { THEME_DISPLAY_NAMES } = require('../app/theme_display_names');

    expect(themeAccessTier('minimalDark')).toBe('unavailable');
    expect(isThemeUnlockedFor('minimalDark', { hasPremium: true, ownedThemeModes: ['minimalDark'], isGoldUnlocked: true, grandfatheredModes: ['minimalDark'], devUnlockAll: true })).toBe(false);
    expect(resolveLiquidGlassTheme('minimalDark')).toBe('graphite');
    expect(LIQUID_GLASS_THEME_IDS).not.toContain('minimalDark');
    expect(THEME_DISPLAY_NAMES).not.toHaveProperty('minimalDark');
    // Общая перезапись сохранённого старого выбора в Графит.
    expect(source).toContain("if (themeStr !== LEGACY_GRAPHITE_THEME_MODE) {");
    expect(source).toContain("AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE)");
    expect(source).not.toContain("migrated === 'minimalDark'");
  });
});
