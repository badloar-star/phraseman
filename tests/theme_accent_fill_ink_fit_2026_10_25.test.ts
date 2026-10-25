// зачем (Темы 25.10, перемер окна «Восстановить аккаунт?» по просьбе ВХОДа): с 17.10 главные кнопки — пара ctaFill/ctaFillInk,
// но ThemeAccentFill клал поверх ярко accentGradient. В 12 из 174 сочетаний (Максимум светлых градиентных тем, Титан тёмный
// Акцент/Максимум) градиент закрывал ctaFill, подпись ctaFillInk падала до 1,3–3,0. Теперь фактура получает подпись и не рисуется,
// если та на ней не читается. Сторож: видимая поверхность кнопки (градиент или ctaFill) держит ≥ 4,5 к ctaFillInk во всех 174
// сочетаниях, а кнопки с ctaFillInk передают ink в ThemeAccentFill.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { colorContrast } from '../constants/color_contrast';
import { themeAccentGradientFitsInk } from '../components/v2/ThemeAccentFill';

const CALLERS: ReadonlyArray<[string, string]> = [
  ['components/account/AccountRestoreSummaryDialog.tsx', '<ThemeAccentFill glass={glass} radius={25} ink={glass.ctaFillInk} />'],
  ['components/v2/GlassAlertDialog.tsx', '<ThemeAccentFill glass={glass} radius={22} ink={glass.ctaFillInk} />'],
  ['app/flashcards/CardsSessionResultV2.tsx', '<ThemeAccentFill glass={g} radius={24} ink={g.ctaFillInk} />'],
  ['components/learning-v2/LearningV2Glass.tsx', '<ThemeAccentFill glass={g} radius={26} ink={g.ctaFillInk} />'],
];

describe('фактура главной кнопки не прячет подпись ctaFillInk (25.10)', () => {
  it.each(CALLERS)('%s передаёт подпись в ThemeAccentFill', (file, line) => {
    expect(readFileSync(join(__dirname, '..', file), 'utf8')).toContain(line);
  });

  it('видимая поверхность кнопки держит ≥ 4,5 к ctaFillInk во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    let suppressed = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      const ink = g.ctaFillInk.slice(0, 7);
      const vivid = g.level === 'accent' || g.level === 'max';
      const gradient = (vivid || g.isLight) && g.accentGradient && g.accentGradient.length >= 2 ? (g.accentGradient as readonly string[]) : null;
      const drawn = gradient ? themeAccentGradientFitsInk(gradient, g.ctaFillInk) : false;
      if (gradient && !drawn) suppressed++;
      const surfaces = drawn && gradient ? gradient.filter((s) => /^#[0-9a-f]{6}/i.test(s)) : [g.ctaFill];
      for (const s of surfaces) {
        const k = colorContrast(ink, s.slice(0, 7));
        if (k < 4.5) bad.push(`${appearance}/${id}/${level} ctaFillInk на ${s}: ${k.toFixed(2)}`);
      }
    }
    expect(n).toBe(174);
    expect(suppressed).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });

  it('подпись accentInk (прочие кнопки) фактуру не теряет', () => {
    for (const appearance of ['dark', 'light'] as const) for (const level of ['accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      if (g.accentGradient && g.accentGradient.length >= 2) expect(themeAccentGradientFitsInk(g.accentGradient as readonly string[], g.accentInk)).toBe(true);
    }
    expect(themeAccentGradientFitsInk(['#7EF0C8', '#7EF0C8'], undefined)).toBe(true);
  });
});
