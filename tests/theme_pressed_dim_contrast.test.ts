import fs from 'fs';
import os from 'os';
import path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 12.10 00:05): V2Pressable/KitTouchable при нажатии затемняют весь элемент до opacity .86 (kit `.t.down`).
// Текст и плашка при этом смешиваются с тем, что под ними (фон экрана), и контраст пары падает. Проверяем на ВСЕХ 23 темах,
// в обоих оформлениях и на всех шагах ползунка. Нажатие — кратковременное состояние (≈ 100–300 мс), поэтому жёсткий пол — 3:1
// (порог для крупного текста и значков WCAG); ниже 4,5 допускается только на нажатой главной кнопке, список пишется в отчёт
// (THEME_REPORT=1 → временная папка), а не теряется.
const PRESSED_OPACITY = 0.86;
const HARD_FLOOR = 3;
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const solid = (hex: string) => hex.slice(0, 7);

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
const blend = (top: string, under: string, alpha: number) => {
  const out = [0, 1, 2].map((i) => Math.round(channel(top, i) * alpha + channel(under, i) * (1 - alpha)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

type Pair = Readonly<{ name: string; fg: (g: GlassTokens) => string; bg: (g: GlassTokens) => string }>;
const PAIRS: readonly Pair[] = [
  { name: 'ctaInk / cta', fg: (g) => g.ctaInk, bg: (g) => g.cta },
  { name: 'accentInk / accent', fg: (g) => g.accentInk, bg: (g) => g.accent },
  { name: 'text / плашка', fg: (g) => g.text, bg: (g) => g.opaqueControl },
  { name: 'text / карточка', fg: (g) => g.text, bg: (g) => g.opaqueCard },
  { name: 'accentText / плашка', fg: (g) => g.accentText, bg: (g) => g.opaqueControl },
];

describe('pressed dimming (.86) keeps control text readable', () => {
  it('no control pair falls below 3:1 after blending with the screen background', () => {
    const below: string[] = [];
    const rows: string[] = [];
    for (const pair of PAIRS) {
      let min = { ratio: Infinity, where: '' };
      let under45 = 0;
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const appearance of ['dark', 'light'] as const) {
          for (const intensity of STEPS) {
            const g = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
            const under = solid(g.bg);
            const ratio = paletteContrast(
              blend(solid(pair.fg(g)), under, PRESSED_OPACITY),
              blend(solid(pair.bg(g)), under, PRESSED_OPACITY),
            );
            const where = `${id}|${appearance}|${intensity}`;
            if (ratio < min.ratio) min = { ratio, where };
            if (ratio < 4.5) under45 += 1;
            if (ratio < HARD_FLOOR) below.push(`${pair.name} ${where}=${ratio.toFixed(2)}<${HARD_FLOOR}`);
          }
        }
      }
      rows.push(`| ${pair.name} | ${min.ratio.toFixed(2)} (${min.where}) | ${under45} |`);
    }
    if (process.env.THEME_REPORT === '1') {
      const total = LIQUID_GLASS_THEME_IDS.length * 2 * STEPS.length;
      fs.writeFileSync(
        path.join(os.tmpdir(), 'theme-pressed-dim-contrast.md'),
        ['| Пара | Худший контраст при .86 (тема|оформление|шаг) | Комбинаций ниже 4,5 из ' + total + ' |', '|---|---|---|', ...rows].join('\n'),
      );
    }
    expect(below.slice(0, 40)).toEqual([]);
  });
});
