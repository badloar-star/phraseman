// зачем (координатор 25.10, замер docs/work/learning-v2-session-contrast-2026-10-25.md): «верно / неверно» в занятии стоит не только на карточке,
// но и на фоне экрана (плитки ответов, блок «Правильно») и на 18 %-заливке чипов — сырой good/bad там давал 3,55–3,76 в светлых темах.
// semanticInk с фоном (bg) обязан держать ≥ 4,5 на каждой из этих подложек во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум,
// а без фона — вести себя как раньше (только карточка, контрол и мягкая заливка поверх них).
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { semanticInk, semanticInkSurfaces } from '../constants/liquidGlassSemanticInk';

describe('semanticInk: «верно / неверно» читается на всех подложках занятия', () => {
  it('с фоном — ≥ 4,5 на карточке, контроле, мягкой заливке поверх них и фона, фоне и 18 % поверх фона и карточки', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          const g = liquidGlassTokens(id as never, { level, appearance } as never);
          const ink = semanticInk(g);
          for (const [name, color, tone, soft] of [['goodText', ink.goodText, g.good, g.goodSoft], ['badText', ink.badText, g.bad, g.badSoft]] as const) {
            for (const s of semanticInkSurfaces(g, tone, soft)) {
              const k = paletteContrast(color.slice(0, 7), s.slice(0, 7));
              if (k < 4.5) bad.push(`${appearance}/${id}/${level} ${name} ${color} на ${s}: ${k.toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('без фона подложек столько же, сколько было до 25.10 (карточка, контрол, мягкая поверх них)', () => {
    const g = liquidGlassTokens('ink' as never, { level: 'max', appearance: 'light' } as never);
    const { bg: _bg, ...noBg } = g;
    expect(semanticInkSurfaces(noBg, g.good, g.goodSoft)).toHaveLength(4);
    expect(semanticInkSurfaces(g, g.good, g.goodSoft)).toHaveLength(8);
  });
});
