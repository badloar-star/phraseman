import fs from 'fs';
import path from 'path';

type ThemeAccessPolicyModule = {
  themeAccessTier: (themeMode: string) => 'free' | 'plus' | 'shards' | 'reward' | 'unavailable';
  isThemePlusOnly: (themeMode: string) => boolean;
  isThemeRewardOnly: (themeMode: string) => boolean;
  isThemeShardPurchasable: (themeMode: string) => boolean;
  themePriceShards: (themeMode: string) => number;
  isThemeUnlockedFor: (themeMode: string, access?: Record<string, unknown>) => boolean;
  THEME_PRICE_SHARDS: number;
};

let policy: ThemeAccessPolicyModule | null = null;
try {
  policy = require('../app/theme_access_policy') as ThemeAccessPolicyModule;
} catch {
  // RED until the shared policy exists.
}

const root = path.join(__dirname, '..');
const pickerSource = fs.readFileSync(path.join(root, 'app', 'settings_themes.tsx'), 'utf8');
const contextSource = fs.readFileSync(path.join(root, 'components', 'ThemeContext.tsx'), 'utf8');

// зачем (владелец 2026-09-13, freemium vNext): «темы оформления — убери ценники
// и сделай все темы доступны в Plus». «Индиго»/«Нефрит» — бесплатны; ВСЕ
// остальные темы открывает подписка; за жемчуг не продаётся ничего; «Золото» —
// только награда лиги. Прошлая версия теста сторожила правило 2026-08-24
// (покупка за 200 жемчужин, подписка не открывает) — обновлена намеренно.
describe('selectable theme access policy', () => {
  it('keeps Indigo and Nephrite/Jade free', () => {
    expect(policy?.themeAccessTier('indigo')).toBe('free');
    expect(policy?.themeAccessTier('sagePorcelain')).toBe('free');
    expect(policy?.isThemePlusOnly('indigo')).toBe(false);
    expect(policy?.isThemePlusOnly('sagePorcelain')).toBe(false);
  });

  it('puts every paid theme on the Plus shelf', () => {
    for (const mode of ['olive', 'midnight', 'ember', 'aurora', 'volt', 'dark']) {
      expect(policy?.themeAccessTier(mode)).toBe('plus');
      expect(policy?.isThemePlusOnly(mode)).toBe(true);
    }
    const plusOnly = ['indigo', 'sagePorcelain', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'dark', 'gold']
      .filter((mode) => policy?.isThemePlusOnly(mode));
    expect(plusOnly).toEqual(['olive', 'midnight', 'ember', 'aurora', 'volt', 'dark']);
  });

  it('sells no theme for shards: price tags are gone from every tile', () => {
    for (const mode of ['indigo', 'sagePorcelain', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'dark', 'gold']) {
      expect(policy?.themeAccessTier(mode)).not.toBe('shards');
      expect(policy?.isThemeShardPurchasable(mode)).toBe(false);
      expect(policy?.themePriceShards(mode)).toBe(0);
    }
  });

  it('keeps Gold a league reward, never a purchase', () => {
    expect(policy?.themeAccessTier('gold')).toBe('reward');
    expect(policy?.isThemeRewardOnly('gold')).toBe(true);
    expect(policy?.isThemeShardPurchasable('gold')).toBe(false);
    expect(policy?.isThemeUnlockedFor('gold', { hasPremium: true })).toBe(false);
    expect(policy?.isThemeUnlockedFor('gold', { isGoldUnlocked: true })).toBe(true);
  });

  it('unlocks the whole Plus shelf by subscription, and keeps earlier purchases', () => {
    // Ядро решения владельца 2026-09-13: подписка открывает все платные темы.
    for (const mode of ['olive', 'midnight', 'ember', 'aurora', 'volt', 'dark']) {
      expect(policy?.isThemeUnlockedFor(mode, { hasPremium: true })).toBe(true);
      expect(policy?.isThemeUnlockedFor(mode, {})).toBe(false);
    }
    // Купленная до смены правил тема остаётся своей и без подписки.
    expect(policy?.isThemeUnlockedFor('ember', { ownedThemeModes: ['ember'] })).toBe(true);
  });

  it('never takes away a theme the user already had', () => {
    // «Дедушки»: активная тема сохраняется навсегда, даже без подписки.
    expect(policy?.isThemeUnlockedFor('volt', { grandfatheredModes: ['volt'] })).toBe(true);
    expect(policy?.isThemeUnlockedFor('olive', { grandfatheredModes: new Set(['olive']) })).toBe(true);
    expect(policy?.isThemeUnlockedFor('dark', { ownedThemeModes: new Set(['dark']) })).toBe(true);
  });

  it('uses that same policy for picker badges and persisted selection enforcement', () => {
    expect(pickerSource).toContain("} from './theme_access_policy';");
    expect(pickerSource).toContain('isThemeShardPurchasable(candidate)');
    expect(pickerSource).toContain('themePriceShards(item.mode)');
    expect(pickerSource).toContain('isThemeAvailable(item.mode)');
    expect(pickerSource).not.toContain('premiumOnly?: boolean;');

    expect(contextSource).toContain("from '../app/theme_access_policy';");
    expect(contextSource).toContain('isThemeUnlockedFor');
    expect(contextSource).toContain('isThemeShardPurchasable(m)');
    expect(contextSource).toContain('hasLeagueGoldThemeReward');
    expect(contextSource).not.toContain('const PREMIUM_ONLY_THEMES');
  });
});
