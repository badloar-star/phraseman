import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (находка контраста «Авроры» 12.10): accentGraphic — цвет графики темы (кольца, полосы, точки, кромки). Он обязан быть виден (≥ 3:1) на фоне, карточке, шторке и плашке
// во ВСЕХ темах, обоих оформлениях и на всех оттенках; в тёмном оформлении совпадать с accent (тёмный вид не меняется); в светлом — меняться только там, где accent сливается.
const APPEARANCES = ['dark', 'light'] as const;
const INTENSITIES = [0, 0.25, 0.5, 0.75, 1];
const solid = (hex: string) => hex.slice(0, 7);

describe('accentGraphic — цвет графики темы', () => {
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const appearance of APPEARANCES) {
      for (const intensity of INTENSITIES) {
        it(`${id}/${appearance}/${intensity}`, () => {
          const g = liquidGlassTokens(id, { appearance, intensity, level: liquidGlassLevelForIntensity(intensity) });
          // зачем (17.10): графика акцента лежит и на заливке buttonFill (дорожка прогресса, пилюля счётчика) — она в списке поверхностей, как и в самом токене
          const surfaces = [g.bg, g.bgTop, g.bgBottom, g.opaqueCard, g.opaqueControl, g.opaqueSheet, g.buttonFill];
          const worstGraphic = Math.min(...surfaces.map((s) => paletteContrast(solid(g.accentGraphic), solid(s))));
          expect(worstGraphic).toBeGreaterThanOrEqual(3);
          const worstAccent = Math.min(...surfaces.map((s) => paletteContrast(solid(g.accent), solid(s))));
          if (worstAccent >= 3.2) expect(g.accentGraphic).toBe(g.accent); // accent и так виден — не трогаем
          if (appearance === 'dark') {
            expect(g.accentGraphic).toBe(g.accent); // тёмный вид не меняется
            expect(g.accentTextSafe).toBe(g.accent);
          } else {
            expect(g.accentTextSafe).toBe(g.accentText);
          }
        });
      }
    }
  }
});
