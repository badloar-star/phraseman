// pack_rows_remove.ts — безопасное удаление строки карточки в редакторе набора.
// зачем (аудит Optimistic UI, координатор 15.10, потеря данных пользователя, дыры 1-3): удаление шло по ИНДЕКСУ: второй быстрый тап (шторка закрывается ~440 мс) удалял СЛЕДУЮЩУЮ карточку, сдвинувшуюся на этот индекс.
// Теперь удаляемая строка сверяется по ссылке на объект: после первого удаления строки пересобираются (новые объекты), и устаревший тап ничего не удаляет.
export const PACK_ROW_DELETE_LOCK_MS = 450;

/** Список без строки idx; null — удалять нечего (индекс вне списка или строка по этому индексу уже не та, что была выбрана). */
export function rowsWithout<T>(rows: readonly T[], idx: number, expected?: T): T[] | null {
  if (idx < 0 || idx >= rows.length) return null;
  if (expected !== undefined && rows[idx] !== expected) return null;
  return rows.filter((_, i) => i !== idx);
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
