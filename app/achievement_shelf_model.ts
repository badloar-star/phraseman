export const ACHIEVEMENT_SHELF_MIN_ITEM_WIDTH = 148;
export const ACHIEVEMENT_SHELF_MAX_ITEM_WIDTH = 184;

export function achievementShelfItemWidth(viewportWidth: number): number {
  return Math.max(
    ACHIEVEMENT_SHELF_MIN_ITEM_WIDTH,
    Math.min(ACHIEVEMENT_SHELF_MAX_ITEM_WIDTH, Math.round(viewportWidth * 0.44)),
  );
}

export function achievementShelfSideInset(viewportWidth: number, itemWidth: number): number {
  return Math.max(0, (viewportWidth - itemWidth) / 2);
}

export function achievementShelfIndexFromOffset(
  offset: number,
  itemWidth: number,
  count: number,
): number {
  if (count <= 0 || itemWidth <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offset / itemWidth)));
}

export function achievementShelfInitialId<T extends { id: string }>(
  items: readonly T[],
  states: ReadonlyMap<string, { unlockedAt?: string | null }>,
): string | null {
  let selected: { id: string; unlockedAt: string } | null = null;

  for (const item of items) {
    const unlockedAt = states.get(item.id)?.unlockedAt;
    if (unlockedAt && (!selected || unlockedAt > selected.unlockedAt)) {
      selected = { id: item.id, unlockedAt };
    }
  }

  return selected?.id ?? items[0]?.id ?? null;
}

export function achievementShelfIndicator(index: number, total: number) {
  if (total <= 9) {
    return { kind: 'dots' as const, active: Math.max(0, index), total };
  }

  return { kind: 'count' as const, label: `${Math.max(0, index) + 1} / ${total}` };
}
