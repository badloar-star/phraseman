import type { DeckCard } from './deck_sources';

/** Строка «Что исправить» итога Карточек (cards-section.html `fixRow`). */
export type CardsResultMistake = Readonly<{
  id: string;
  en: string;
  translation: string;
  /** Язык набора: 'none' — без языка, такую карточку не озвучиваем (D127). */
  packLanguage?: DeckCard['packLanguage'];
}>;

/**
 * зачем (решение владельца 05.10, итог тренировки по cards-section): «Что исправить» —
 * карточки, на которых человек ошибся, без повторов и в порядке первой ошибки.
 * Карточку, которой нет в наборе сессии, молча не выдумываем — пропускаем.
 */
export function buildResultMistakes(
  cards: readonly DeckCard[],
  wrongIds: readonly string[],
): CardsResultMistake[] {
  const byId = new Map(cards.map((card) => [card.id, card] as const));
  const seen = new Set<string>();
  const out: CardsResultMistake[] = [];
  for (const id of wrongIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const card = byId.get(id);
    if (!card) continue;
    out.push({ id: card.id, en: card.en, translation: card.translation, packLanguage: card.packLanguage });
  }
  return out;
}
