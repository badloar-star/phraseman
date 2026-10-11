import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (проверка тем на новых экранах Карточек 2.0 и Шпиля, 14.10): приглушённый текст (`mutedText`: счётчики, номера, подписи 13 px)
// рисуют ТЕКСТОМ, а не значком — значит порог 4,5, а не 3. Замер до правки: 4,06 на низе плашки (`polar`) и 3,64 на тонированном фоне
// (`grad_jade`) в светлом оформлении. Тест держит ≥ 4,5 на ВСЕХ поверхностях во всех 23 темах × calm/accent/max × 21 шаг;
// и иерархию: приглушённый не контрастнее вторичного заметно (допуск 0,15 по отношению контраста).
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const LEVELS = ['calm', 'accent', 'max'] as const;
const solid = (hex: string) => hex.slice(0, 7);

describe('mutedText читается как текст (>= 4,5) во всех темах', () => {
  it.each(['dark', 'light'] as const)('%s: на фоне, карточке, шторке, плашке, низе плашки и выбранного', (appearance) => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of LEVELS) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level, appearance, intensity });
          const where = `${id}|${level}|${intensity}`;
          const surfaces: ReadonlyArray<readonly [string, string]> = [
            ['bg', solid(g.bg)], ['bgTop', solid(g.bgTop)], ['bgBottom', solid(g.bgBottom)],
            ['opaqueCard', solid(g.opaqueCard)], ['opaqueControl', solid(g.opaqueControl)], ['opaqueSheet', solid(g.opaqueSheet)],
            ['plateFrom', g.plateFillFrom], ['plateTo', g.plateFillTo], ['raisedFrom', g.raisedFillFrom], ['raisedTo', g.raisedFillTo],
          ];
          for (const [name, bg] of surfaces) {
            const ratio = paletteContrast(solid(g.mutedText), bg);
            if (ratio < 4.5) bad.push(`mutedText/${name} ${where}=${ratio.toFixed(2)}`);
          }
          const hierarchy = paletteContrast(solid(g.mutedText), solid(g.bg)) - paletteContrast(solid(g.secondary), solid(g.bg));
          if (hierarchy > 0.15) bad.push(`приглушённый контрастнее вторичного ${where} на ${hierarchy.toFixed(2)}`);
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });
});
