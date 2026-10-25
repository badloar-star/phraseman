// feedback_text_rule.ts — правило «оценку без текста отправить нельзя».
// ЗАМОК ВЛАДЕЛЬЦА 25.10: «оценку без текста отправить нельзя» — для ВСЕХ оценок, включая 5★; минимум — хотя бы одно слово из 3+ букв.
// Проверка по обрезанному тексту и по буквам любого алфавита (`\p{L}{3,}`): «ок», «.», «👍», «!!!» не проходят, «good», «хорошо», «ありがとう» проходят.
// Единственная точка правды: и кнопка «Отправить» (disabled), и сама отправка в FeedbackRatingCard спрашивают только эту функцию.

/** Не короче трёх букв подряд — одно слово, за которое можно зачесть отзыв. */
export const FEEDBACK_MIN_WORD_LETTERS = 3;

const WORD_RE = /\p{L}{3,}/u;

/** Есть ли в тексте хотя бы одно слово из 3+ букв (после trim). */
export function feedbackTextAllowsSend(text: string): boolean {
  return WORD_RE.test(text.trim());
}

/** Причина блока для журнала `[RATING-SUBMIT]`; null — отправка разрешена. */
export function feedbackBlockReason(text: string): 'no_word' | null {
  return feedbackTextAllowsSend(text) ? null : 'no_word';
}
