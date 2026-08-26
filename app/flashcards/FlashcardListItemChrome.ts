import { StyleSheet } from "react-native";

/**
 * Каноническая геометрия компактного FlashcardListItem. И раздел «Карточки»,
 * и Learning V2 импортируют один объект стилей и одну формулу высоты.
 */
export const FLASHCARD_LIST_ITEM_CARD_STYLE = StyleSheet.create({
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
  },
}).card;

export function resolveFlashcardListItemHeight(
  screenHeight: number,
  topInset: number,
  bottomInset: number,
  uiScale: number,
): number {
  const reserved = 200 + topInset + bottomInset;
  const available = Math.max(220, screenHeight - reserved);
  return Math.min(224, Math.max(140, Math.round(available * 0.45 * uiScale)));
}
