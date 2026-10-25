// зачем (контраст-гейт OTA 25.10, Темы, docs/work/release/ota-contrast-gate-2026-10-25.md): в окне отмены подписки подписи плашек
// «дней подряд / уроков» (шаг «не теряй прогресс») красились glass.secondary на buttonFillDisabled поверх шторки — до 3,09 в 78 из 174.
// Теперь тот же серый тон темы, доведённый к тексту (legibleOn). Сторож: код берёт offerStatLabelInk, и он ≥ 4,5 во всех 174 сочетаниях.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { colorContrast } from '../constants/color_contrast';

describe('отмена подписки: подписи плашек статистики читаются (25.10)', () => {
  it('код берёт offerStatLabelInk на обеих плашках', () => {
    const src = readFileSync(join(__dirname, '..', 'app/manage_subscription.tsx'), 'utf8');
    expect(src.split('<Text style={[S.offerStatLabel, { color: offerStatLabelInk,').length - 1).toBe(2);
    expect(src).not.toContain('<Text style={[S.offerStatLabel, { color: glass.secondary,');
  });

  it('подпись ≥ 4,5 на плашке во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      const plate = flattenOver(g.buttonFillDisabled, flattenOver(g.opaqueSheet, g.bg));
      const ink = legibleOn(g.secondary, g.text, [plate], 4.55);
      const k = colorContrast(ink, plate.slice(0, 7));
      if (k < 4.5) bad.push(`${appearance}/${id}/${level}: ${k.toFixed(2)}`);
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
