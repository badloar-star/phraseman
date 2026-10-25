// зачем (Темы 25.10, docs/work/zones-contrast-2026-10-25.md, раздел «Диалоги и Пик»): «Выйти» в шторке выхода Пика и «перебор» в итоге
// раунда красились p.wrong (красный V2-палитры): на control до 3,58 (9 из 174), на плашке до 4,49. semanticInk(g).badText — тот же
// красный темы, доведённый по подложкам до ≥ 4,55. Сторож: код берёт badText, и он держит 4,5 на control и на плашке PlateFill
// во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { semanticInk } from '../constants/liquidGlassSemanticInk';

const src = (rel: string): string => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('Пик: красные подписи — badText темы, а не p.wrong (25.10)', () => {
  it('код берёт semanticInk(g).badText', () => {
    const exit = src('components/spire/SpireExitSheet.tsx');
    expect(exit).toContain("<Text style={[s.ctaText, { color: semanticInk(g).badText }]}>{spireGameText(lang, 'exit')}</Text>");
    expect(exit).not.toContain('color: p.wrong');
    const result = src('components/spire/SpireResultPanel.tsx');
    expect(result).toContain('color: v.overBad ? semanticInk(g).badText : p.textSecondary');
  });

  it('badText ≥ 4,5 на control и на плашке PlateFill во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      const ink = semanticInk(g).badText;
      n++;
      for (const s of [g.opaqueControl, g.plateFillFrom, g.plateFillTo].map((x) => flattenOver(x, g.bg))) {
        const k = paletteContrast(ink.slice(0, 7), s.slice(0, 7));
        if (k < 4.5) bad.push(`${appearance}/${id}/${level} badText на ${s}: ${k.toFixed(2)}`);
      }
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
