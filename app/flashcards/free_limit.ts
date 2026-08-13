// Лимит бесплатных сохранённых карточек (Cards 2.0, этап E2 — баг 10).
// Блокировка по СТАБИЛЬНЫМ id (первые 20 по addedAt), а не по индексу рендера:
// фильтр/поиск/сортировка списка больше не меняют, какие карточки открыты.
// Чистые функции без RN-зависимостей — юнит-тестируются в node.

export const FREE_SAVED_CARD_LIMIT = 20;

/**
 * Id карточек, доступных бесплатному пользователю: первые `limit` по времени
 * добавления (`addedAt` asc; отсутствующий addedAt = 0 → самые старые).
 * Тай-брейк по id — детерминированность при равных addedAt.
 */
export function computeUnlockedSavedIds(
  cards: ReadonlyArray<{ id: string; addedAt?: number }>,
  limit: number = FREE_SAVED_CARD_LIMIT,
): Set<string> {
  const sorted = [...cards].sort((a, b) => {
    const d = (a.addedAt ?? 0) - (b.addedAt ?? 0);
    if (d !== 0) return d;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return new Set(sorted.slice(0, Math.max(0, limit)).map((c) => c.id));
}

/**
 * Делит отображаемый (возможно отфильтрованный) список на видимые карточки и
 * количество скрытых лимитом. Премиум — всё видимо.
 */
export function splitByFreeLimit<T extends { id: string }>(
  cards: ReadonlyArray<T>,
  unlockedIds: ReadonlySet<string>,
  isPremium: boolean,
): { visible: T[]; hiddenCount: number } {
  if (isPremium) return { visible: [...cards], hiddenCount: 0 };
  const visible = cards.filter((c) => unlockedIds.has(c.id));
  return { visible, hiddenCount: cards.length - visible.length };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
