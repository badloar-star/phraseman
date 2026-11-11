/**
 * Кому показывать навыки человека. Владелец 11.11.2026 (D207): «друзья видят навыки всегда; посторонние — только на
 * визитке „Про“; без „Про“ навыки на визитке просто не показываются» — никакого замка и надписи «скрыто».
 *
 * зачем одно место: визитка и профиль друга не решают сами, иначе правило разъедется между экранами.
 * Между людьми ходят только шесть уровней 0…30 — не очки и не журнал действий
 * (проект передачи: docs/work/tasks/skills-on-profile-card-2026-11-11.md).
 */
import { SKILL_LEVEL_MAX, skillProgressFromPoints, type SkillTotals } from './skill_levels';
import { SKILL_IDS, type SkillId } from './skill_points_table';

/** Кто смотрит: хозяин, его принятый друг или посторонний. */
export type SkillViewer = 'self' | 'friend' | 'stranger';

/** Шесть уровней 0…30 — единственное, что видят другие люди. */
export type SkillLevels = Readonly<Record<SkillId, number>>;

export interface SkillsVisibilityInput {
  readonly viewer: SkillViewer;
  /** У хозяина визитка «Про» (стиль куплен и выбран) — то же условие, что красит визитку в стиль. */
  readonly ownerHasPro: boolean;
  /** `null` — уровни хозяина неизвестны (не дошли или пришли битыми). */
  readonly levels: SkillLevels | null;
}

/** Рисовать ли блок навыков. `false` значит «блока нет вовсе», а не «блок под замком». */
export function skillsBlockVisible(input: SkillsVisibilityInput): boolean {
  // зачем: неизвестные уровни не подменяем нулями — пустая звезда у чужого человека была бы враньём о нём
  if (input.levels === null) return false;
  if (input.viewer === 'self' || input.viewer === 'friend') return true;
  return input.ownerHasPro === true;
}

/** Свои очки → шесть уровней: в таком виде навыки показываются другим. */
export function skillLevelsFromTotals(totals: SkillTotals): SkillLevels {
  return Object.freeze(Object.fromEntries(
    SKILL_IDS.map((skill) => [skill, skillProgressFromPoints(totals[skill]).level]),
  ) as Record<SkillId, number>);
}

/** Уровни → компактная запись для передачи: шесть чисел в порядке `SKILL_IDS`. */
export function skillLevelsToWire(levels: SkillLevels): number[] {
  return SKILL_IDS.map((skill) => levels[skill]);
}

/**
 * Разбор уровней, пришедших извне (сеть, диск). Принимается только массив ровно из шести целых 0…30;
 * всё остальное — `null`, и блок не рисуется. Частично верную запись не чиним: непонятно, чьи это числа.
 */
export function parseSkillLevels(raw: unknown): SkillLevels | null {
  if (!Array.isArray(raw) || raw.length !== SKILL_IDS.length) return null;
  const valid = raw.every((value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= SKILL_LEVEL_MAX);
  if (!valid) return null;
  return Object.freeze(Object.fromEntries(
    SKILL_IDS.map((skill, index) => [skill, raw[index] as number]),
  ) as Record<SkillId, number>);
}

/**
 * Длина луча звезды и полоски 0…1. Макет (elevate-core.js, `axis`): корень, чтобы первые уровни уже давали заметный луч.
 * `ratio` — доля внутри уровня; у чужих её нет (передаются только уровни), поэтому по умолчанию 0.
 */
export function skillAxisValue(level: number, ratio = 0): number {
  const safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(SKILL_LEVEL_MAX, level)) : 0;
  const safeRatio = safeLevel >= SKILL_LEVEL_MAX || !Number.isFinite(ratio) ? 0 : Math.max(0, Math.min(1, ratio));
  return Math.sqrt((safeLevel + safeRatio) / SKILL_LEVEL_MAX);
}
