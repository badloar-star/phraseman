// зачем (образец Макетов docs/design/v2-app/lesson-cards-light.html, решение владельца 12.10 п.81 (11)): карточки списка «Обучение» (LessonsListGlassCard) при светлом оформлении светлые «Тень» —
// заливка плашки из токенов темы (plateFillFrom/To), чернила темы. Сторож: на всех светлых темах × ступенях ползунка основной текст и приглушённая подпись читаются на заливке плашки (≥ 4,5).
import { colorContrast } from '../constants/color_contrast';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const STEPS = [
  { level: 'calm', appearance: 'light', intensity: 0 },
  { level: 'accent', appearance: 'light', intensity: 0.5 },
  { level: 'max', appearance: 'light', intensity: 1 },
] as const;

describe('список «Обучение»: карточка урока при светлом оформлении читается', () => {
  const failures: string[] = [];
  let checked = 0;
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const variant of STEPS) {
      const g = liquidGlassTokens(id, variant);
      const label = `${id}/${variant.level}`;
      for (const [stopName, stop] of [['from', g.plateFillFrom], ['to', g.plateFillTo]] as const) {
        for (const [what, fg, min] of [['text', g.text, 4.5], ['secondary', g.secondary, 4.5]] as const) {
          checked += 1;
          const ratio = colorContrast(fg, stop);
          if (ratio < min) failures.push(`${label} ${what} на plate ${stopName}: ${ratio.toFixed(2)} (${fg} на ${stop})`);
        }
      }
    }
  }

  it('карточка светлая: заливка плашки светлее текста на всех светлых темах и ступенях', () => {
    expect(checked).toBeGreaterThan(200);
    expect(failures).toEqual([]);
    for (const id of LIQUID_GLASS_THEME_IDS) {
      const g = liquidGlassTokens(id, STEPS[0]);
      expect(colorContrast(g.text, g.plateFillFrom)).toBeGreaterThan(colorContrast('#FFFFFF', g.plateFillFrom));
    }
  });
});
