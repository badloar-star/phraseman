/**
 * История «Новый уровень» — что показать, когда навык поднялся на уровень.
 * Эталон — docs/design/v2-app/elevate-skills.js, функция `story`: кадр «Новый уровень» и кадр «Что дальше».
 *
 * зачем: праздник строится из ФАКТА — двух состояний очков «до» и «после», а не из сохранённой записи
 * (правило владельца 01.09: празднование не кладётся в постоянную очередь и показывается на своём экране).
 * Уровень на самом деле не вырос (запись устарела, итоги уже другие) — истории нет: функция вернёт null.
 */
import { SKILL_LEVEL_MAX, skillProgressFromPoints, type SkillTotals } from './skill_levels';
import { SKILL_IDS, type SkillId } from './skill_points_table';
import { skillAxisValue } from './skill_visibility';

export interface SkillLevelUpStory {
  readonly skill: SkillId;
  /** Номер навыка в звезде — какой луч подсветить. */
  readonly skillIndex: number;
  /** Число на первом кадре считает от `fromLevel` до `toLevel`. */
  readonly fromLevel: number;
  readonly toLevel: number;
  /** Длины лучей 0…1 до и после — звезда переходит от первой фигуры ко второй. */
  readonly starBefore: readonly number[];
  readonly starAfter: readonly number[];
  /** Второй кадр: следующий уровень, доля полоски и сколько очков до него. null — взят последний уровень. */
  readonly next: Readonly<{ level: number; ratio: number; pointsLeft: number }> | null;
}

function starValues(totals: SkillTotals): number[] {
  return SKILL_IDS.map((id) => {
    const progress = skillProgressFromPoints(totals[id]);
    return skillAxisValue(progress.level, progress.ratio);
  });
}

/** История для навыка `skill`, если между `before` и `after` его уровень действительно вырос; иначе null. */
export function buildSkillLevelUpStory(skill: SkillId, before: SkillTotals, after: SkillTotals): SkillLevelUpStory | null {
  const was = skillProgressFromPoints(before[skill]);
  const now = skillProgressFromPoints(after[skill]);
  if (now.level <= was.level) return null;
  const next = now.level >= SKILL_LEVEL_MAX
    ? null
    : { level: now.level + 1, ratio: now.ratio, pointsLeft: Math.max(0, Math.ceil(now.levelCost - now.intoLevel)) };
  return {
    skill,
    skillIndex: SKILL_IDS.indexOf(skill),
    fromLevel: was.level,
    toLevel: now.level,
    starBefore: starValues(before),
    starAfter: starValues(after),
    next,
  };
}

/**
 * Какой навык праздновать, если за одно занятие выросло несколько: тот, что поднялся на большее число уровней,
 * при равенстве — с более высоким новым уровнем, затем по порядку звезды. Одна история за раз — без очереди.
 */
export function pickSkillLevelUpStory(before: SkillTotals, after: SkillTotals): SkillLevelUpStory | null {
  const stories = SKILL_IDS.flatMap((skill) => {
    const story = buildSkillLevelUpStory(skill, before, after);
    return story ? [story] : [];
  });
  if (stories.length === 0) return null;
  return stories.reduce((best, story) => {
    const gain = story.toLevel - story.fromLevel;
    const bestGain = best.toLevel - best.fromLevel;
    if (gain !== bestGain) return gain > bestGain ? story : best;
    return story.toLevel > best.toLevel ? story : best;
  });
}
