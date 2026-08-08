import fs from 'fs';
import path from 'path';

type ThemeAccessPolicyModule = {
  themeAccessTier: (themeMode: string) => 'free' | 'plus' | 'reward' | 'unavailable';
  isThemePlusOnly: (themeMode: string) => boolean;
  isThemeRewardOnly: (themeMode: string) => boolean;
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

describe('selectable theme access policy', () => {
  it('keeps Indigo and Nephrite/Jade free while another selectable theme is Plus-only', () => {
    expect(policy?.themeAccessTier('indigo')).toBe('free');
    expect(policy?.themeAccessTier('sagePorcelain')).toBe('free');
    expect(policy?.themeAccessTier('dark')).toBe('plus');
    expect(policy?.themeAccessTier('gold')).toBe('reward');
    expect(policy?.isThemePlusOnly('indigo')).toBe(false);
    expect(policy?.isThemePlusOnly('sagePorcelain')).toBe(false);
    expect(policy?.isThemePlusOnly('dark')).toBe(true);
    expect(policy?.isThemePlusOnly('gold')).toBe(false);
    expect(policy?.isThemeRewardOnly('gold')).toBe(true);
  });

  it('uses that same policy for picker badges and persisted selection enforcement', () => {
    expect(pickerSource).toContain("import { isThemePlusOnly, isThemeRewardOnly } from './theme_access_policy';");
    expect(pickerSource).toContain('const candidateLocked =\n    isThemePlusOnly(candidate)');
    expect(pickerSource).toContain('const locked = isThemePlusOnly(item.mode)');
    expect(pickerSource).toContain('isThemeRewardOnly(item.mode)');
    expect(pickerSource).not.toContain('premiumOnly?: boolean;');

    expect(contextSource).toContain("from '../app/theme_access_policy';");
    expect(contextSource).toContain('isThemePlusOnly(t)');
    expect(contextSource).toContain('isThemePlusOnly(m)');
    expect(contextSource).toContain('isThemePlusOnly(mode)');
    expect(contextSource).toContain('hasLeagueGoldThemeReward');
    expect(contextSource).not.toContain('const PREMIUM_ONLY_THEMES');
  });
});
