// зачем (координатор 12.10): окно покупки набора следует теме Liquid Glass, в том числе светлой — текст цены и кнопки обязан читаться
// на всех темах и оттенках ползунка. Оболочка строится из токенов (cardPackPaywallShellFromTokens); тексты окна берутся из Theme,
// собранной из тех же токенов (makeLiquidGlassTheme): цена — text, подпись — secondary, кнопка — accentInk на [accentBright, accent].
import fs from 'node:fs';
import path from 'node:path';

import { colorContrast } from '../constants/color_contrast';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { cardPackPaywallShellFromTokens } from '../app/flashcards/cardPackPaywallTokenTheme';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// ползунок: спокойно / середина / максимум, в обоих оформлениях
const VARIANTS = [
  { level: 'calm', appearance: 'dark', intensity: 0 },
  { level: 'calm', appearance: 'light', intensity: 0 },
  { level: 'accent', appearance: 'dark', intensity: 0.5 },
  { level: 'accent', appearance: 'light', intensity: 0.5 },
  { level: 'max', appearance: 'dark', intensity: 1 },
  { level: 'max', appearance: 'light', intensity: 1 },
] as const;

describe('окно покупки набора из токенов: контраст текста цены и кнопки', () => {
  const failures: string[] = [];
  let checked = 0;
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const variant of VARIANTS) {
      const tokens = liquidGlassTokens(id, variant);
      const shell = cardPackPaywallShellFromTokens(tokens);
      const label = `${id}/${variant.level}/${variant.appearance}`;
      const check = (what: string, fg: string, bg: string, min: number) => {
        checked += 1;
        const ratio = colorContrast(fg, bg);
        if (ratio < min) failures.push(`${label} ${what}: ${ratio.toFixed(2)} < ${min} (${fg} на ${bg})`);
      };
      // цена: основной текст на обоих концах градиента плашки цены
      for (const stop of shell.priceGradient) check('цена', tokens.text, stop, 4.5);
      // подпись «Стоимость» (в окне — t.textMuted = secondary)
      for (const stop of shell.priceGradient) check('подпись цены', tokens.secondary, stop, 4.5);
      // кнопка «Купить» и «В магазин»: текст на обоих концах заливки
      for (const stop of shell.ctaColors) check('кнопка', shell.ctaForeground, stop, 4.5);
      for (const stop of shell.goShopCta) check('кнопка магазина', shell.goShopForeground, stop, 4.5);
    }
  }

  it('все пары текст/фон набирают нужный контраст', () => {
    expect(checked).toBeGreaterThan(100);
    expect(failures).toEqual([]);
  });
});

describe('подключение: оба места берут оболочку из токенов темы', () => {
  it('геттеры принимают tokens и возвращают оболочку из токенов раньше таблицы по id темы', () => {
    const src = read('app/flashcards/cardPackPaywallTheme.ts');
    expect(src).toContain('tokens?: GlassTokens');
    expect(src.match(/if \(opts\.tokens\) return cardPackPaywallShellFromTokens\(opts\.tokens\);/g)?.length).toBe(2);
  });
  it('кнопка ваучера берёт ту же проверенную пару, что «В магазин»', () => {
    const modal = read('app/flashcards/CardPackShardPaywallModal.tsx');
    expect(modal).toContain('gradientColors={paywallVisual.goShopCta}');
    expect(modal).not.toContain('gradientColors={[t.gold');
  });
  it('окно покупки и экран набора передают токены активной темы', () => {
    const modal = read('app/flashcards/CardPackShardPaywallModal.tsx');
    expect(modal).toContain('getCardPackPaywallTheme(pack, { themeMode, isLight: isLightTheme, tokens: glassTokens })');
    const data = read('app/flashcards/useCollectionData.ts');
    expect(data).toContain('getCardPackPaywallTheme(currentMarketPack, { themeMode, isLight: isLightTheme, tokens: glassTokens })');
    expect(data).toContain('getCommunityUgcPackPaywallTheme(currentMarketPack.ugcCardThemeKey, { themeMode, isLight: isLightTheme, tokens: glassTokens })');
  });
});
