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

  it('sells no theme for shards: price tags are gone from every tile', () => {
    for (const mode of ['indigo', 'sagePorcelain', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'dark', 'gold']) {
      expect(policy?.themeAccessTier(mode)).not.toBe('shards');
      expect(policy?.isThemeShardPurchasable(mode)).toBe(false);
      expect(policy?.themePriceShards(mode)).toBe(0);
    }
  });
});
