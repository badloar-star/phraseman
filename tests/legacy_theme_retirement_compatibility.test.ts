import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SELECTABLE_THEME_MODES,
  isThemeUnlockedFor,
  themeAccessTier,
} from '../app/theme_access_policy';

const contextSource = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'ThemeContext.tsx'),
  'utf8',
);

describe('legacy theme retirement compatibility', () => {
  it('keeps only the internal Graphite asset shim selectable', () => {
    assert.deepEqual(SELECTABLE_THEME_MODES, ['dark']);
    assert.equal(themeAccessTier('dark'), 'free');

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
      assert.equal(themeAccessTier(retiredMode), 'unavailable');
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

    assert.equal(isThemeUnlockedFor('dark', retiredAccess), true);
    assert.equal(isThemeUnlockedFor('ember', retiredAccess), false);
    assert.equal(isThemeUnlockedFor('midnight', retiredAccess), false);
    assert.equal(isThemeUnlockedFor('gold', retiredAccess), false);
  });

  it('normalizes persisted legacy selection to the Graphite shim without loading ownership routes', () => {
    assert.ok(contextSource.includes("const LEGACY_GRAPHITE_THEME_MODE: ThemeMode = 'dark';"));
    assert.ok(contextSource.includes("AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE)"));
    assert.ok(contextSource.includes('themeMode: LEGACY_GRAPHITE_THEME_MODE'));
    assert.ok(contextSource.includes('appliedThemeMode: LEGACY_GRAPHITE_THEME_MODE'));
    assert.ok(contextSource.includes('makeLiquidGlassTheme(liquidGlassThemeId, DARK)'));

    assert.equal(contextSource.includes('loadOwnedThemeModes'), false);
    assert.equal(contextSource.includes('loadGrandfatheredThemeModes'), false);
    assert.equal(contextSource.includes('grandfatherActiveThemeIfNeeded'), false);
    assert.equal(contextSource.includes('MIDNIGHT_GRANDFATHER_KEY'), false);
    assert.equal(contextSource.includes('isThemeUnlockedFor'), false);
    assert.equal(contextSource.includes('isThemePlusOnly'), false);
    assert.equal(contextSource.includes('isThemeShardPurchasable'), false);
  });

  it('never unlocks or restores a Liquid Glass tint through developer mode', () => {
    assert.ok(contextSource.includes("id === 'graphite' || hasPremiumAccess"));
    assert.ok(contextSource.includes('resolveLiquidGlassTheme(candidate, isPremium || hasPremiumAccess)'));
    assert.equal(contextSource.includes('DEV_THEME_UNLOCKS'), false);
    assert.equal(contextSource.includes('ENABLE_DEV_TOOLS'), false);
  });
});
