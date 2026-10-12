// зачем (решение владельца 12.10, журнал п.81 (11)): плашка урока при светлом оформлении — светлая. Текст обязан читаться на всех её заливках во ВСЕХ темах × ступенях ползунка (спокойно/середина/максимум).
import { colorContrast } from '../constants/color_contrast';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { lessonCardLightSurface, mixHex } from '../components/lessons/lessonCardLightSurface';

const STEPS = [
  { level: 'calm', appearance: 'light', intensity: 0 },
  { level: 'accent', appearance: 'light', intensity: 0.5 },
  { level: 'max', appearance: 'light', intensity: 1 },
] as const;
const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

describe('светлая плашка урока: контраст по всем темам × ступеням ползунка', () => {
  const failures: string[] = [];
  let checked = 0;

  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const variant of STEPS) {
      const tokens = liquidGlassTokens(id, variant);
      for (const level of LEVELS) {
        const ink = tokens[`level${level}` as 'levelA1'];
        const surface = lessonCardLightSurface(ink, tokens);
        const label = `${id}/${variant.level}/${level}`;
        const check = (what: string, fg: string, bg: string, min: number) => {
          checked += 1;
          const ratio = colorContrast(fg, bg);
          if (ratio < min) failures.push(`${label} ${what}: ${ratio.toFixed(2)} < ${min} (${fg} на ${bg})`);
        };
        // основной текст — на всех трёх остановках открытой плашки и на заливке прогресса
        for (const stop of surface.fill) check('текст на открытой', surface.text, stop, 4.5);
        for (const stop of surface.progress) check('текст на прогрессе', surface.text, stop, 4.5);
        // закрытая плашка: приглушённый текст ≥ 4,5
        for (const stop of surface.lockedFill) check('текст на закрытой', surface.lockedText, stop, 4.5);
        // плашка отделяется от поверхности списка: самая тёмная остановка отличается от основы темы, пусть и мягко (кромка и тень добавляют остальное)
        check('кромка прогресса видна на заливке', surface.edge, surface.fill[0], 1.1);
      }
    }
  }

  it('все пары текст/фон набирают нужный контраст', () => {
    expect(checked).toBeGreaterThan(1000);
    expect(failures).toEqual([]);
  });
});

describe('смесь цветов', () => {
  it('0 — основа, 1 — верх, посередине — среднее; значения вне диапазона зажимаются', () => {
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mixHex('#102030', '#FFFFFF', 2)).toBe('#ffffff');
    expect(mixHex('#102030', '#FFFFFF', -1)).toBe('#102030');
  });

  it('результат кэшируется: те же входы — та же ссылка (стабильный пропс для memo плашки)', () => {
    const tokens = liquidGlassTokens(LIQUID_GLASS_THEME_IDS[0], STEPS[0]);
    const ink = tokens.levelA1;
    expect(lessonCardLightSurface(ink, tokens)).toBe(lessonCardLightSurface(ink, tokens));
  });
});
