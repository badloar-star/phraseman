// зачем (контраст-гейт OTA 25.10, Темы, docs/work/release/ota-contrast-gate-2026-10-25.md): на экране итога невыбитые звёзды красились
// opaqueControl на фоне экрана — 1,00 в светлых темах (звезды не видно) и до 1,09 в тёмных. В макете (practice.html `.stars3 .i.off`
// #2C2C2E на чёрном) пустая звезда тёмная, но видна — ≈ 1,5. Сторож: тон ≥ 1,5 к фону во всех 174 сочетаниях, а где opaqueControl
// уже давал ≥ 1,5, цвет не меняется.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { colorContrast } from '../constants/color_contrast';
import { DONE_STAR_OFF_MIN, doneStarOffTone } from '../components/completion/done_star_tone';

describe('итог: невыбитая звезда видна на фоне (25.10)', () => {
  it('код берёт doneStarOffTone', () => {
    const src = readFileSync(join(__dirname, '..', 'components/completion/V2DoneScreen.tsx'), 'utf8');
    expect(src).toContain('color={on ? g.text : doneStarOffTone(g)}');
  });

  it('≥ 1,5 к фону во всех 174 сочетаниях; где контрол уже ≥ 1,5 — тот же цвет', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      const tone = doneStarOffTone(g);
      const surfaces = [g.bg, g.bgTop, g.bgBottom];
      const k = Math.min(...surfaces.map((s) => colorContrast(tone, s.slice(0, 7))));
      if (k < DONE_STAR_OFF_MIN) bad.push(`${appearance}/${id}/${level}: ${k.toFixed(2)}`);
      const was = Math.min(...surfaces.map((s) => colorContrast(g.opaqueControl.slice(0, 7), s.slice(0, 7))));
      if (was >= DONE_STAR_OFF_MIN && tone !== g.opaqueControl.slice(0, 7).toUpperCase()) bad.push(`${appearance}/${id}/${level}: цвет сменён без нужды`);
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
