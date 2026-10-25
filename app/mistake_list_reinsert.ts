// mistake_list_reinsert.ts — «Вернуть» после удаления одной ошибки ставит строку на её прежнее место.
// зачем (аудит Дизайна 0936a7510): откат к снимку всего списка вернул бы и строки, удалённые за эти секунды.
import type { MistakePracticeListItem } from './mistake_practice_insights';

/** Вернуть строку на её прежний индекс (по снимку до удаления); уже есть — ничего не делать. */
export function reinsertMistakeAt(
  current: readonly MistakePracticeListItem[] | null,
  before: readonly MistakePracticeListItem[] | null,
  item: MistakePracticeListItem,
): MistakePracticeListItem[] | null {
  if (!current) return before ? [...before] : null;
  if (current.some((entry) => entry.mistakeId === item.mistakeId)) return [...current];
  const index = before ? before.findIndex((entry) => entry.mistakeId === item.mistakeId) : -1;
  const at = index < 0 ? current.length : Math.min(index, current.length);
  return [...current.slice(0, at), item, ...current.slice(at)];
}

export default function __RouteShim() { return null; }
