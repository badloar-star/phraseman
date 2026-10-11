/**
 * Уровень набора сообщества A1–C1 (Карточки 2.0, колода «40 · A2»).
 *
 * зачем: уровень ставит автор; сервер пропускает только A1–C1 — зеркало клиентского
 * `app/flashcards/pack_deck_meta.ts`. Мусор → null: набор публикуется, просто без уровня
 * (автор не теряет заявку из-за битого поля — тот же принцип, что у цены в рунах).
 */
export const PACK_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type PackLevel = (typeof PACK_LEVELS)[number];

export function normalizePackLevel(raw: unknown): PackLevel | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  return (PACK_LEVELS as readonly string[]).includes(value) ? (value as PackLevel) : null;
}
