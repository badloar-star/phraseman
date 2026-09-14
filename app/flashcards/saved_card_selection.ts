export const SAVED_CARD_SELECTION_MIN = 10;
export const SAVED_CARD_SELECTION_MAX = 50;

function uniqueIds(ids: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const rawId of ids) {
    const id = String(rawId ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function toggleSelectedCardId(
  selectedIds: readonly string[],
  cardId: string,
  max = SAVED_CARD_SELECTION_MAX,
): string[] {
  const normalized = uniqueIds(selectedIds);
  const id = String(cardId ?? '').trim();
  if (!id) return normalized;
  const existingIndex = normalized.indexOf(id);
  if (existingIndex >= 0) return normalized.filter((item) => item !== id);
  if (normalized.length >= max) return normalized;
  return [...normalized, id];
}

export function canCreatePackFromSelection(selectedIds: readonly string[]): boolean {
  const count = uniqueIds(selectedIds).length;
  return count >= SAVED_CARD_SELECTION_MIN && count <= SAVED_CARD_SELECTION_MAX;
}

export function remainingCardsToMinimum(selectedIds: readonly string[]): number {
  return Math.max(0, SAVED_CARD_SELECTION_MIN - uniqueIds(selectedIds).length);
}

export function stageSelectedCardIds(selectedIds: readonly string[]): string[] {
  return uniqueIds(selectedIds).slice(0, SAVED_CARD_SELECTION_MAX);
}

export function clearSelectionForLanguageChange(
  selectedIds: readonly string[],
  previousLanguage: string,
  nextLanguage: string,
): string[] {
  return previousLanguage === nextLanguage ? [...selectedIds] : [];
}

/* expo-router route shim: keeps the pure module out of the route tree. */
export default function __RouteShim() { return null; }
