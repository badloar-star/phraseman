// зачем (контраст-гейт OTA 25.10, Темы, docs/work/release/ota-contrast-gate-2026-10-25.md): маркер «внимание» во вводе занятия
// Learning V2 красился g.cta — цветом заливки кнопки; в светлых градиентных темах он бледный и как текст давал до 1,00 (38 из 174).
// Теперь тон cta, доведённый к тексту темы. Сторож: ≥ 4,5 к фону и карточке во всех 174 сочетаниях; где cta уже читается — без изменений.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { colorContrast } from '../constants/color_contrast';
import { introMarkerWarningInk } from '../app/learning_v2_intro_marker_ink';

describe('ввод занятия: маркер «внимание» читается (25.10)', () => {
  it('код берёт introMarkerWarningInk', () => {
    const src = readFileSync(join(__dirname, '..', 'app/learning_v2_session_intro.tsx'), 'utf8');
    expect(src).toContain('return { color: introMarkerWarningInk(g), fontWeight: "700", strike: false, size: 16 };');
    expect(src).not.toContain('return { color: g.cta, fontWeight: "700"');
  });

  it('≥ 4,5 к фону и карточке во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      const ink = introMarkerWarningInk(g);
      for (const s of [g.bg, flattenOver(g.opaqueCard, g.bg)]) {
        const k = colorContrast(ink, s.slice(0, 7));
        if (k < 4.5) bad.push(`${appearance}/${id}/${level} на ${s}: ${k.toFixed(2)}`);
      }
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
