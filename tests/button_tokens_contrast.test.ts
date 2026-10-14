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
        // (4) отключённая: подпись читается (≥ 4,5, находка Макетов 13.10), и она отличима от вторичной
        if (ratio(t.buttonInkDisabled!, t.buttonFillDisabled!) < 4.5) bad.push(`${at} подпись отключённой ${ratio(t.buttonInkDisabled!, t.buttonFillDisabled!).toFixed(2)} < 4.5`);
        // вторичная и основная различимы между собой (закон владельца 13.10: «вторичная/основная» не сливаются)
        if (ratio(t.ctaFill!, t.buttonFill!) < 1.3) bad.push(`${at} основная ≈ вторичная: ${ratio(t.ctaFill!, t.buttonFill!).toFixed(2)} < 1.3`);
        // отключённая отличима и от основной
        if (ratio(t.ctaFill!, t.buttonFillDisabled!) < 1.25) bad.push(`${at} основная ≈ отключённая: ${ratio(t.ctaFill!, t.buttonFillDisabled!).toFixed(2)} < 1.25`);
        // опасная кнопка: своя заливка, отличимая от поверхностей, и читаемая подпись
        for (const s of SURFACES) if (ratio(t.dangerFill!, t[s]!) < 1.5) bad.push(`${at} опасная → ${s}: ${ratio(t.dangerFill!, t[s]!).toFixed(2)} < 1.5`);
        if (ratio(t.dangerInk!, t.dangerFill!) < 4.5) bad.push(`${at} подпись опасной ${ratio(t.dangerInk!, t.dangerFill!).toFixed(2)} < 4.5`);
        if (ratio(t.buttonFill!, t.buttonFillDisabled!) < 1.08) bad.push(`${at} отключённая не отличается от вторичной ${ratio(t.buttonFill!, t.buttonFillDisabled!).toFixed(2)} < 1.08`);
      }
    }
  }
  // зачем (координатор 14.10, находка Макетов): «Удалить аккаунт» не должна выглядеть как обычная серая кнопка — dangerFill во ВСЕХ темах краснеет (оттенок красного, не серый);
  // вторичная в цветных градиентных темах несёт тон темы и не читается как отключённая.
  const hue = (hex: string): number => {
    const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
    const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
    if (d === 0) return -1;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const chroma = (hex: string): number => { const c = rgb(hex); return (Math.max(...c) - Math.min(...c)) / 255; };
  it('опасная кнопка во всех 23 темах — красная (hue ≤ 20° или ≥ 340°, цветность ≥ 0,08), подпись ≥ 4,5', () => {
    const wrong: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
          const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Tok;
          const h = hue(t.dangerFill!);
          if (!(h >= 0 && (h <= 20 || h >= 340)) || chroma(t.dangerFill!) < 0.08) wrong.push(`${id}|${appearance}|${intensity} dangerFill ${t.dangerFill} hue=${h.toFixed(0)} chroma=${chroma(t.dangerFill!).toFixed(2)}`);
          if (ratio(t.dangerInk!, t.dangerFill!) < 4.5) wrong.push(`${id}|${appearance}|${intensity} подпись опасной < 4,5`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
  it('в светлых цветных градиентных темах (акцент/максимум) вторичная кнопка несёт тон темы (цветность ≥ 0,04) и заметно отличается от отключённой (≥ 1,25)', () => {
    const wrong: string[] = [];
    for (const id of (LIQUID_GLASS_THEME_IDS as readonly string[]).filter((x) => x.startsWith('grad_'))) {
      for (const appearance of ['light'] as const) { // светлое оформление: там поверхность кнопки была нейтрально-серой; тёмные градиенты уже несут тон
        for (const intensity of [0.5, 0.75, 1]) {
          const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Tok;
          if (chroma(t.buttonFill!) < 0.04) wrong.push(`${id}|${appearance}|${intensity} вторичная ${t.buttonFill} серая (цветность ${chroma(t.buttonFill!).toFixed(3)})`);
          if (ratio(t.buttonFill!, t.buttonFillDisabled!) < 1.25) wrong.push(`${id}|${appearance}|${intensity} вторичная ≈ отключённая ${ratio(t.buttonFill!, t.buttonFillDisabled!).toFixed(2)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
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
