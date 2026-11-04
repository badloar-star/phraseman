/**
 * зачем (владелец 04.11, Пик): «дошёл до самой высшей ступени башни» — одно число для сервера и клиента.
 * 15 этажей × ступени по схеме stepRecordKey = 135 ступеней в неделю (admin_spire_statistics_core SPIRE_COMPLETED_STEPS,
 * modules/spire/achievement_reconcile). Дубли этого числа в других файлах — переводить на эту константу.
 */
export const SPIRE_TOP_STEPS = 135;

/** Дошёл ли участник до вершины башни (любое число монет, любой режим ранжирования). */
export function spireReachedTop(steps: unknown): boolean {
  const n = Number(steps);
  return Number.isFinite(n) && Math.trunc(n) >= SPIRE_TOP_STEPS;
}
