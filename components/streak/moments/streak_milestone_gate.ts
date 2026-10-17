// ═══════════════════════════════════════════════════════════════════════════
// streak_milestone_gate.ts — когда на итоге урока/разговора показывать окно рубежа серии.
//
// зачем (координатор 15.10): показ — только при включённом moments_v3 и только ФАКТОМ: рубеж ждёт в памяти (streak_milestone_pending), а перед показом
// сверяется с сегодняшним днём и текущим числом дней серии (поздравлять «когда-то» значением поверх сегодняшнего — баг, ФУНДАМЕНТ владельца 01.09).
// Чистая функция: вызывающий (StreakMilestoneHost) передаёт значения, причина решения уходит в журнал [STREAK-MILESTONE].
// ═══════════════════════════════════════════════════════════════════════════
import { isStreakMilestone, type StreakMilestone } from './streak_milestones';

export type StreakMilestoneGateInput = Readonly<{
  momentsV3: boolean;
  pending: Readonly<{ days: number; dayKey: string }> | null;
  /** Сегодняшний локальный день (getLocalDayKey). */
  today: string;
  /** Текущее состояние серии: peekStreakDayState(); null — ещё неизвестно. */
  fact: Readonly<{ dayKey: string; counted: boolean; days: number }> | null;
}>;

export type StreakMilestoneGateDecision =
  | Readonly<{ show: true; milestone: StreakMilestone; reason: string }>
  | Readonly<{ show: false; reason: string }>;

export function decideStreakMilestone(input: StreakMilestoneGateInput): StreakMilestoneGateDecision {
  if (!input.momentsV3) return { show: false, reason: 'флаг moments_v3 выключен' }; // guard-ok: log-only reason
  if (!input.pending) return { show: false, reason: 'нет ожидающего рубежа' }; // guard-ok: log-only reason
  const { days, dayKey } = input.pending;
  if (dayKey !== input.today) return { show: false, reason: `рубеж другого дня (рубеж=${dayKey} сегодня=${input.today})` }; // guard-ok: log-only reason
  if (!isStreakMilestone(days)) return { show: false, reason: `${days} не рубеж` }; // guard-ok: log-only reason
  if (!input.fact) return { show: false, reason: 'состояние серии ещё неизвестно' }; // guard-ok: log-only reason
  if (!input.fact.counted || input.fact.dayKey !== input.today) return { show: false, reason: `день не засчитан (fact.day=${input.fact.dayKey} counted=${String(input.fact.counted)})` }; // guard-ok: log-only reason
  if (input.fact.days !== days) return { show: false, reason: `число дней сменилось (рубеж=${days} сейчас=${input.fact.days})` }; // guard-ok: log-only reason
  return { show: true, milestone: days, reason: `рубеж ${days} засчитан сегодня (${dayKey})` }; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}
