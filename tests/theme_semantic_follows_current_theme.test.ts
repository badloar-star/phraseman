// ЗАМОК ВЛАДЕЛЬЦА 22.10: «цвета строго оттенки текущей темы» (ослабить может только новое слово владельца; docs/work/OWNER_LOCKS.md)
// зачем (закон владельца 22.10: «ЦВЕТА СТРОГО ОТТЕНКИ ТЕКУЩЕЙ ТЕМЫ», в т. ч. «верно/неверно»): Theme (t.*), которой пользуются ~216 мест через t.correct / t.wrong / t.correctBg / t.wrongBg / t.correctText,
// строится из токенов ТЕКУЩЕЙ темы (makeLiquidGlassTheme), а не из базы DARK (#47C870 / #F05454 / #042010). Сторож: поля равны токенам good/bad во всех темах × оформлениях × уровнях,
// «верно/неверно» читаются на карточке/плите/фоне ≥ 4,5, текст на заливке — ≥ 4,5.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { DARK } from '../constants/theme';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

describe('Theme: верно/неверно — токены текущей темы', () => {
  it('correct/wrong/…Bg/correctText равны токенам темы, а не базе DARK; контраст ≥ 4,5', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const variant = { level, appearance } as never;
          const g = liquidGlassTokens(id, variant);
          const t = makeLiquidGlassTheme(id, DARK, variant);
          const tag = `${appearance}/${id}/${level}`;
          // correct/wrong = good/bad темы или их более глубокий тон (чтобы читаться и на подложке correctBg/wrongBg), но не цвет базы DARK
          if (t.correct === DARK.correct || t.wrong === DARK.wrong) misses.push(`${tag}: correct/wrong остались цветом базы DARK`);
          if (contrastRatio(t.correct, g.good) > 1.8 || contrastRatio(t.wrong, g.bad) > 1.8) misses.push(`${tag}: correct/wrong далеко от токенов good/bad`);
          if (t.correctBg !== g.goodSoft || t.wrongBg !== g.badSoft) misses.push(`${tag}: correctBg/wrongBg не из токенов темы`);
          for (const [name, color] of [['correct', t.correct], ['wrong', t.wrong]] as const) {
            for (const [bn, back] of [['bgCard', t.bgCard], ['bgSurface', t.bgSurface]] as const) {
              if (contrastRatio(color, back.slice(0, 7)) < 4.5) misses.push(`${tag}: ${name} на ${bn} ${contrastRatio(color, back.slice(0, 7)).toFixed(2)}`);
            }
          }
          // цвет и основной текст на собственной полупрозрачной подложке correctBg/wrongBg (поверх карточки и контрола)
          for (const back of [t.bgCard, t.bgSurface]) {
            const okBg = flattenOver(t.correctBg, back);
            const badBg = flattenOver(t.wrongBg, back);
            if (contrastRatio(t.correct, okBg) < 4.5) misses.push(`${tag}: correct на correctBg ${contrastRatio(t.correct, okBg).toFixed(2)}`);
            if (contrastRatio(t.wrong, badBg) < 4.5) misses.push(`${tag}: wrong на wrongBg ${contrastRatio(t.wrong, badBg).toFixed(2)}`);
            if (contrastRatio(t.textPrimary, okBg) < 4.5 || contrastRatio(t.textPrimary, badBg) < 4.5) misses.push(`${tag}: textPrimary на correctBg/wrongBg`);
          }
          for (const [name, fill] of [['correct', t.correct], ['wrong', t.wrong]] as const) {
            if (contrastRatio(t.correctText, fill) < 4.5) misses.push(`${tag}: correctText на ${name} ${contrastRatio(t.correctText, fill).toFixed(2)}`);
          }
        }
      }
    }
    expect(misses.slice(0, 12)).toEqual([]);
  });
});
