// зачем (координатор 18.10, d30 по эталону): пустая клетка календаря рубежа — нейтральный белый/чёрный 8 % поверх фона. Расчёт Темы: заливка opaqueControl в светлых
// темах совпадала с фоном (1,00:1), в тёмных 1,09:1. Пин: цвет, различие с фоном ≥ 1,15 во всех 23 темах × тёмное/светлое × насыщенность 0/0,5/1,
// и клетка не сливается с заполненной (≥ 3), календарь берёт цвет из streakEmptyCellColor, а не из p.control.
import fs from 'node:fs';
import path from 'node:path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { streakEmptyCellColor } from '../components/streak/moments/streak_empty_cell';

const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (c: number[]): number => {
  const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
};
const ratio = (a: number[], b: number[]): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};
const over = (color: string, base: number[]): number[] => {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/u.exec(color)!;
  const a = parseFloat(m[4]!);
  return [1, 2, 3].map((i, k) => parseInt(m[i]!, 10) * a + base[k]! * (1 - a));
};

describe('streakEmptyCellColor', () => {
  it('тёмный фон — белый 8 %, светлый — чёрный 14 % (Макеты 18.10: 8 % на светлом почти не видно)', () => {
    expect(streakEmptyCellColor('#0C0D10')).toBe('rgba(255,255,255,0.08)');
    expect(streakEmptyCellColor('#F6F6F8')).toBe('rgba(0,0,0,0.14)');
  });

  it('различие с фоном ≥ 1,15 и с заполненной клеткой ≥ 3 — все темы, оба оформления, насыщенность 0 / 0,5 / 1', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        for (const intensity of [0, 0.5, 1]) {
          const g = liquidGlassTokens(id as never, { appearance, intensity } as never) as unknown as Record<string, string>;
          const cell = streakEmptyCellColor(g.bg!);
          for (const k of ['bg', 'bgTop']) {
            const base = rgb(g[k]!);
            const r = ratio(over(cell, base), base);
            if (r < 1.15) bad.push(`${id}@${intensity} ${appearance}: клетка к ${k} = ${r.toFixed(2)}`);
            const f = ratio(over(cell, base), rgb(g.accentGraphic!));
            if (f < 3) bad.push(`${id}@${intensity} ${appearance}: клетка к заполненной (${k}) = ${f.toFixed(2)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('MonthCalendar берёт цвет пустой клетки из streakEmptyCellColor, а не из opaqueControl', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/streak/moments/MonthCalendar.tsx'), 'utf8');
    expect(src).toContain('streakEmptyCellColor(p.bg)');
    expect(src).not.toContain('p.control');
  });
});
