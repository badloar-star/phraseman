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

// зачем (владелец 2026-08-24): правила полок сменились. «Индиго»/«Нефрит» —
// бесплатны; «Олива» — единственная тема подписки; остальные покупаются за
// 200 жемчужин и ПОДПИСКОЙ НЕ ОТКРЫВАЮТСЯ; «Золото» — только награда лиги.
// Прошлая версия теста сторожила отменённое правило (dark: 'plus') — она
// обновлена намеренно, а не обойдена.
describe('selectable theme access policy', () => {
  it('keeps Indigo and Nephrite/Jade free', () => {
    expect(policy?.themeAccessTier('indigo')).toBe('free');
    expect(policy?.themeAccessTier('sagePorcelain')).toBe('free');
    expect(policy?.isThemePlusOnly('indigo')).toBe(false);
    expect(policy?.isThemePlusOnly('sagePorcelain')).toBe(false);
  });

  it('leaves Olive as the only subscription theme', () => {
    expect(policy?.themeAccessTier('olive')).toBe('plus');
    expect(policy?.isThemePlusOnly('olive')).toBe(true);
    const plusOnly = ['indigo', 'sagePorcelain', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'dark', 'gold']
      .filter((mode) => policy?.isThemePlusOnly(mode));
    expect(plusOnly).toEqual(['olive']);
  });

  it('sells every other theme for shards at a single price', () => {
    for (const mode of ['midnight', 'ember', 'aurora', 'volt', 'dark']) {
      expect(policy?.themeAccessTier(mode)).toBe('shards');
      expect(policy?.isThemeShardPurchasable(mode)).toBe(true);
      expect(policy?.themePriceShards(mode)).toBe(200);
    }
    expect(policy?.THEME_PRICE_SHARDS).toBe(200);
    // Бесплатные, подписочная и наградная темы за жемчуг не продаются.
    for (const mode of ['indigo', 'sagePorcelain', 'olive', 'gold']) {
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

  it('never unlocks a shard theme by subscription alone', () => {
    // Ядро решения владельца: подписка НЕ открывает покупаемые темы.
    expect(policy?.isThemeUnlockedFor('ember', { hasPremium: true })).toBe(false);
    expect(policy?.isThemeUnlockedFor('ember', { ownedThemeModes: ['ember'] })).toBe(true);
    expect(policy?.isThemeUnlockedFor('olive', { hasPremium: true })).toBe(true);
    expect(policy?.isThemeUnlockedFor('olive', {})).toBe(false);
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
