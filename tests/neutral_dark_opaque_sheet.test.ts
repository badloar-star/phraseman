// зачем (координатор 13.10, разбор diff Темами Г2; стиль «Тень» 12.10): подложка шторок и окон `opaqueSheet` в ТЁМНОМ оформлении — нейтральная #28282E у ВСЕХ тем и уровней
// (образец shadow-skin.css `.ph .sheet`), светлое оформление не меняется. Сторож не даёт вернуть окрашенную подложку; а плашки шторок остаются светлее подложки.
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { SHADOW_SHEET_DARK_TOP } from '../components/v2/shadow_sheet_paint';

const THEMES = ['graphite', 'grad_aurora', 'grad_iris', 'grad_magma', 'grad_jade', 'grad_orchid', 'grad_midnight', 'rose', 'polar', 'taupe'] as const;
const L = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe('opaqueSheet в тёмном — нейтраль', () => {
  it('у всех тем и уровней в тёмном равен #28282E и совпадает с верхом нейтральной шторки', () => {
    const bad: string[] = [];
    for (const id of THEMES) {
      for (const intensity of [0, 0.5, 1]) {
        const g = liquidGlassTokens(id, { appearance: 'dark', intensity } as never);
        if (g.opaqueSheet.toUpperCase() !== '#28282E') bad.push(`${id}@${intensity}: ${g.opaqueSheet}`);
      }
    }
    expect(bad).toEqual([]);
    expect(SHADOW_SHEET_DARK_TOP.toUpperCase()).toBe('#28282E');
  });

  it('в светлом подложка не нейтрализована (тема сохраняет свои значения)', () => {
    const g = liquidGlassTokens('grad_aurora', { appearance: 'light', intensity: 0.6 } as never);
    expect(g.opaqueSheet.toUpperCase()).not.toBe('#28282E');
  });

  it('плашки шторок светлее подложки во всех тёмных темах (их считали от окрашенной подложки)', () => {
    const bad: string[] = [];
    for (const id of THEMES) {
      const g = liquidGlassTokens(id, { appearance: 'dark', intensity: 1 } as never);
      if (L(g.sheetPlateFillFrom) <= L(g.opaqueSheet)) bad.push(`${id} верх`);
      if (L(g.sheetPlateFillTo) <= L(g.opaqueSheet)) bad.push(`${id} низ`);
    }
    expect(bad).toEqual([]);
  });
});
