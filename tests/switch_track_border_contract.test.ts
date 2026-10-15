import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { switchTrackBorder } from '../components/settings/switch_chrome';

// зачем (Сверка 11.10): граница дорожки выключенного переключателя в светлой теме читается ≥ 2.9:1 к карточке (ориентир 3:1 для границы
// элемента управления), в тёмной остаётся прежней glassEdge. Ручка и включённая дорожка этим тестом не меняются.
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const over = (fg: string, bg: string): [number, number, number] => {
  const a = fg.length >= 9 ? parseInt(fg.slice(7, 9), 16) / 255 : 1;
  const f = rgb(fg);
  const b = rgb(bg);
  return f.map((v, i) => Math.round(v * a + b[i] * (1 - a))) as [number, number, number];
};
const lum = (c: [number, number, number]) => {
  const x = c.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2];
};
const ratio = (a: [number, number, number], b: [number, number, number]) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test('light appearance: switch track border reaches ~3:1 on the card in every theme and level', () => {
  const weak: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const intensity of [0, 0.5, 1]) {
      const g = liquidGlassTokens(id, { level: intensity ? 'max' : 'calm', appearance: 'light', intensity });
      const border = over(switchTrackBorder(g), g.opaqueCard);
      const r = ratio(border, rgb(g.opaqueCard));
      if (r < 2.9) weak.push(`${id}/${intensity}: ${r.toFixed(2)}`);
    }
  }
  expect(weak).toEqual([]);
});

test('dark appearance keeps the glass edge', () => {
  const g = liquidGlassTokens('grad_aurora', { level: 'calm', appearance: 'dark', intensity: 0 });
  expect(switchTrackBorder(g)).toBe(g.glassEdge);
});

// зачем (координатор 12.10, «Тень»): в «Настройках обучения» дорожка выключенного — тон без кромки; в светлой темах читается ≥ 2.9:1 к карточке.
import { switchOffTrackTone } from '../components/settings/switch_chrome';

test('light appearance: edu off-track tone reaches ~3:1 on the card, no border needed', () => {
  const weak: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const intensity of [0, 0.5, 1]) {
      const g = liquidGlassTokens(id, { level: intensity ? 'max' : 'calm', appearance: 'light', intensity });
      const track = over(switchOffTrackTone(g).track, g.opaqueCard);
      const r = ratio(track, rgb(g.opaqueCard));
      if (r < 2.9) weak.push(`${id}/${intensity}: ${r.toFixed(2)}`);
    }
  }
  expect(weak).toEqual([]);
});

test('dark appearance: off track is buttonFillDisabled (>= 1.5:1 to surfaces) with the secondary knob', () => {
  const g = liquidGlassTokens('grad_aurora', { level: 'calm', appearance: 'dark', intensity: 0 });
  expect(switchOffTrackTone(g)).toEqual({ track: g.buttonFillDisabled, knob: g.secondary });
});

// зачем (координатор 15.10, аудит «не сливается» для выключенных переключателей): по ВСЕМ темам × оформлениям × шагам дорожка выключенного отличима от поверхности (≥ 1,5 : 1; в светлых ≥ 2,9),
// а ручка читается на дорожке (≥ 3 : 1). До правки в тёмных темах дорожка была 1,00–1,15 : 1.
test('off switch never merges with the surface in any theme', () => {
  const bad: string[] = [];
  for (const appearance of ['dark', 'light'] as const) {
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const g = liquidGlassTokens(id, { appearance, intensity } as never) as unknown as Record<string, string>;
        const tone = switchOffTrackTone(g as never);
        for (const key of ['bg', 'bgTop', 'bgBottom', 'opaqueCard', 'opaqueSheet']) {
          const surface = rgb(g[key]!);
          const track = over(tone.track, g[key]!);
          const min = appearance === 'light' ? 2.9 : 1.5;
          const r = ratio(track, surface);
          if (r < min) bad.push(`${id}/${appearance}/${intensity} дорожка к ${key}: ${r.toFixed(2)} < ${min}`);
          const k = ratio(rgb(tone.knob), track);
          if (k < 3) bad.push(`${id}/${appearance}/${intensity} ручка на дорожке к ${key}: ${k.toFixed(2)} < 3`);
        }
      }
    }
  }
  expect(bad).toEqual([]);
});
