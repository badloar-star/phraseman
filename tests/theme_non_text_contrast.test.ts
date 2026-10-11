import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 12.10 10:00, находка Сверки): на светлых градиентных темах декоративные значки («люди» в строке набора) и
// дорожки выключенных переключателей были ≈ 1,5:1. Нетекстовые элементы по WCAG 1.4.11 обязаны держать ≥ 3:1 к поверхности.
// Токены `iconMuted` и `trackOff` проверяются на всех поверхностях, где их рисуют, во всех темах, оформлениях, уровнях и шагах.
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const LEVELS = ['calm', 'accent', 'max'] as const;
const solid = (hex: string) => hex.slice(0, 7);

describe('нетекстовые элементы читаются (>= 3:1) во всех темах', () => {
  it.each(['dark', 'light'] as const)('%s: iconMuted и trackOff на карточках, шторках, плашках и фоне', (appearance) => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of LEVELS) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level, appearance, intensity });
          const surfaces: ReadonlyArray<readonly [string, string]> = [
            ['opaqueCard', g.opaqueCard], ['card', g.card], ['opaqueSheet', g.opaqueSheet], ['opaqueControl', g.opaqueControl], ['bg', g.bg],
          ];
          for (const [tokenName, color] of [['iconMuted', g.iconMuted], ['trackOff', g.trackOff]] as const) {
            for (const [name, bg] of surfaces) {
              const ratio = paletteContrast(solid(color), solid(bg));
              if (ratio < 3) bad.push(`${tokenName}/${name} ${id}|${level}|${intensity}=${ratio.toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });

  it('токены отдаются 6-значным цветом без прозрачности', () => {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      const g = liquidGlassTokens(id, { level: 'max', appearance: 'light', intensity: 1 });
      expect(g.iconMuted).toMatch(/^#[0-9A-F]{6}$/);
      expect(g.trackOff).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
