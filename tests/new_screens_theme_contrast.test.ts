// зачем (координатор 22.10: «сегодняшние НОВЫЕ экраны и плашки — проверь цвета и контраст во всех 23 темах × 2 оформления»): пары, которые рисуют «Моя неделя» и лента «Итоги недели»,
// «Фраза дня вдвоём», док «Ты на вершине недели», экран темы Диалогов, «Слова» и окно согласия, читаются во всех темах: текст ≥ 4,5, значки/формы ≥ 3.
// Закон владельца 22.10: «цвета строго оттенки текущей темы» — экраны берут только токены темы (glass.* / useSpirePalette), это закреплено и храповиком литералов.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { semanticInk } from '../constants/liquidGlassSemanticInk';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

describe('новые экраны 22.10: пары цветов читаются во всех темах', () => {
  it('текст, акцентный текст, «готово», выбранная плашка, главная и неактивная кнопка', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never);
          const tag = `${appearance}/${id}/${level}`;
          const check = (name: string, fg: string, bg: string, need: number): void => {
            const r = contrastRatio(fg, bg);
            if (r < need) misses.push(`${tag} · ${name}: ${r.toFixed(2)} < ${need}`);
          };
          for (const [surfaceName, surface] of [['карточка', g.opaqueCard], ['контрол', g.opaqueControl]] as const) {
            check(`текст на ${surfaceName}`, g.text, surface, 4.5);
            check(`вторичный текст на ${surfaceName}`, g.secondary, surface, 4.5);
          }
          check('акцентный текст на карточке', g.accentTextSafe, g.opaqueCard, 4.5);
          const ink = semanticInk(g);
          check('«готово» (goodText) на goodSoft поверх контрола', ink.goodText, flattenOver(g.goodSoft, g.opaqueControl), 4.5);
          check('«готово» (goodText) на goodSoft поверх карточки', ink.goodText, flattenOver(g.goodSoft, g.opaqueCard), 4.5);
          check('ошибка (badText) на badSoft поверх карточки', ink.badText, flattenOver(g.badSoft, g.opaqueCard), 4.5);          const selected = flattenOver(g.selected, g.opaqueCard);
          check('текст на выбранной плашке', g.text, selected, 4.5);
          check('главная кнопка: подпись', g.ctaFillInk, g.ctaFill, 4.5);
          check('неактивная кнопка: значок и подпись', g.buttonInkDisabled, g.buttonFillDisabled, 3);
        }
      }
    }
    expect(misses.slice(0, 15)).toEqual([]);
  });
});
