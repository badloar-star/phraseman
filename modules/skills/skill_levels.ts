/**
 * Уровни навыка. Владелец 11.11.2026: 30 уровней у каждого навыка, уровни только растут,
 * цена уровня — 60 очков плюс 10 за каждый уже взятый.
 */
import { SKILL_IDS, STUDY_SKILL_IDS, type SkillId } from './skill_points_table';

export const SKILL_LEVEL_MAX = 30;
const LEVEL_BASE_COST = 60;
const LEVEL_COST_STEP = 10;

export type SkillTotals = Readonly<Record<SkillId, number>>;

export const EMPTY_SKILL_TOTALS: SkillTotals = Object.freeze({
  listening: 0, speech: 0, vocab: 0, grammar: 0, speed: 0, social: 0,
});

/** Сколько очков стоит переход с уровня `level` на следующий. */
export function skillLevelCost(level: number): number {
  return LEVEL_BASE_COST + LEVEL_COST_STEP * Math.max(0, Math.floor(level));
}

export interface SkillProgress {
  readonly level: number;
  /** Очки, набранные внутри текущего уровня. */
  readonly intoLevel: number;
  /** Цена текущего уровня; 0 на последнем уровне. */
  readonly levelCost: number;
  /** Доля полоски 0..1; на последнем уровне всегда 1. */
  readonly ratio: number;
}

export function skillProgressFromPoints(points: number): SkillProgress {
  // зачем: чужое или битое значение (NaN, минус) не должно рисовать отрицательную полоску
  let rest = Number.isFinite(points) && points > 0 ? points : 0;
  let level = 0;
  while (level < SKILL_LEVEL_MAX && rest >= skillLevelCost(level)) {
    rest -= skillLevelCost(level);
    level += 1;
  }
  if (level >= SKILL_LEVEL_MAX) return { level: SKILL_LEVEL_MAX, intoLevel: 0, levelCost: 0, ratio: 1 };
  const levelCost = skillLevelCost(level);
  return { level, intoLevel: rest, levelCost, ratio: rest / levelCost };
}

export interface SkillLevelUp {
  readonly skill: SkillId;
  readonly from: number;
  readonly to: number;
}

/** Какие навыки поднялись между двумя состояниями — для поздравления «по факту», а не по записи. */
export function skillLevelUps(before: SkillTotals, after: SkillTotals): SkillLevelUp[] {
  return SKILL_IDS.flatMap((skill) => {
    const from = skillProgressFromPoints(before[skill]).level;
    const to = skillProgressFromPoints(after[skill]).level;
    return to > from ? [{ skill, from, to }] : [];
  });
}

export type SkillRank = 'novice' | 'confident' | 'strong' | 'master';

/**
 * Слово для пилюли на экране «Навыки» — по среднему уровню пяти учебных навыков («Социальный» в расчёт не входит).
 * Пороги утверждены владельцем 11.11.2026: 0–5 «Новичок», 6–12 «Уверенный», 13–20 «Сильный», 21–30 «Мастер».
 * Буквы уровня языка (A2 и т. п.) нет намеренно: по очкам навыков уровень языка честно не определить.
 */
export function skillRank(totals: SkillTotals): SkillRank {
  const sum = STUDY_SKILL_IDS.reduce((acc, skill) => acc + skillProgressFromPoints(totals[skill]).level, 0);
  const average = Math.floor(sum / STUDY_SKILL_IDS.length);
  if (average >= 21) return 'master';
  if (average >= 13) return 'strong';
  if (average >= 6) return 'confident';
  return 'novice';
}

/** Самый слабый учебный навык для кнопки «Подтянуть»; «Социальный» не предлагается (владелец 11.11). */
export function weakestStudySkill(totals: SkillTotals): SkillId {
  return STUDY_SKILL_IDS.reduce((weak, skill) => (totals[skill] < totals[weak] ? skill : weak));
}
