// зачем (координатор 14.10): подпись транскрипции на стопке хаба Карточек обязана читаться на всех 23 темах —
// раньше приглушённый цвет давал контраст 1.57–5.33. Подпись берёт цвет слова (faceInk); порог ≥ 4.5 (цвет слова на заливке стопки; доля цвета темы 0,45, Ревизор 3.36, 18.10).
import { readFileSync } from 'fs';
import { join } from 'path';
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_GRADIENT_THEME_IDS } from '../constants/liquidGlassGradientThemes';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const x = lum(a); const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// те же формулы, что в app/flashcards/CardsHubV2.tsx (mixDark, themePair, stackFill)
const mixDark = (hex: string, base: string, t: number) => {
  const a = rgb(hex.length >= 7 ? hex : '#888888'); // theme-exempt: запасной серый при битом входе смешивания
  const b = rgb(base);
  return `#${a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
};
const themePair = (g: any): [string, string] => {
  const glow = g.bgGlow;
  if (glow && glow[0] && glow[1] && glow[0].slice(1, 7) !== '000000' && glow[1].slice(1, 7) !== '000000') return [glow[0].slice(0, 7), glow[1].slice(0, 7)];
  const gr = g.accentGradient;
  if (gr && gr.length >= 2) return [gr[0], gr[gr.length - 1]];
  return [g.accent, g.accentBorder];
};

describe('хаб Карточек: подпись транскрипции на стопке', () => {
  it('в исходнике подпись берёт цвет слова, а не приглушённый', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'flashcards', 'CardsHubV2.tsx'), 'utf8');
    expect(src).toMatch(/const faceInkSoft = faceInk;/);
  });

  it('контраст цвета слова на заливке стопки ≥ 4.5 на всех 23 темах, обоих видах, уровнях и значениях ползунка', () => {
    const ids = [...new Set([...(LIQUID_GLASS_THEME_IDS as readonly string[]), ...(LIQUID_GLASS_GRADIENT_THEME_IDS as readonly string[])])];
    expect(ids.length).toBe(23);
    const bad: string[] = [];
    for (const id of ids) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
            const g: any = liquidGlassTokens(id as any, { level, appearance, intensity });
            const [a, b] = themePair(g);
            const stops = [mixDark(a, g.deepBase, 0.45), g.deepBaseAlt, mixDark(b, g.deepBaseAlt, 0.38)];
            const ink = g.isLight ? g.text : g.mediaInk;
            const worst = Math.min(...stops.map((s) => ratio(ink, s)));
            if (worst < 4.5) bad.push(`${id}/${appearance}/${level}/${intensity}: ${worst.toFixed(2)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
