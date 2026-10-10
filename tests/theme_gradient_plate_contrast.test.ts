import fs from 'fs';
import os from 'os';
import path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 10.10 21:12, пункт 3): главная кнопка рисуется ГРАДИЕНТОМ (accentGradient) поверх заливки accent, а текст на ней —
// accentInk. Раньше проверялась одна заливка; здесь — КАЖДАЯ остановка градиента в каждой теме, оформлении и шаге ползунка.
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const solid = (hex: string) => hex.slice(0, 7);

describe('gradient plate readability', () => {
  it('accentInk reads on every stop of the accent gradient', () => {
    const bad: string[] = [];
    const groups = new Set<string>();
    let stops = 0;
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
          g.accentGradient.forEach((color, i) => {
            stops += 1;
            const ratio = paletteContrast(solid(g.accentInk), solid(color));
            if (ratio < 4.5) {
              bad.push(`${id}|${appearance}|${intensity}|stop${i}=${ratio.toFixed(2)}`);
              groups.add(`${id}|${appearance}|stop${i}`);
            }
          });
        }
      }
    }
    // зачем: сводка по темам/оформлениям для разбора (защитный слой jest не пускает писать в исходники — во временную папку).
    if (process.env.THEME_REPORT) fs.writeFileSync(path.join(os.tmpdir(), 'grad_viol.txt'), `${bad.length} нарушений\n${[...groups].join('\n')}\n`);
    expect(stops).toBeGreaterThan(1000);
    expect(bad.slice(0, 40)).toEqual([]);
  });
});
