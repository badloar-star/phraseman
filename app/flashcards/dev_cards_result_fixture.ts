/**
 * Данные кадров «Итог тренировки» для DEV-превью (`/dev_cards_result_preview?state=…`) — ровно как в макете cards-v2.html `result()`:
 * «Блиц · Путешествия», N из 20, время 1:12, +N×10 монет, в разделе «Ошибки» — Gate и Customs.
 *
 * зачем (Авторизация 12.10, съёмка R1 cards-v2-041/042/051/052, cards-section-053/054/055): итог живёт только в конце настоящей тренировки,
 * а при её показе Блиц зачисляет монеты и проходит гейт тренировок (сеть). Превью рисует тот же экран итога на этих данных — без тренировки,
 * без зачисления и без формы отзыва. Чистый модуль без React — его проверяет обычный jest.
 */
import type { CardsResultMistake } from './session_result_mistakes';

export const DEV_CARDS_RESULT_STATES = ['errors', 'clean', 'good', 'grow'] as const;
export type DevCardsResultState = (typeof DEV_CARDS_RESULT_STATES)[number];

export type DevCardsResultFixture = Readonly<{
  correct: number;
  wrong: number;
  coins: number;
  durationSec: number;
  mistakes: readonly CardsResultMistake[];
}>;

const TOTAL = 20;
const COINS_PER_CORRECT = 10;
// зачем (Макеты 13.10, cards-v2-051/052): число в «Ошибки N» и список обязаны совпадать — у «Хорошего результата» 8 ошибок, у «Есть куда расти» 14, а не по две;
// первые две — как в макете (Gate, Customs), остальные — слова той же темы «Путешествия»
const MOCKUP_MISTAKES: readonly CardsResultMistake[] = [
  { id: 'dev_result_gate', en: 'Gate', translation: 'выход на посадку', packLanguage: 'en' },
  { id: 'dev_result_customs', en: 'Customs', translation: 'таможня', packLanguage: 'en' },
  { id: 'dev_result_boarding_pass', en: 'Boarding pass', translation: 'посадочный талон', packLanguage: 'en' },
  { id: 'dev_result_luggage', en: 'Luggage', translation: 'багаж', packLanguage: 'en' },
  { id: 'dev_result_passport', en: 'Passport', translation: 'паспорт', packLanguage: 'en' },
  { id: 'dev_result_departure', en: 'Departure', translation: 'вылет', packLanguage: 'en' },
  { id: 'dev_result_arrival', en: 'Arrival', translation: 'прилёт', packLanguage: 'en' },
  { id: 'dev_result_layover', en: 'Layover', translation: 'пересадка', packLanguage: 'en' },
  { id: 'dev_result_visa', en: 'Visa', translation: 'виза', packLanguage: 'en' },
  { id: 'dev_result_receipt', en: 'Receipt', translation: 'квитанция', packLanguage: 'en' },
  { id: 'dev_result_souvenir', en: 'Souvenir', translation: 'сувенир', packLanguage: 'en' },
  { id: 'dev_result_hostel', en: 'Hostel', translation: 'хостел', packLanguage: 'en' },
  { id: 'dev_result_ticket', en: 'Ticket', translation: 'билет', packLanguage: 'en' },
  { id: 'dev_result_delay', en: 'Delay', translation: 'задержка', packLanguage: 'en' },
];
/** Верных ответов из 20 — как в макете: errors 18 («Почти идеально»), clean 20, good 12 («Хороший результат»), grow 6 («Есть куда расти»). */
const CORRECT_BY_STATE: Readonly<Record<DevCardsResultState, number>> = { errors: 18, clean: 20, good: 12, grow: 6 };

export function isDevCardsResultState(value: unknown): value is DevCardsResultState {
  return typeof value === 'string' && (DEV_CARDS_RESULT_STATES as readonly string[]).includes(value);
}

export function devCardsResultFixture(state: DevCardsResultState): DevCardsResultFixture {
  const correct = CORRECT_BY_STATE[state];
  const wrong = TOTAL - correct;
  return {
    correct,
    wrong,
    coins: correct * COINS_PER_CORRECT,
    durationSec: 72,
    mistakes: MOCKUP_MISTAKES.slice(0, wrong),
  };
}
