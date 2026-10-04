import { ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS } from './accounts_v2_hydration_deletions';

/*
 * Account Authority 2.0, S1c (TG-B76DEBF29EDF) — одно правило времени правки карточки.
 *
 * зачем: «чья версия карточки свежее» решали два места, и решали по-разному:
 *   8E (гидрация, app/accounts_v2_hydration_conflicts.ts) — max(updatedAt, addedAt), только целые
 *      миллисекунды, новее лишь с запасом по часам (1 час, как удаления 7E);
 *   S1b (объединение страниц перед записью, app/flashcard_pages_read_result.ts) — только updatedAt,
 *      любые конечные числа, точное сравнение (разница в 1 мс уже «новее»).
 * Одна и та же пара версий могла получить разный итог в зависимости от пути. Правило 8E — эталон
 * (его поведение не меняется ни на байт), S1b теперь потребитель того же правила.
 *
 * Время правки = max(updatedAt (7E), addedAt) — только содержимое карточки; SRS (свайпы) сюда не
 * входит. Значение считается временем, только если это целое безопасное число > 0 (строки, ISO,
 * NaN, Infinity, дробные — «неизвестно»). Сравниваются часы РАЗНЫХ устройств, поэтому одна сторона
 * «новее», только если её время больше не меньше чем на запас; иначе — «в пределах запаса».
 *
 * S1d (TG-4AC6243A1836, §121): время «из будущего» — больше now + запас — считается неизвестным
 * (time_unknown). зачем: устройство, у которого часы ушли вперёд больше чем на час, иначе побеждало
 * во всех конфликтах (8E и S1b), пока остальные не догонят. Ровно now + запас — ещё время.
 * `now` — параметр (чистая функция, тесты детерминированы); его берут потребители в точке вызова.
 * now = null (или не целое число > 0) — часов нет: отсечки нет, прежнее поведение (8E без часов
 * гидрации — см. app/accounts_v2_hydration_conflicts.ts).
 *
 * Чистые функции, без логов (решение логируют потребители), без сети.
 */

/** Запас по часам — тот же, что у удалений 7E и конфликтов 8E. */
export const CARD_EDIT_CLOCK_MARGIN_MS = ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS;

export type CardEditTimeOrder = 'local_newer' | 'remote_newer' | 'within_clock_margin' | 'time_unknown';

/** Одно поле времени: целое безопасное число > 0, иначе null. */
export function cardTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Время правки содержимого карточки: max(updatedAt, addedAt); нет ни одного → null. */
export function cardEditTime(card: unknown): number | null {
  if (card === null || typeof card !== 'object') return null;
  const fields = card as { updatedAt?: unknown; addedAt?: unknown };
  const known = [cardTimestamp(fields.updatedAt), cardTimestamp(fields.addedAt)].filter((value): value is number => value !== null);
  return known.length === 0 ? null : Math.max(...known);
}

/** S1d: время правки не позже now + запас; иначе (часы ушли вперёд) — неизвестно. now нет → без отсечки. */
function notFromFuture(time: number | null, now: number | null): number | null {
  if (time === null) return null;
  const clock = cardTimestamp(now);
  return clock === null || time <= clock + CARD_EDIT_CLOCK_MARGIN_MS ? time : null;
}

/**
 * S1d R2: время правки «из будущего» — больше now + запас (часы ЭТОГО устройства отстают, если
 * время чужое). now нет / время неизвестно → false. Нужен пути записи страниц (8N): облачную
 * правку «из будущего» нельзя затирать локальной.
 */
export function isCardEditTimeFromFuture(time: number | null, now: number | null): boolean {
  return time !== null && notFromFuture(time, now) === null;
}

/**
 * Чьё время правки свежее — с запасом по часам. Нет времени хоть у одной стороны (или оно
 * «из будущего»: > now + запас, S1d) → time_unknown.
 */
export function compareCardEditTimes(
  localTimeRaw: number | null, remoteTimeRaw: number | null, now: number | null,
): CardEditTimeOrder {
  const localTime = notFromFuture(localTimeRaw, now);
  const remoteTime = notFromFuture(remoteTimeRaw, now);
  if (localTime === null || remoteTime === null) return 'time_unknown';
  if (remoteTime - localTime >= CARD_EDIT_CLOCK_MARGIN_MS) return 'remote_newer';
  if (localTime - remoteTime >= CARD_EDIT_CLOCK_MARGIN_MS) return 'local_newer';
  return 'within_clock_margin';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
