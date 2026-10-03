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
 * Время «из будущего» (часы устройства убежали вперёд) отдельно НЕ отсекается: 8E так не делает,
 * а менять 8E в S1c запрещено — вопрос записан координатору (пакет aa-s1c, итог исполнителя).
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

/** Чьё время правки свежее — с запасом по часам. Нет времени хоть у одной стороны → time_unknown. */
export function compareCardEditTimes(localTime: number | null, remoteTime: number | null): CardEditTimeOrder {
  if (localTime === null || remoteTime === null) return 'time_unknown';
  if (remoteTime - localTime >= CARD_EDIT_CLOCK_MARGIN_MS) return 'remote_newer';
  if (localTime - remoteTime >= CARD_EDIT_CLOCK_MARGIN_MS) return 'local_newer';
  return 'within_clock_margin';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
