/** Free users may create at most this many custom cards per study language. */
export const FREE_CUSTOM_CARD_LIMIT = 50;

/**
 * Plus users have NO custom card limit.
 *
 * зачем (владелец 2026-09-30): «не 1500, а напиши безлимит» — пейвол обещает
 * «Свои карточки: Безлимит», и это обязано быть правдой в коде. Бесконечность, а не
 * большое число: сравнение `count >= limit` у Plus никогда не срабатывает.
 * Стоимость: карточки живут страницами по 200 штук (app/flashcards_cloud_pages.ts),
 * поэтому рост списка = +1 документ на каждые 200 карточек, а не раздувание одного.
 */
export const PLUS_CUSTOM_CARD_LIMIT = Number.POSITIVE_INFINITY;

/** Owner visibility milestone only; it is not an access limit. */
export const CUSTOM_CARD_OWNER_ALERT_MILESTONE = 1_500;

export function canCreateCustomCard(
  currentCount: number,
  hasPremiumAccess: boolean,
): boolean {
  const limit = hasPremiumAccess ? PLUS_CUSTOM_CARD_LIMIT : FREE_CUSTOM_CARD_LIMIT;
  return currentCount < limit;
}
