import fs from 'node:fs';
import path from 'node:path';

import {
  SELECTABLE_THEME_MODES,
  isThemeUnlockedFor,
  themeAccessTier,
} from '../app/theme_access_policy';

// зачем (2026-10-04, сессия «ТЕМЫ 2.0»): файл был написан на node:test, а запускает его jest —
// jest видел «Your test suite must contain at least one test», т.е. сторож НЕ ВЫПОЛНЯЛСЯ.
// Переведён на describe/it/expect jest один-в-один; проверки не ослаблены, строка про
// makeLiquidGlassTheme приведена к текущей сигнатуре (третий аргумент — вариант темы).
const contextSource = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'ThemeContext.tsx'),
  'utf8',
);

describe('legacy theme retirement compatibility', () => {
  it('keeps only the internal Graphite asset shim selectable', () => {
    expect(SELECTABLE_THEME_MODES).toEqual(['dark']);
    expect(themeAccessTier('dark')).toBe('free');

    for (const retiredMode of [
      'indigo',
      'sagePorcelain',
      'olive',
      'midnight',
      'ember',
      'aurora',
      'volt',
      'gold',
    ]) {
      expect(themeAccessTier(retiredMode)).toBe('unavailable');
    }
  });

  it('never revives a retired theme through Plus, ownership, rewards, or dev access', () => {
    const retiredAccess = {
      hasPremium: true,
      ownedThemeModes: ['ember'],
      isGoldUnlocked: true,
      grandfatheredModes: ['midnight'],
      devUnlockAll: true,
    };

    expect(isThemeUnlockedFor('dark', retiredAccess)).toBe(true);
    expect(isThemeUnlockedFor('ember', retiredAccess)).toBe(false);
    expect(isThemeUnlockedFor('midnight', retiredAccess)).toBe(false);
    expect(isThemeUnlockedFor('gold', retiredAccess)).toBe(false);
  });

  it('normalizes persisted legacy selection to the Graphite shim without loading ownership routes', () => {
    expect(contextSource).toContain("const LEGACY_GRAPHITE_THEME_MODE: ThemeMode = 'dark';");
    expect(contextSource).toContain("AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE)");
    expect(contextSource).toContain('themeMode: LEGACY_GRAPHITE_THEME_MODE');
    expect(contextSource).toContain('appliedThemeMode: LEGACY_GRAPHITE_THEME_MODE');
    // Тема всегда собирается из Liquid Glass поверх DARK (третий аргумент — вариант: оформление + насыщенность).
    expect(contextSource).toMatch(/makeLiquidGlassTheme\(liquidGlassThemeId, DARK(, variant)?\)/);

    expect(contextSource).not.toContain('loadOwnedThemeModes');
    expect(contextSource).not.toContain('loadGrandfatheredThemeModes');
    expect(contextSource).not.toContain('grandfatherActiveThemeIfNeeded');
    expect(contextSource).not.toContain('MIDNIGHT_GRANDFATHER_KEY');
    expect(contextSource).not.toContain('isThemeUnlockedFor');
    expect(contextSource).not.toContain('isThemePlusOnly');
    expect(contextSource).not.toContain('isThemeShardPurchasable');
  });

  it('never unlocks or restores a Liquid Glass tint through developer mode', () => {
    // 2026-09-30: темы бесплатны — доступность не зависит ни от Plus, ни от dev-флагов.
    expect(contextSource).toContain('LIQUID_GLASS_THEME_IDS.includes(id)');
    expect(contextSource).toContain('resolveLiquidGlassTheme(storedId)');
    expect(contextSource).not.toContain('hasPremiumAccess');
    expect(contextSource).not.toContain('DEV_THEME_UNLOCKS');
    expect(contextSource).not.toContain('ENABLE_DEV_TOOLS');
  });
});
