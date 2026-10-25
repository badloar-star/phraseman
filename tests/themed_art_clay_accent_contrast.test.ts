// зачем ([R1-PAGE] координатор 15.10, стиль S2 «Глина»): слой .accent красится в accent (с 15.10; раньше accentBright) поверх глины — графитовой (dark ≈ #34343A) и светлой (light ≈ #ECE9E3).
// Деталь не должна сливаться с глиной ни в одной из 23 тем на трёх уровнях насыщенности. Замер 15.10: минимум 6,71 (dark) и 3,89 (light); порог — 1,8 координатора, держим 3,0 с запасом.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { isPremiumThemeId } from '../app/premium_theme_catalog';
import { artAccentTint } from '../components/theme/art_tint';

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
    it(`${appearance}: цвет детали (artAccentTint) к глине ≥ ${MIN_CONTRAST} во всех темах и на всех уровнях насыщенности`, () => {
      const failures: string[] = [];
      for (const intensity of [0, 0.5, 1]) {
        for (const id of LIQUID_GLASS_THEME_IDS) {
          const tokens = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
          const ratio = contrast(artAccentTint(tokens, appearance), CLAY[appearance]);
          if (ratio < MIN_CONTRAST) failures.push(`${id} @${intensity}: ${artAccentTint(tokens, appearance)} → ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});

// зачем (координатор 15.10, предложение А): деталь красится accent — на «Спокойно» (0) нейтральна по замыслу, на 0,5 и 1 в тёмных Закат/Мята заметно насыщенны (раньше accentBright давал пастель C 0,07–0,10).
const toChroma = (hex: string): number => {
  const lin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = channels(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!);
  const m = Math.cbrt(0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!);
  const s = Math.cbrt(0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return Math.hypot(a, bb);
};

describe('насыщенность цветной детали: accent вместо пастельного accentBright', () => {
  it('уровень 0 «Спокойно» нейтрален: у всех тем в тёмном и светлом chroma accent ≤ 0,07', () => {
    const loud: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      // зачем (OWNER_DECISIONS 25.10 «тон поверхностей — вариант 2»: пигменты коллекции Codex — замок 24.10 + слово владельца 25.10 «как у Кодекса»): тон меряется на 23 обычных темах, премиум-темы — контрактом tests/premium_themes_contrast.test.ts; текст и графика — во всех 29
      for (const id of LIQUID_GLASS_THEME_IDS.filter((x) => !isPremiumThemeId(x))) {
        const accent = liquidGlassTokens(id, { level: 'calm', appearance, intensity: 0 }).accent;
        const chroma = toChroma(accent.slice(0, 7));
        if (chroma > 0.07) loud.push(`${id} ${appearance}: ${accent} C${chroma.toFixed(3)}`);
      }
    }
    expect(loud).toEqual([]);
  });

  it('Закат и Мята в тёмном на 0,5 и 1: accent насыщенный (C ≥ 0,12) и насыщеннее прежнего accentBright', () => {
    for (const id of ['terracotta', 'sage']) {
      for (const intensity of [0.5, 1]) {
        const t = liquidGlassTokens(id, { level: 'calm', appearance: 'dark', intensity });
        expect(toChroma(t.accent.slice(0, 7))).toBeGreaterThanOrEqual(0.12);
        expect(toChroma(t.accent.slice(0, 7))).toBeGreaterThan(toChroma(t.accentBright.slice(0, 7)));
      }
    }
  });
});
