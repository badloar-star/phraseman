// зачем ([R1-PAGE] координатор 15.10, стиль S2 «Глина»): слой .accent красится в accentBright поверх глины — графитовой (dark ≈ #34343A) и светлой (light ≈ #ECE9E3).
// Деталь не должна сливаться с глиной ни в одной из 23 тем на трёх уровнях насыщенности. Замер 15.10: минимум 6,71 (dark) и 3,89 (light); порог — 1,8 координатора, держим 3,0 с запасом.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const CLAY = { dark: '#34343A', light: '#ECE9E3' } as const;
const MIN_CONTRAST = 3;

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a.slice(0, 7)), luminance(b.slice(0, 7))].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('цветная деталь S2 «Глина» не сливается с глиной', () => {
  for (const appearance of ['dark', 'light'] as const) {
    it(`${appearance}: accentBright к глине ≥ ${MIN_CONTRAST} во всех темах и на всех уровнях насыщенности`, () => {
      const failures: string[] = [];
      for (const intensity of [0, 0.5, 1]) {
        for (const id of LIQUID_GLASS_THEME_IDS) {
          const tokens = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
          const ratio = contrast(tokens.accentBright, CLAY[appearance]);
          if (ratio < MIN_CONTRAST) failures.push(`${id} @${intensity}: ${tokens.accentBright} → ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
