import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 12.10 17:40, пункт 2): значки таб-бара — нетекстовые элементы (WCAG 1.4.11, ≥ 3:1). Активный значок
// (`accentBright`) лежит на полупрозрачной плашке (`accentCap`, как в CapFill: радиальная заливка до .32 × альфа токена), остальные —
// на стекле панели (`opaqueControl` поверх `bg`, .90 как на Android; на iOS стекло прозрачнее и зависит от контента под панелью —
// это приближение, а не измерение). Тест читает токены темы и НЕ зависит от кода V2TabBar (его правит Дизайн).
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const LEVELS = ['calm', 'accent', 'max'] as const;
const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
const blend = (top: string, under: string, alpha: number) =>
  `#${[0, 1, 2].map((i) => Math.round(channel(top, i) * alpha + channel(under, i) * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
const solid = (hex: string) => hex.slice(0, 7);

describe('таб-бар: значки читаются во всех темах', () => {
  it.each(['dark', 'light'] as const)('%s: активный значок на плашке, приглушённый и наведённый — на стекле, >= 3:1', (appearance) => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of LEVELS) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level, appearance, intensity });
          const glass = blend(solid(g.opaqueControl), solid(g.bg), 0.9);
          const capAlpha = g.accentCap.length === 9 ? parseInt(g.accentCap.slice(7, 9), 16) / 255 : 1;
          const pill = blend(solid(g.accentCap), glass, 0.32 * capAlpha);
          const where = `${id}|${level}|${intensity}`;
          const pairs: ReadonlyArray<readonly [string, number]> = [
            ['активный/плашка', paletteContrast(solid(g.accentBright), pill)],
            ['активный/стекло', paletteContrast(solid(g.accentBright), glass)],
            ['приглушённый/стекло', paletteContrast(solid(g.mutedText), glass)],
            ['наведённый/стекло', paletteContrast(solid(g.secondary), glass)],
          ];
          for (const [name, ratio] of pairs) if (ratio < 3) bad.push(`${name} ${where}=${ratio.toFixed(2)}`);
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });
});
