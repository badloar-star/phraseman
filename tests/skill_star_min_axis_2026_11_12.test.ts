/**
 * Звезда навыков при нулях не вырождается в «стрелку» (обход экранов 12.11, заход 5, визитка).
 *
 * зачем: луч по макету — корень из уровня; при нулях на всех осях, кроме одной, фигура становилась клином. Минимальный луч 0,12 радиуса —
 * маленький ровный шестиугольник внутри первого кольца сетки (0,34); всё длиннее порога — ровно по макету.
 */
import fs from 'fs';
import path from 'path';

import { SKILL_STAR_MIN_AXIS, skillStarDisplayAxis } from '../components/skills/skill_star_floor';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('минимальный луч звезды навыков', () => {
  it('ноль и мусор рисуются минимальным лучом, а не точкой в центре', () => {
    expect(skillStarDisplayAxis(0)).toBe(SKILL_STAR_MIN_AXIS);
    expect(skillStarDisplayAxis(Number.NaN)).toBe(SKILL_STAR_MIN_AXIS);
    expect(skillStarDisplayAxis(-1)).toBe(SKILL_STAR_MIN_AXIS);
  });

  it('значения длиннее порога не меняются (как в макете), больше 1 — обрезаются до 1', () => {
    expect(skillStarDisplayAxis(0.5)).toBe(0.5);
    expect(skillStarDisplayAxis(1.4)).toBe(1);
  });

  it('минимальный луч заметно меньше первого кольца сетки (0,34)', () => {
    expect(SKILL_STAR_MIN_AXIS).toBeGreaterThan(0);
    expect(SKILL_STAR_MIN_AXIS).toBeLessThan(0.34 / 2);
  });

  it('профиль визитки «1 навык, остальные 0» — ни один луч не нулевой (нет клина)', () => {
    const shape = [0, 0, 0, Math.sqrt(1 / 10), 0, 0].map(skillStarDisplayAxis);
    expect(Math.min(...shape)).toBe(SKILL_STAR_MIN_AXIS);
  });

  it.each([
    ['components/skills/SkillsStar.tsx', 'values.map(clamp01).map(skillStarDisplayAxis)'],
    ['components/skills/SkillsRadar.tsx', 'axes.map((a) => skillStarDisplayAxis(a.value))'],
    ['components/skills/SkillLevelUpStar.tsx', 'afterRaw.map(skillStarDisplayAxis)'],
  ])('%s рисует фигуру через минимальный луч', (file, needle) => {
    expect(read(file)).toContain(needle);
  });
});
