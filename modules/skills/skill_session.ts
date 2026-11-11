/**
 * Прирост навыков за одно занятие — для блока «Навыки растут» на экранах итога.
 *
 * зачем: блок показывает ФАКТ — разницу между итогами до занятия и после, а не сохранённую запись
 * (правило владельца 01.09: празднование не durable). Снимок «до» живёт только в памяти процесса.
 */
import { skillProgressFromPoints, type SkillTotals } from './skill_levels';
import { SKILL_IDS, type SkillId } from './skill_points_table';
import { peekSkills } from './skill_store';

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

let sessionStart: SkillTotals | null = null;

/** Запомнить итоги на входе в занятие. Если хранилище ещё не прочитано — снимка нет, блок на итоге не покажется. */
export function markSkillSessionStart(): void {
  sessionStart = peekSkills()?.totals ?? null;
}

/** Забрать снимок «до» и сбросить его: один итог — один показ. */
export function takeSkillSessionStart(): SkillTotals | null {
  const start = sessionStart;
  sessionStart = null;
  return start;
}
