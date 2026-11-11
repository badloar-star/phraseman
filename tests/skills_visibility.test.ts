import { EMPTY_SKILL_TOTALS } from '../modules/skills/skill_levels';
import {
  parseSkillLevels, skillAxisValue, skillLevelsFromTotals, skillLevelsToWire, skillsBlockVisible, type SkillLevels,
} from '../modules/skills/skill_visibility';

const LEVELS: SkillLevels = { listening: 14, speech: 17, vocab: 11, grammar: 12, speed: 8, social: 15 };

describe('кому видны навыки (владелец 11.11, D207)', () => {
  it('я вижу свои навыки всегда — с «Про» и без', () => {
    expect(skillsBlockVisible({ viewer: 'self', ownerHasPro: false, levels: LEVELS })).toBe(true);
    expect(skillsBlockVisible({ viewer: 'self', ownerHasPro: true, levels: LEVELS })).toBe(true);
  });

  it('друг видит навыки всегда — с «Про» у хозяина и без', () => {
    expect(skillsBlockVisible({ viewer: 'friend', ownerHasPro: false, levels: LEVELS })).toBe(true);
    expect(skillsBlockVisible({ viewer: 'friend', ownerHasPro: true, levels: LEVELS })).toBe(true);
  });

  it('посторонний видит навыки только на визитке «Про»', () => {
    expect(skillsBlockVisible({ viewer: 'stranger', ownerHasPro: true, levels: LEVELS })).toBe(true);
    expect(skillsBlockVisible({ viewer: 'stranger', ownerHasPro: false, levels: LEVELS })).toBe(false);
  });

  it('неизвестные уровни не рисуются никому — нули вместо них не подставляем', () => {
    expect(skillsBlockVisible({ viewer: 'self', ownerHasPro: true, levels: null })).toBe(false);
    expect(skillsBlockVisible({ viewer: 'friend', ownerHasPro: true, levels: null })).toBe(false);
    expect(skillsBlockVisible({ viewer: 'stranger', ownerHasPro: true, levels: null })).toBe(false);
  });

  it('новичок с нулевыми уровнями друзьям виден: ноль — это известное значение', () => {
    const zero = skillLevelsFromTotals(EMPTY_SKILL_TOTALS);
    expect(skillsBlockVisible({ viewer: 'friend', ownerHasPro: false, levels: zero })).toBe(true);
  });
});

describe('что уходит другим: только шесть уровней', () => {
  it('очки превращаются в уровни, сами очки в записи не остаются', () => {
    // цена уровней 0→1 и 1→2: 60 и 70 очков
    const levels = skillLevelsFromTotals({ ...EMPTY_SKILL_TOTALS, listening: 59, speech: 60, vocab: 130, social: 1_000_000 });
    expect(levels).toEqual({ listening: 0, speech: 1, vocab: 2, grammar: 0, speed: 0, social: 30 });
  });

  it('запись для передачи — шесть чисел в порядке навыков и разбирается обратно без потерь', () => {
    const wire = skillLevelsToWire(LEVELS);
    expect(wire).toEqual([14, 17, 11, 12, 8, 15]);
    expect(parseSkillLevels(wire)).toEqual(LEVELS);
  });

  it.each([
    ['не массив', { listening: 3 }],
    ['пусто', null],
    ['пять чисел', [1, 2, 3, 4, 5]],
    ['семь чисел', [1, 2, 3, 4, 5, 6, 7]],
    ['уровень выше 30', [1, 2, 3, 4, 5, 31]],
    ['отрицательный уровень', [1, 2, 3, 4, 5, -1]],
    ['дробный уровень', [1, 2, 3, 4, 5, 1.5]],
    ['строка вместо числа', [1, 2, 3, 4, 5, '6']],
    ['не число', [1, 2, 3, 4, 5, Number.NaN]],
  ])('чужая запись отбрасывается целиком: %s', (_name, raw) => {
    expect(parseSkillLevels(raw)).toBeNull();
  });
});

describe('длина луча и полоски', () => {
  it('корень от доли уровня: 0 → 0, 30 → 1, первые уровни уже заметны', () => {
    expect(skillAxisValue(0)).toBe(0);
    expect(skillAxisValue(30)).toBe(1);
    expect(skillAxisValue(3)).toBeCloseTo(Math.sqrt(3 / 30), 6);
    expect(skillAxisValue(14, 0.4)).toBeCloseTo(Math.sqrt(14.4 / 30), 6);
  });

  it('битые значения не выводят луч за границы', () => {
    expect(skillAxisValue(Number.NaN)).toBe(0);
    expect(skillAxisValue(99, 5)).toBe(1);
    expect(skillAxisValue(-4, -1)).toBe(0);
  });
});
