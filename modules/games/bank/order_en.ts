/**
 * Банк игры «Собери диалог» — английский классический курс, уроки 2–8 (D207). 2 диалога на урок.
 * зачем: владелец 11.11.2026 — игры должны быть на всех уроках, «фразы должны корректно подбираться».
 * Правила вычитки: четыре реплики из слов уроков 1..N; порядок ровно один. Он держится на одной схеме:
 *   1) вопрос, который называет предмет или человека;  2) ответ, который отвечает только на него;
 *   3) вопрос с it / he / she / they — без первой реплики непонятно, о ком речь, начать с него нельзя;
 *   4) ответ, который отвечает только на третий вопрос.
 * Две независимые пары «вопрос — ответ» не годятся: их можно поменять местами, и оба порядка верны.
 * Урока 1 здесь нет намеренно: в нём одни утверждения, вопросов ещё нет, однозначный порядок собрать
 * не из чего. Что показывать на уроке 1, решает реестр (bank/index.ts).
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { OrderTask } from '../dialogue_core';

function order(lesson: number, n: number, lines: readonly [string, string, string, string]): OrderTask {
  return { id: `order-en-l${String(lesson).padStart(2, '0')}-${n}`, lines };
}

export const ORDER_BANK_EN: Readonly<Record<number, readonly OrderTask[]>> = {
  2: [
    order(2, 1, ['Is the waiting room open?', 'Yes, it is open.', 'Is it warm?', 'No, it is cold.']),
    order(2, 2, ['Are the tickets here?', 'No, they are not here.', 'Are they at home?', 'Yes, they are at home.']),
  ],
  3: [
    order(3, 1, ['Is your sister at home?', 'No, she is at work.', 'Is she busy?', 'Yes, she works nights.']),
    order(3, 2, ['Is the shop nearby?', 'Yes, we walk to the shop.', 'Is it open?', 'No, it opens at nine.']),
  ],
  4: [
    order(4, 1, ['Is your son at home?', 'No, he is at the station.', 'Is he late?', 'Yes, the buses do not run today.']),
    order(4, 2, ['Is this your card?', 'Yes, it is my card.', 'Is it valid?', 'No, it does not work in this machine.']),
  ],
  5: [
    order(5, 1, ['Does the landlord live nearby?', 'Yes, he lives on this street.', 'Does he speak English?', 'No, he does not speak English.']),
    order(5, 2, ['Do the buses run on Sundays?', 'Yes, they run on Sundays.', 'Do they stop here?', 'No, they stop near the station.']),
  ],
  6: [
    order(6, 1, ['Which bus goes to the centre?', 'This bus goes to the centre.', 'When does it leave?', 'It leaves at eight.']),
    order(6, 2, ['Who teaches the evening class?', 'My sister teaches the evening class.', 'Where does she live?', 'She lives nearby.']),
  ],
  7: [
    order(7, 1, ['Does your daughter have a cold?', 'Yes, she has a cold.', 'Does she have a fever?', 'No, she does not have a fever.']),
    order(7, 2, ['Does the hotel have a luggage room?', 'Yes, it has a luggage room.', 'Does it have a lift?', 'No, it does not have a lift.']),
  ],
  8: [
    order(8, 1, ['When does the concert start?', 'It starts at eight fifteen.', 'When does it finish?', 'It finishes at midnight.']),
    order(8, 2, ['Does your sister work at night?', 'No, she works in the morning.', 'Does she work on Sundays?', 'Yes, she works every Sunday.']),
  ],
};
