// зачем (владелец 25.10, координатор): во вступлении занятия английский, грамматические частицы и русский перевод — РАЗНЫЕ цвета
// во всех 29 темах; каждый ≥ 4,5 на карточке вступления (plateFillFrom → plateFillTo) в светлом и тёмном, на всех уровнях.
// Различимость — ΔE в OKLab ≥ 0,06 попарно; частицы — с цветом (насыщенность OKLCH ≥ 0,05), а не серые.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { introTextRoles } from '../constants/liquidGlassIntroTextRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';

const lin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const oklab = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1, 7), 16); const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const dE = (a: string, b: string): number => { const x = oklab(a), y = oklab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const chroma = (h: string): number => { const [, a, b] = oklab(h); return Math.hypot(a, b); };

describe('цвета текста вступления: английский / частицы / перевод', () => {
  it('во всех 29 темах × 2 оформления × 3 уровня — читаемы на карточке и различимы между собой', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          const g = liquidGlassTokens(id as never, { level, appearance } as never);
          const r = introTextRoles(id as never, { level, appearance });
          const at = `${appearance}/${id}/${level}`;
          for (const [name, c] of Object.entries(r).filter(([k]) => k !== 'particleSoft')) {
            for (const s of [g.plateFillFrom, g.plateFillTo]) {
              const k = paletteContrast(c.slice(0, 7), s.slice(0, 7));
              if (k < 4.5) bad.push(`${at} ${name} ${c} на ${s}: ${k.toFixed(2)}`);
            }
          }
          // частица на своей подложке (particleSoft, сведённой с обоими концами карточки) — тоже ≥ 4,5
          for (const s of [g.plateFillFrom, g.plateFillTo]) {
            const k = paletteContrast(r.particle.slice(0, 7), flattenOver(r.particleSoft, s.slice(0, 7)));
            if (k < 4.5) bad.push(`${at} particle на particleSoft: ${k.toFixed(2)}`);
          }
          for (const [a, b] of [['langText', 'particle'], ['langText', 'gloss'], ['particle', 'gloss']] as const) {
            if (dE(r[a], r[b]) < 0.06) bad.push(`${at} ${a}≈${b} ΔE ${dE(r[a], r[b]).toFixed(3)}`);
          }
          if (chroma(r.particle) < 0.05) bad.push(`${at} частицы серые: ${r.particle}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
