import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 12.10 04:55, кадр CHK_w_light_session): текст цветом акцента («Показать ответ», «Ты не против мне помочь?»)
// на светлой карточке был бледным: на градиентных темах в «Максимум» 1.38–1.76:1. `accentText` — токен ИМЕННО для текста/значков
// цветом акцента; он обязан читаться (≥ 4.5) на всех поверхностях, куда его кладут, во всех темах, оформлениях и уровнях.
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const LEVELS = ['calm', 'accent', 'max'] as const;
const solid = (hex: string) => hex.slice(0, 7);

const SURFACES: ReadonlyArray<readonly [string, (g: GlassTokens) => string]> = [
  ['opaqueCard', (g) => g.opaqueCard],
  ['card', (g) => g.card],
  ['opaqueSheet', (g) => g.opaqueSheet],
  ['opaqueControl', (g) => g.opaqueControl],
];

describe('accentText читается на поверхностях во всех темах', () => {
  it.each(['dark', 'light'] as const)('%s: accentText >= 4.5 на карточках, шторках и плашках', (appearance) => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of LEVELS) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level, appearance, intensity });
          for (const [name, bg] of SURFACES) {
            const ratio = paletteContrast(solid(g.accentText), solid(bg(g)));
            if (ratio < 4.5) bad.push(`${id}|${level}|${intensity}|${name}=${ratio.toFixed(2)}`);
          }
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });
});
