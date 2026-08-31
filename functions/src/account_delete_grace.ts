/*
 * Отложенное удаление аккаунта: 14 дней на передумать.
 *
 * зачем (владелец, 2026-08-31): «если мы не можем сделать удаление мгновенным
 * и правильным — делай так, чтобы юзер видел, что удаление будет завершено
 * через 14 дней, и мог восстановить аккаунт после случайного удаления».
 *
 * Как это устроено:
 *   • нажал «Удалить» → локальные данные стираются СРАЗУ (телефон чистый,
 *     онбординг без зависаний), а на сервере ставится задача с отложенным
 *     nextAttemptAtMs = сейчас + 14 дней;
 *   • всё это время tombstone/{stableUid} лежит в status 'pending' — вход в
 *     аккаунт закрыт, но данные ЦЕЛЫ;
 *   • при попытке войти приложение показывает «Восстановить аккаунт?» —
 *     согласие снимает задачу и возвращает доступ;
 *   • через 14 дней созревшую задачу берёт тот же проверенный воркер
 *     (15 стадий, диагностика, пульс) — ИИ к удалению не подпускаем.
 */

/** Сколько аккаунт ждёт перед необратимым удалением. */
export const ACCOUNT_DELETE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

/** Момент, когда удаление станет необратимым. */
export function accountDeleteGraceDeadlineMs(startedAtMs: number): number {
  return startedAtMs + ACCOUNT_DELETE_GRACE_MS;
}

/** Сколько полных дней осталось до необратимого удаления (для текста в UI). */
export function accountDeleteGraceDaysLeft(deadlineMs: number, nowMs: number): number {
  const left = deadlineMs - nowMs;
  if (left <= 0) return 0;
  return Math.max(1, Math.ceil(left / (24 * 60 * 60 * 1000)));
}

/**
 * Можно ли ещё восстановить аккаунт.
 *
 * Восстановление разрешено, пока задача НЕ начала исполняться: срок не вышел и
 * воркер не взял её в работу. После первого реального прохода данные уже
 * частично снесены — обещать возврат нельзя.
 */
export function accountDeleteRestorable(input: Readonly<{
  status: string;
  deadlineMs: number;
  startedAtMs?: number | null;
  nowMs: number;
}>): boolean {
  if (input.status !== 'pending' && input.status !== 'queued') return false;
  if (Number.isFinite(input.startedAtMs) && Number(input.startedAtMs) > 0) return false;
  return input.nowMs < input.deadlineMs;
}
