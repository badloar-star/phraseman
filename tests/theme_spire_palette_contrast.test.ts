import { DARK } from '../constants/theme';
import { LIQUID_GLASS_THEME_IDS, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { getV2Palette } from '../constants/v2Style';

// зачем (координатор 13.10: «Шпиль следует теме»): экраны Шпиля красятся палитрой V2 (`p.*`). Проверяем те пары, которые Шпиль
// реально рисует (текст, вторичный текст, подписи зон и стрелки «верно/неверно», текст на главной кнопке) на ВСЕХ 23 темах,
// в обоих оформлениях и на уровнях calm/accent/max. Замер показал: `correct`/`wrong` в светлом оформлении брались из старой
// базы (2.08–3.32 на карточке), теперь — семантические токены темы.
const VARIANTS = (['calm', 'accent', 'max'] as const).flatMap((level) =>
  (['dark', 'light'] as const).map((appearance) => ({ level, appearance, intensity: level === 'calm' ? 0 : level === 'accent' ? 0.5 : 1 })),
);
const solid = (hex: string) => (hex.startsWith('#') ? hex.slice(0, 7) : '#808080');

const PAIRS: ReadonlyArray<readonly [string, string, number]> = [
  ['text', 'card', 4.5], ['text', 'cardRaised', 4.5], ['text', 'bg', 4.5], ['text', 'control', 4.5],
  ['textSecondary', 'card', 4.5], ['textSecondary', 'cardRaised', 4.5], ['textSecondary', 'bg', 4.5], ['textSecondary', 'control', 4.5],
  ['textMuted', 'card', 3], ['textMuted', 'bg', 3],
  // подписи зон («Вверх»/«Вниз») — текст на фоне экрана, стрелки и значки — на карточке
  ['correct', 'bg', 4.5], ['wrong', 'bg', 4.5], ['correct', 'card', 3], ['wrong', 'card', 3],
  ['correct', 'cardRaised', 3], ['wrong', 'cardRaised', 3],
  ['ctaText', 'cta', 4.5], ['accentText', 'card', 4.5], ['accentText', 'bg', 4.5],
];

describe('палитра Шпиля читается во всех темах', () => {
  it('каждая пара «цвет / поверхность» держит порог на 23 темах × оформления × уровни', () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const variant of VARIANTS) {
        const p = getV2Palette(makeLiquidGlassTheme(id, DARK, variant), 'dark') as unknown as Record<string, string>;
        for (const [fg, bg, min] of PAIRS) {
          if (!p[fg] || !p[bg]) {
            bad.push(`нет поля ${fg}/${bg} ${id}`);
            continue;
          }
          const ratio = paletteContrast(solid(p[fg]!), solid(p[bg]!));
          if (ratio < min) bad.push(`${fg}/${bg} ${id}|${variant.level}|${variant.appearance}=${ratio.toFixed(2)}<${min}`);
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });
});
