/**
 * Ошибки, скрытые на этом устройстве, пока запись в журнал ещё не дошла.
 *
 * зачем (аудит Optimistic UI 05.10, п.2): «Скрыть ошибку» сразу уходит назад, а событие пишется фоном — список,
 * перечитав журнал, на миг показывал скрытую строку. Пометка ставится синхронно до «назад» и снимается только при
 * отказе записи. Только память процесса: это мост до записи журнала, а не источник правды.
 */
const hiddenIds = new Set<string>();

export function markMistakeHiddenLocally(mistakeId: string): void {
  hiddenIds.add(mistakeId);
}

export function unmarkMistakeHiddenLocally(mistakeId: string): void {
  hiddenIds.delete(mistakeId);
}

// зачем (владелец 22.10, «Очистить все ошибки»): та же пометка пачкой — весь список пустеет в тот же кадр, до записи журнала.
export function markMistakesHiddenLocally(mistakeIds: readonly string[]): void {
  for (const mistakeId of mistakeIds) hiddenIds.add(mistakeId);
}

export function unmarkMistakesHiddenLocally(mistakeIds: readonly string[]): void {
  for (const mistakeId of mistakeIds) hiddenIds.delete(mistakeId);
}

/** Строки без локально скрытых; тот же массив, если скрывать нечего (без лишних перерисовок). */
export function withoutLocallyHiddenMistakes<T extends { readonly mistakeId: string }>(items: readonly T[]): readonly T[] {
  if (hiddenIds.size === 0) return items;
  const next = items.filter((item) => !hiddenIds.has(item.mistakeId));
  return next.length === items.length ? items : next;
}

/** Только для тестов. */
export function __resetLocallyHiddenMistakesForTests(): void {
  hiddenIds.clear();
}

/* expo-router: утилита, не экран */
export default function __MistakeLocalHiddenRouteShim() {
  return null;
}
