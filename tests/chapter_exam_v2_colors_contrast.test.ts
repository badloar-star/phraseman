// зачем (координатор 25.10, карта 4 · ТЕМЫ docs/work/exam-workshop-theme-token-map-2026-10-25.md): цвета экрана экзамена главы v2 —
// токены темы; пары «цвет / фон» карты закреплены здесь: если палитра темы сдвинется, тест покажет, какая роль упала. Текст ≥ 4,5,
// значки и полосы (графика) ≥ 3,0; полупрозрачные подложки сведены на свой фон (flattenOver), как их видит человек.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { chapterExamV2ColorsOf } from '../components/learning-v2/exam_v2/chapter_exam_v2_colors';
import fs from 'node:fs';
import path from 'node:path';

const TEXT = 4.5;
const GRAPHIC = 3;

describe('экзамен главы v2: цвета по карте тем', () => {
  it('во всех темах × 2 оформления × 3 уровня пары карты держат порог', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          const g = liquidGlassTokens(id as never, { level, appearance } as never);
          const c = chapterExamV2ColorsOf(g);
          const bg = c.bg.slice(0, 7);
          const on = (soft: string, base: string) => flattenOver(soft, base.slice(0, 7));
          const pairs: readonly [string, string, string, number][] = [
            ['E1 счётчик', c.counter, bg, TEXT],
            ['E2 полоса на дорожке', c.trackFill, c.track, GRAPHIC],
            ['E3 полоса на фоне', c.trackFill, bg, GRAPHIC],
            ['E4 значок на плитке', c.taskIcon, on(c.taskTile, bg), GRAPHIC],
            ['E5 ситуация', c.situationText, on(c.situationFill, bg), TEXT],
            ['E7 текст поля', c.text, c.card, TEXT],
            ['E8 заглушка', c.placeholder, c.card, TEXT],
            ['E9 курсор', c.caret, c.card, GRAPHIC],
            ['E10 верный ответ', c.fieldGood, c.card, TEXT],
            ['E11 неверный ответ', c.fieldBad, c.card, TEXT],
            ['E12 значок ✓', c.goodIcon, on(c.goodPlate, bg), GRAPHIC],
            ['E13 текст «Верно»', c.plateText, on(c.goodPlate, bg), TEXT],
            ['E14 значок ✕', c.badIcon, on(c.badPlate, bg), GRAPHIC],
            ['E15 текст «Неверно»', c.plateText, on(c.badPlate, bg), TEXT],
            ['E17 кнопка', c.ctaInk, c.ctaFill, TEXT],
            ['E18 кнопка неактивна', c.ctaInkDisabled, c.ctaFillDisabled, TEXT],
            ['E21 точки', c.dotOn, c.dotOff, GRAPHIC],
            ['E22 кубок', c.trophyIcon, on(c.trophyFill, bg), GRAPHIC],
            ['E23 «+40»', c.chipText, c.chip, TEXT],
            ['E27 «2 ошибки»', c.topicErrors, c.card, TEXT],
            ['E28 галочка', c.doneCheck, c.card, GRAPHIC],
            ['E29 «Пересдать через»', c.waitText, c.chip, TEXT],
            ['E31 ссылка', c.link, bg, TEXT],
            ['E32 значок главы', c.chapterIcon, c.chapterTile, GRAPHIC],
          ];
          for (const [role, fg, back, need] of pairs) {
            const k = paletteContrast(fg.slice(0, 7), back.slice(0, 7));
            if (k < need) bad.push(`${appearance}/${id}/${level} ${role}: ${k.toFixed(2)} < ${need}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('в коде экрана нет hex-цветов прототипа', () => {
    const dir = path.join(__dirname, '..', 'components/learning-v2/exam_v2');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      expect({ file, hex: src.match(/#[0-9A-Fa-f]{6}\b/g) ?? [] }).toEqual({ file, hex: [] });
    }
  });
});
