// theme_sliders_v1 (слово владельца 05.11): тема = Светлая/Тёмная + Оттенок + Насыщенность. Сторож чистого модуля и всей сетки H × S:
// белый на верху сцены ≥ 4,6, шов низа сцены с карточкой ≥ 1,34 (тёмное), читаемость текста — при ЛЮБЫХ оттенке и насыщенности.
import { approvedScene } from '../components/scene/scene_palette';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  THEME_TUNE_STANDARD, normalizeThemeTune, parseThemeTuneId, themeTuneChromaScale, themeTuneFromAccentOklch, themeTuneId, tunedBaseTokens,
} from '../constants/theme_tune';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string): number => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('theme_tune: идентификатор и числа', () => {
  it('идентификатор ↔ числа без потерь; мусор и выход из диапазона → null', () => {
    expect(themeTuneId({ H: 250, S: 35 })).toBe('tune:250:35');
    expect(parseThemeTuneId('tune:250:35')).toEqual({ H: 250, S: 35 });
    expect(parseThemeTuneId('tune:360:35')).toBeNull();
    expect(parseThemeTuneId('tune:10:101')).toBeNull();
    expect(parseThemeTuneId('graphite')).toBeNull();
    expect(parseThemeTuneId(undefined)).toBeNull();
    expect(parseThemeTuneId('tune:-5:20')).toBeNull();
  });
  it('нормализация: оттенок по кругу, насыщенность в 0…100, нечисло → стандарт', () => {
    expect(normalizeThemeTune({ H: 370, S: 140 })).toEqual({ H: 10, S: 100 });
    expect(normalizeThemeTune({ H: -10, S: -4 })).toEqual({ H: 350, S: 0 });
    expect(normalizeThemeTune({ H: 'x', S: NaN })).toEqual(THEME_TUNE_STANDARD);
  });
  it('множитель цветности: стандарт = 1, 0 = 0, S 100 ≈ 2,86, потолок 3', () => {
    expect(themeTuneChromaScale(35)).toBe(1);
    expect(themeTuneChromaScale(0)).toBe(0);
    expect(themeTuneChromaScale(100)).toBeCloseTo(100 / 35, 6);
    expect(themeTuneChromaScale(500)).toBe(3);
  });
  it('миграция: нет акцента → стандарт; акцент → ближайшие H и S', () => {
    expect(themeTuneFromAccentOklch(null)).toEqual(THEME_TUNE_STANDARD);
    expect(themeTuneFromAccentOklch({ C: 0.056, H: 249.6 })).toEqual({ H: 250, S: 35 });
    expect(themeTuneFromAccentOklch({ C: 0.5, H: 20 })).toEqual({ H: 20, S: 100 });
  });
});

describe('theme_tune: стандарт = сегодняшний тонированный вид', () => {
  it('основа при S 35 совпадает с готовой тонированной темой того же оттенка (slate, 245°)', () => {
    const tuned = liquidGlassTokens('tune:245:35', { level: 'calm', appearance: 'dark' });
    const slate = liquidGlassTokens('slate', { level: 'calm', appearance: 'dark' });
    for (const key of ['bg', 'bgTop', 'opaqueCard', 'opaqueSheet', 'opaqueControl', 'cta', 'text', 'secondary', 'accent'] as const) {
      expect(`${key}:${tuned[key]}`).toBe(`${key}:${slate[key]}`);
    }
  });
  it('S 0 даёт нейтральную основу (цветность ≈ 0), S 100 — заметно цветную', () => {
    const gray = tunedBaseTokens({ H: 250, S: 0 });
    const vivid = tunedBaseTokens({ H: 250, S: 100 });
    const spread = (hex: string): number => { const n = Number.parseInt(hex.slice(1, 7), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return Math.max(...c) - Math.min(...c); };
    expect(spread(gray.opaqueCard)).toBeLessThanOrEqual(2);
    expect(spread(vivid.opaqueCard)).toBeGreaterThan(spread(gray.opaqueCard) + 4);
  });
});

describe('theme_tune: флаг включён', () => {
  it('идентификатор проходит как есть', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const palette = require('../constants/liquidGlassThemePalette') as typeof import('../constants/liquidGlassThemePalette');
    expect(palette.resolveLiquidGlassTheme('tune:123:45')).toBe('tune:123:45');
  });
});

describe('theme_tune: контраст при любых H и S (сторож сетки)', () => {
  const HUES = Array.from({ length: 12 }, (_, i) => i * 30);
  const SATS = [0, 10, 35, 60, 100];
  for (const appearance of ['dark', 'light'] as const) {
    it(`${appearance}: белый на верху сцены ≥ 4,6 и шов ≥ 1,34 (тёмное); текст читается на фоне и карточке`, () => {
      const failures: string[] = [];
      for (const H of HUES) {
        for (const S of SATS) {
          const id = themeTuneId({ H, S });
          const t = liquidGlassTokens(id, { level: 'max', appearance });
          const scene = approvedScene({ accent: t.accent, opaqueCard: t.opaqueCard }, appearance, 'home', 1080, 1082, { dp: 2.625 });
          const whiteTop = scene.palette.whiteTop;
          const seam = scene.palette.seam;
          if (whiteTop < 4.55) failures.push(`${id} белый на верху ${whiteTop.toFixed(2)}`);
          if (appearance === 'dark' && seam < 1.33) failures.push(`${id} шов ${seam.toFixed(2)}`);
          if (contrast(t.text, t.bg) < 7) failures.push(`${id} текст/фон ${contrast(t.text, t.bg).toFixed(2)}`);
          if (contrast(t.text, t.opaqueCard) < 7) failures.push(`${id} текст/карточка ${contrast(t.text, t.opaqueCard).toFixed(2)}`);
          if (contrast(t.mutedText, t.opaqueCard) < 4.5) failures.push(`${id} приглушённый/карточка ${contrast(t.mutedText, t.opaqueCard).toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
