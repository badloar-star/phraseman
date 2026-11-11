/**
 * Прирост навыков за одно занятие — для блока «Навыки растут» на экранах итога.
 *
 * зачем: блок показывает ФАКТ — разницу между итогами до занятия и после, а не сохранённую запись
 * (правило владельца 01.09: празднование не durable). Снимок «до» ведёт хранилище (takeSkillSessionBase), только в памяти.
 */
import { skillProgressFromPoints, type SkillTotals } from './skill_levels';
import { SKILL_IDS, type SkillId } from './skill_points_table';

export interface SkillGrowthRow {
  readonly skill: SkillId;
  readonly points: number;
  readonly levelBefore: number;
  readonly levelAfter: number;
  /** Доля полоски уровня 0..1 до и после. */
  readonly ratioBefore: number;
  readonly ratioAfter: number;
  readonly leveledUp: boolean;
}

/** Навыки, которые выросли между двумя состояниями; порядок — как в звезде. */
export function skillGrowthRows(before: SkillTotals, after: SkillTotals): SkillGrowthRow[] {
  return SKILL_IDS.flatMap((skill) => {
    const points = after[skill] - before[skill];
    if (!Number.isFinite(points) || points <= 0) return [];
    const a = skillProgressFromPoints(before[skill]);
    const b = skillProgressFromPoints(after[skill]);
    return [{ skill, points, levelBefore: a.level, levelAfter: b.level, ratioBefore: a.ratio, ratioAfter: b.ratio, leveledUp: b.level > a.level }];
  });
}
