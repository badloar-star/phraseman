// зачем (владелец 13.10, №35: «НИКАКИЕ КНОПКИ ВООБЩЕ ЧТОБЫ НЕ СЛИВАЛИСЬ»): токены кнопок читаются на любой поверхности в каждой из 23 тем,
// светлом и тёмном оформлении и на всех пяти шагах ползунка: вторичная заливка отличима от фона/карточки/шторки, подписи читаются, отключённая отличима от вторичной.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Tok = Record<string, string>;
const rgb = (hex: string): number[] => { const h = hex.replace('#', '').slice(0, 6); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (hex: string): number => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

const SURFACES = ['bg', 'bgTop', 'bgBottom', 'opaqueCard', 'opaqueSheet'];

describe('токены кнопок × все темы', () => {
  const bad: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Tok;
        const at = `${id}|${appearance}|${intensity}`;
        for (const s of SURFACES) {
          // (1) вторичная кнопка имеет собственную поверхность, заметно отличную от фона под ней
          if (ratio(t.buttonFill!, t[s]!) < 1.5) bad.push(`${at} вторичная → ${s}: ${ratio(t.buttonFill!, t[s]!).toFixed(2)} < 1.5`);
          // главная кнопка тоже не сливается с фоном
          if (ratio(t.ctaFill!, t[s]!) < 1.5) bad.push(`${at} главная → ${s}: ${ratio(t.ctaFill!, t[s]!).toFixed(2)} < 1.5`);
        }
        // (2) подпись и значок ≥ 4,5 к своей поверхности
        if (ratio(t.text!, t.buttonFill!) < 4.5) bad.push(`${at} подпись вторичной ${ratio(t.text!, t.buttonFill!).toFixed(2)} < 4.5`);
        if (ratio(t.ctaInk!, t.ctaFill!) < 4.5) bad.push(`${at} подпись главной (ctaInk) ${ratio(t.ctaInk!, t.ctaFill!).toFixed(2)} < 4.5`);
        if (ratio(t.accentInk!, t.ctaFill!) < 4.5) bad.push(`${at} подпись главной (accentInk) ${ratio(t.accentInk!, t.ctaFill!).toFixed(2)} < 4.5`);
        // (4) отключённая: подпись читается (≥ 3), и она отличима от вторичной
        if (ratio(t.buttonInkDisabled!, t.buttonFillDisabled!) < 3) bad.push(`${at} подпись отключённой ${ratio(t.buttonInkDisabled!, t.buttonFillDisabled!).toFixed(2)} < 3`);
        if (ratio(t.buttonFill!, t.buttonFillDisabled!) < 1.08) bad.push(`${at} отключённая не отличается от вторичной ${ratio(t.buttonFill!, t.buttonFillDisabled!).toFixed(2)} < 1.08`);
      }
    }
  }
  it('все пары проходят пороги', () => {
    expect(bad).toEqual([]);
  });

  it('кит берёт заливки кнопок из токенов, а не «всё на 45 % прозрачности»', () => {
    const kit = fs.readFileSync(path.join(__dirname, '..', 'components/v2/V2Kit.tsx'), 'utf8');
    expect(kit).toContain('g.buttonFill');
    expect(kit).toContain('g.buttonFillDisabled');
    expect(kit).toContain('g.buttonInkDisabled');
    expect(kit).not.toContain('opacity: disabled ? 0.45 : 1');
    const variant = fs.readFileSync(path.join(__dirname, '..', 'constants/v2StyleGlassVariant.ts'), 'utf8');
    expect(variant).toContain('cta: g.ctaFill');
  });
});
