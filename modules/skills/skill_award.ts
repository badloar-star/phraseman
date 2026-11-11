/**
 * Начисление очков навыков — чистая функция без хранилища и сети.
 *
 * Правила владельца 11.11.2026:
 * 1. очки идут за каждый верный ответ сразу;
 * 2. та же фраза или слово в тот же день: второй раз половина, дальше ноль;
 * 3. «Скорость» — только верный ответ быстрее трёх секунд в играх на время;
 * 4. «Речь» — только от голоса (обеспечено таблицей: у речи только голосовые строки).
 */
import {
  SKILL_FAST_ANSWER_MS, SKILL_POINT_RULES, isSkillAction,
  type SkillAction, type SkillId, type SkillPointRule,
} from './skill_points_table';
import type { SkillTotals } from './skill_levels';

/** Журнал одного дня: сколько раз уже засчитан предмет и сколько раз сработала строка с дневным потолком. */
export interface SkillDayLedger {
  readonly day: string;
  readonly itemHits: Readonly<Record<string, number>>;
  readonly actionHits: Readonly<Record<string, number>>;
}

export interface SkillAwardInput {
  readonly action: SkillAction;
  /** Локальный день `YYYY-MM-DD`; смена дня обнуляет журнал. */
  readonly day: string;
  /** Что именно отвечали (id фразы/слова). Без него правило повтора не применяется. */
  readonly itemKey?: string;
  /** Время ответа; обязательно для строк с порогом скорости. */
  readonly answerMs?: number;
  /** Навык для строк, где он зависит от вида задания (ошибки, Пик). */
  readonly skill?: SkillId;
}

export type SkillAwardSkipReason =
  | 'unknown_action' | 'skill_required' | 'skill_not_allowed' | 'too_slow' | 'daily_cap' | 'repeat_exhausted';

export interface SkillAwardResult {
  readonly skill: SkillId | null;
  readonly points: number;
  readonly skipped: SkillAwardSkipReason | null;
  readonly ledger: SkillDayLedger;
}

const REPEAT_FACTORS = [1, 0.5] as const;

export function emptySkillDayLedger(day: string): SkillDayLedger {
  return { day, itemHits: {}, actionHits: {} };
}

function skip(reason: SkillAwardSkipReason, ledger: SkillDayLedger, skill: SkillId | null = null): SkillAwardResult {
  return { skill, points: 0, skipped: reason, ledger };
}

export function awardSkillPoints(input: SkillAwardInput, prev: SkillDayLedger | null): SkillAwardResult {
  const ledger = prev && prev.day === input.day ? prev : emptySkillDayLedger(input.day);
  if (!isSkillAction(input.action)) return skip('unknown_action', ledger);
  const rule: SkillPointRule = SKILL_POINT_RULES[input.action];

  const skill = rule.skill ?? input.skill ?? null;
  if (!skill) return skip('skill_required', ledger);
  if (!rule.skill && !(rule.allowedSkills ?? []).includes(skill)) return skip('skill_not_allowed', ledger, skill);

  if (rule.needsFastAnswer) {
    const ms = input.answerMs;
    // зачем: нет замера времени = скорость не доказана; очко за неё не выдаём молча
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0 || ms >= SKILL_FAST_ANSWER_MS) {
      return skip('too_slow', ledger, skill);
    }
  }

  if (rule.dailyCap !== undefined) {
    const used = ledger.actionHits[input.action] ?? 0;
    if (used >= rule.dailyCap) return skip('daily_cap', ledger, skill);
    return {
      skill, points: rule.points, skipped: null,
      ledger: { ...ledger, actionHits: { ...ledger.actionHits, [input.action]: used + 1 } },
    };
  }

  if (!input.itemKey) return { skill, points: rule.points, skipped: null, ledger };

  // зачем: повтор считается по паре «предмет + навык» — быстрый ответ в блице даёт и «Словарь», и «Скорость»,
  // и одно не должно съедать другое
  const hitKey = `${skill}:${input.itemKey}`;
  const hits = ledger.itemHits[hitKey] ?? 0;
  const nextLedger: SkillDayLedger = { ...ledger, itemHits: { ...ledger.itemHits, [hitKey]: hits + 1 } };
  const factor = REPEAT_FACTORS[hits];
  if (factor === undefined) return { skill, points: 0, skipped: 'repeat_exhausted', ledger: nextLedger };
  return { skill, points: rule.points * factor, skipped: null, ledger: nextLedger };
}

/** Прибавляет начисление к итогам; исходный объект не меняется. Очки только растут. */
export function addSkillPoints(totals: SkillTotals, skill: SkillId | null, points: number): SkillTotals {
  if (!skill || !Number.isFinite(points) || points <= 0) return totals;
  return { ...totals, [skill]: totals[skill] + points };
}
