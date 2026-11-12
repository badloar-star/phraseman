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
  // зачем (сессия макетов 12.11): уроки 9–12 по той же схеме: вопрос о названном предмете → ответ → вопрос с it/he/she/they
  9: [
    order(9, 1, ['Is there a cash machine here?', 'Yes, there is a cash machine by the door.', 'Is it open?', 'Yes, it is open.']),
    order(9, 2, ['Are there lockers at the station?', 'Yes, there are lockers upstairs.', 'Are they free?', 'No, they are not free.']),
  ],
  10: [
    order(10, 1, ['Can I use your phone?', 'Yes, you can use my phone.', 'Does it work?', 'Yes, it works well.']),
    order(10, 2, ['Can your sister drive?', 'Yes, she can drive.', 'Can she come today?', 'No, she cannot come today.']),
  ],
  11: [
    order(11, 1, ['Did your sister call the office?', 'Yes, she called the office.', 'Did she book a room?', 'Yes, she booked a single room.']),
    order(11, 2, ['Did the train arrive on time?', 'No, it arrived ten minutes late.', 'Did it stop at the station?', 'Yes, it stopped by the gate.']),
  ],
  12: [
    order(12, 1, ['Did your son find his wallet?', 'Yes, he found his wallet downstairs.', 'Did he find his keys?', 'No, he did not find his keys.']),
    order(12, 2, ['When did the taxi arrive?', 'The taxi arrived at nine.', 'How much did it cost?', 'It cost ten.']),
  ],
  // зачем (координатор 12.11): уроки 13–16 по той же схеме: вопрос о названном предмете → ответ → вопрос с it/he/she/they
  13: [
    order(13, 1, ['Will your sister call today?', 'Yes, she will call later.', 'Will she need a lift?', 'No, she will not need a lift.']),
    order(13, 2, ['Will the shop open tomorrow?', 'No, the shop will not open tomorrow.', 'Will it open on Monday?', 'Yes, it will open on Monday.']),
  ],
  14: [
    order(14, 1, ['Is the bus cheaper than the train?', 'Yes, the bus is cheaper.', 'Is it faster?', 'No, the train is faster.']),
    order(14, 2, ['Which room is the quietest?', 'The back room is the quietest.', 'Is it warmer than the kitchen?', 'Yes, it is warmer.']),
  ],
  15: [
    order(15, 1, ['Is this umbrella yours?', 'No, it is not mine.', 'Is it hers?', 'Yes, I think it is hers.']),
    order(15, 2, ['Whose keys are these?', 'They are our keys.', 'Do they work?', 'No, they do not work.']),
  ],
  16: [
    order(16, 1, ['Can your brother pick me up at six?', 'Yes, he can pick you up at six.', 'Will he drop me off outside?', 'Yes, he will drop you off outside.']),
    order(16, 2, ['Did the children wake up early?', 'Yes, they got up at six.', 'Did they put their shoes on?', 'Yes, they put their shoes on.']),
  ],
};
