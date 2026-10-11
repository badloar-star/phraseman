import fs from 'fs';
import os from 'os';
import path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 12.10 01:58, пункт 3): итоговая матрица «Максимум» (ползунок = 1) — светлый текст кнопки (`accentInk`) поверх
// ВСЕХ точек градиента `accentGradient`, по 23 темам в тёмном и светлом оформлении. Сторож держит порог AA 4,5 на каждой точке;
// с THEME_REPORT=1 пишет таблицу «худшая точка по теме» во временную папку — её вставляют в отчёт аудита.
const solid = (hex: string) => hex.slice(0, 7);

describe('«Максимум»: текст кнопки поверх градиента читается во всех 23 темах', () => {
  it('accentInk >= 4.5 on every gradient stop at slider = 1, both appearances', () => {
    const rows: string[] = [];
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      const cells: string[] = [];
      for (const appearance of ['dark', 'light'] as const) {
        const g = liquidGlassTokens(id, { level: 'max', appearance, intensity: 1 });
        let worst = Infinity;
        g.accentGradient.forEach((color, i) => {
          const ratio = paletteContrast(solid(g.accentInk), solid(color));
          if (ratio < worst) worst = ratio;
          if (ratio < 4.5) bad.push(`${id}|${appearance}|stop${i}=${ratio.toFixed(2)}`);
        });
        cells.push(worst.toFixed(2));
      }
      rows.push(`| ${id} | ${cells[0]} | ${cells[1]} |`);
    }
    if (process.env.THEME_REPORT === '1') {
      fs.writeFileSync(
        path.join(os.tmpdir(), 'theme-max-button-matrix.md'),
        ['| Тема | Тёмное: худшая точка | Светлое: худшая точка |', '|---|---|---|', ...rows].join('\n'),
      );
    }
    expect(rows).toHaveLength(LIQUID_GLASS_THEME_IDS.length);
    expect(bad).toEqual([]);
  });
});
