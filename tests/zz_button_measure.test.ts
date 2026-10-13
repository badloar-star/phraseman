// ВРЕМЕННЫЙ прототип токенов кнопок (№35); удаляется после переноса в constants/ и написания сторожа tests/button_tokens_contrast.test.ts
import fs from 'node:fs';
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';

type Tok = Record<string, string>;
const rgb = (hex: string): number[] => { const h = hex.replace('#', '').slice(0, 6); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (hex: string): number => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const mix = (fg: string, bg: string, a: number): string => {
  const f = rgb(fg); const b = rgb(bg);
  return '#' + f.map((v, i) => Math.round(v * a + b[i]! * (1 - a)).toString(16).padStart(2, '0')).join('');
};
const SURF = ['bg', 'bgTop', 'bgBottom', 'opaqueCard', 'opaqueSheet'];
const minSurf = (c: string, t: Tok): number => Math.min(...SURF.map((s) => ratio(c, t[s]!)));

/** Вторичная заливка: сдвигаем opaqueControl к цвету текста, пока она отличима от всех поверхностей (>=1.6) и текст читается (>=4.6). */
function secondaryFill(t: Tok): string {
  let best = t.opaqueControl!;
  let bestScore = -1;
  for (let k = 0; k <= 0.9; k += 0.02) {
    const c = mix(t.text!, t.opaqueControl!, k);
    const rs = minSurf(c, t);
    const rt = ratio(t.text!, c);
    if (rs >= 1.6 && rt >= 4.6) return c;
    const score = Math.min(rs / 1.6, 1) + Math.min(rt / 4.6, 1);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

it('measure', () => {
  const stat: Record<string, { min: number; at: string; below: number; n: number }> = {};
  const note = (k: string, v: number, at: string, th: number): void => {
    const s = (stat[k] ||= { min: 99, at: '', below: 0, n: 0 });
    s.n++;
    if (v < th) s.below++;
    if (v < s.min) { s.min = v; s.at = at; }
  };
  const primaryBad: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Tok;
        const at = `${id}|${appearance}|${intensity}`;
        const cta = (t.cta ?? t.accent)!;
        const ms = minSurf(cta, t);
        if (ms < 1.5) primaryBad.push(`${at} cta=${cta} minSurf=${ms.toFixed(2)} bg=${t.bg}`);
        note('PRIMARY minSurf>=3', ms, at, 3);
        const fill = secondaryFill(t);
        note('NEW secondary minSurf>=1.5', minSurf(fill, t), at, 1.5);
        note('NEW secondary text>=4.5', ratio(t.text!, fill), at, 4.5);
        // отключённая: плоская (заливка ближе к фону шторки) + подпись, подтянутая к заливке до 3.2
        const under = t.opaqueSheet!;
        const disFill = mix(fill, under, 0.5);
        let disInk = t.text!;
        for (let a = 1; a >= 0.2; a -= 0.02) { disInk = mix(t.text!, disFill, a); if (ratio(disInk, disFill) <= 3.4) break; }
        note('NEW disabled label>=3', ratio(disInk, disFill), at, 3);
        note('NEW disabled differs from secondary>=1.08', ratio(fill, disFill), at, 1.08);
      }
    }
  }
  const out = Object.entries(stat).map(([k, v]) => `${k.padEnd(44)} min ${v.min.toFixed(2)} below ${v.below}/${v.n} worst ${v.at}`);
  fs.writeFileSync('C:/Temp/claude/work/measure.out', out.join('\n') + '\n\nprimary<1.5:\n' + primaryBad.join('\n') + '\n');
});
