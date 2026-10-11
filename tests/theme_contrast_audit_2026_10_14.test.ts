// зачем (аудит контраста «Тени» 14.10, решение координатора п.63): статусный текст ≥ 4,5 на верхнем тоне фона, неактивные значки и дорожки ≥ 3 на верхнем
// тоне фона и на выбранной плашке — во всех 23 темах, обоих оформлениях и на всех шагах ползунка.
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';

const lum = (hex: string) => {
  const h = hex.replace('#', '').slice(0, 6);
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('аудит контраста токенов 14.10', () => {
  const bad: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS) for (const appearance of ['dark', 'light'] as const) for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
    const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Record<string, string>;
    const at = `${id}|${appearance}|${intensity}`;
    for (const name of ['good', 'bad', 'warn', 'info']) if (ratio(t[name]!, t.bgTop!) < 4.5) bad.push(`${at} ${name}→bgTop`);
    for (const name of ['iconMuted', 'trackOff']) {
      for (const surface of ['bgTop', 'raisedFillFrom', 'plateFillFrom', 'opaqueCard']) if (ratio(t[name]!, t[surface]!) < 3) bad.push(`${at} ${name}→${surface}`);
    }
  }
  it('нарушений нет', () => {
    expect(bad).toEqual([]);
  });
});
