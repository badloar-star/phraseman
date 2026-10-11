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

  // зачем (координатор 12.10 02:25): то же для главной кнопки (ctaInk на cta) и для основного/вторичного текста поверх КАЖДОЙ точки
  // градиентных фонов и карточек — на всех 21 шагах ползунка, а не только на «Максимуме».
  it('ctaInk reads on cta, text and secondary read on every bg/card gradient stop, all slider steps', () => {
    const steps = Array.from({ length: 21 }, (_, i) => i / 20);
    const bad: string[] = [];
    const worst: Record<string, { ratio: number; where: string }> = {};
    const note = (key: string, ratio: number, where: string) => {
      if (!worst[key] || ratio < worst[key].ratio) worst[key] = { ratio, where };
      if (ratio < 4.5) bad.push(`${key} ${where}=${ratio.toFixed(2)}`);
    };
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of steps) {
          const g = liquidGlassTokens(id, { level: 'max', appearance, intensity });
          const where = `${id}|${appearance}|${intensity}`;
          note('ctaInk / cta', paletteContrast(solid(g.ctaInk), solid(g.cta)), where);
          (g.bgGradient ?? [g.bg]).forEach((c, i) => {
            note('text / bgGradient', paletteContrast(solid(g.text), solid(c)), `${where}|stop${i}`);
            note('secondary / bgGradient', paletteContrast(solid(g.secondary), solid(c)), `${where}|stop${i}`);
          });
          (g.cardGradient ?? [g.opaqueCard]).forEach((c, i) => {
            note('text / cardGradient', paletteContrast(solid(g.text), solid(c)), `${where}|stop${i}`);
            note('secondary / cardGradient', paletteContrast(solid(g.secondary), solid(c)), `${where}|stop${i}`);
          });
        }
      }
    }
    if (process.env.THEME_REPORT === '1') {
      fs.writeFileSync(
        path.join(os.tmpdir(), 'theme-gradient-fill-text.md'),
        ['| Пара | Худший (тема|оформление|шаг) |', '|---|---|', ...Object.entries(worst).map(([k, v]) => `| ${k} | ${v.ratio.toFixed(2)} (${v.where}) |`)].join('\n'),
      );
    }
    expect(bad.slice(0, 40)).toEqual([]);
  });
});
