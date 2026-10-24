// зачем (координатор 24.10): «Удалить» красным на шторке (mpColors(g).bad на opaqueSheet) читается во всех темах.
// Порог 4,5 — норма текста; токен bad держит запас ≥ 4,8, так что подкрутка темы уронит тест раньше, чем текст станет нечитаемым.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { mpColors } from '../components/mistakes-panel/panelPaint';

describe('красное «Удалить» на шторке', () => {
  it('bad к opaqueSheet ≥ 4,5 во всех 23 темах × 2 оформлениях × 3 уровнях', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          const g = liquidGlassTokens(id, { level, appearance });
          const r = contrastRatio(mpColors(g).bad.slice(0, 7), g.opaqueSheet.slice(0, 7));
          if (r < 4.5) bad.push(`${appearance}/${id}/${level} ${r.toFixed(2)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
