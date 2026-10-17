// зачем ([BLEND-AUDIT], координатор 18.10): сторож «кнопки нигде не сливаются» для новинок 17.10; пары и пороги — tests/blend_1018_pairs.ts, таблица — scripts/blend_1018_report.cjs.
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { PAIRS, run } from './blend_1018_pairs';

describe('[BLEND-AUDIT] новинки 17.10 по токенам всех тем', () => {
  const { worstAfter, failList } = run();
  it('считает все темы и пары', () => {
    expect(worstAfter.size).toBe(LIQUID_GLASS_THEME_IDS.length);
    expect(PAIRS.length).toBeGreaterThan(0);
  });
  it('провалов нет', () => {
    const seen = new Set<string>();
    const unique = failList.filter((f) => { const k = f.replace(/^\S+ /, '').replace(/:.*$/, ''); if (seen.has(k)) return false; seen.add(k); return true; });
    expect(unique).toEqual([]);
  });
});
