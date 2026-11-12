/**
 * Банк игры «Точное слово» — английский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 * Правила вычитки: фраза с верным вариантом — фраза урока (или только из слов урока); каждый неверный
 * вариант даёт грамматически неверную фразу (правило владельца о неверных вариантах); варианты —
 * только слова, которые ученик уже встречал. Верный вариант всегда записан первым в исходнике,
 * а место на экране задаёт четвёртый аргумент — так нельзя перепутать индекс.
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { QuizRound } from '../quiz_core';

const ASK = 'Какое слово сюда?';

/** `gapped` — фраза с пропуском `___`; `correct` встаёт на место `at` среди вариантов. */
function round(lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound {
  const [before = '', after = ''] = gapped.split('___').map((part) => part.trim());
  const correctIndex = Math.min(Math.max(at, 0), wrong.length);
  const options = [...wrong.slice(0, correctIndex), correct, ...wrong.slice(correctIndex)];
  return { id: `ex-en-l${String(lesson).padStart(2, '0')}-${n}`, ask: ASK, options, correctIndex, prompt: { kind: 'gap', before, after }, note };
}

export const EXACT_BANK_EN: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'I ___ ready', 'am', ['is', 'are'], 0, 'С I всегда идёт am.'),
    round(1, 2, 'She ___ busy', 'is', ['are', 'am'], 1, 'С she идёт is.'),
    round(1, 3, 'The doors ___ closed', 'are', ['is'], 1, 'Doors — их несколько, значит are.'),
    round(1, 4, 'He is ___', 'here', ['at here'], 0, 'Here обходится без at.'),
    round(1, 5, 'She is ___ work', 'at', ['on'], 1, 'At work — «на работе».'),
    round(1, 6, 'Your keys ___ here', 'are', ['is', 'am'], 2, 'Keys — их несколько, значит are.'),
  ],
  2: [
    round(2, 1, 'She is ___ ready', 'not', ['no'], 1, 'Внутри фразы «не» — это not.'),
    round(2, 2, '___ you ready?', 'Are', ['Is', 'Am'], 0, 'С you идёт are.'),
    round(2, 3, '___ the bus here?', 'Is', ['Are'], 1, 'Bus — автобус один, значит is.'),
    round(2, 4, 'Yes, she ___', 'is', ['are', 'am'], 2, 'С she идёт is.'),
    round(2, 5, 'Are ___ seats free?', 'these', ['this'], 0, 'Seats — их несколько, значит these.'),
    round(2, 6, 'Is your train ___ time?', 'on', ['at'], 1, 'On time — «вовремя», слова ходят парой.'),
  ],
  3: [
    round(3, 1, 'She ___ nearby', 'works', ['work'], 1, 'Про неё — с -s на конце: works.'),
    round(3, 2, 'We ___ early', 'start', ['starts'], 0, 'С we — без -s: start.'),
    round(3, 3, 'The shops ___ late', 'close', ['closes'], 1, 'Shops — их несколько, поэтому без -s.'),
    round(3, 4, 'I walk ___', 'home', ['to home'], 0, 'Home обходится без to.'),
    round(3, 5, 'The shop opens ___ nine', 'at', ['on', 'to'], 2, 'Время на часах — с at.'),
    round(3, 6, 'He ___ the train', 'takes', ['take'], 0, 'Про него — с -s на конце: takes.'),
  ],
  4: [
    round(4, 1, 'He ___ not drive', 'does', ['do'], 1, 'С he идёт does.'),
    round(4, 2, 'We ___ not need help', 'do', ['does'], 0, 'С we идёт do.'),
    round(4, 3, 'He does not ___ here', 'work', ['works'], 1, 'После does not слово идёт без -s.'),
    round(4, 4, 'The lights ___ not work', 'do', ['does'], 1, 'Lights — их несколько, значит do.'),
    round(4, 5, 'I ___ eat meat', 'do not', ['am not', 'not'], 0, '«Не ем» — do not eat.'),
    round(4, 6, 'I do not have ___', 'cash', ['a cash'], 1, 'Cash не считают штуками — a не нужно.'),
  ],
  5: [
    round(5, 1, '___ you drive?', 'Do', ['Does', 'Are'], 2, 'С you вопрос начинается с do.'),
    round(5, 2, '___ she want tea?', 'Does', ['Do', 'Is'], 0, 'С she вопрос начинается с does.'),
    round(5, 3, 'Does he ___ English?', 'speak', ['speaks'], 1, 'После does слово идёт без -s.'),
    round(5, 4, '___ the buses run on Sundays?', 'Do', ['Does'], 0, 'Buses — их несколько, значит do.'),
    round(5, 5, 'Do we need ___?', 'tickets', ['a tickets'], 1, 'Tickets — их несколько, a ставят только перед одним.'),
    round(5, 6, '___ your flat have a balcony?', 'Does', ['Do', 'Is'], 1, 'Flat — квартира одна, значит does.'),
  ],
  6: [
    round(6, 1, 'Where ___ you work?', 'do', ['does', 'are'], 0, 'С you идёт do.'),
    round(6, 2, 'When ___ it close?', 'does', ['do'], 1, 'С it идёт does.'),
    round(6, 3, '___ time does the bus leave?', 'What', ['When', 'Where'], 2, 'What time — «во сколько».'),
    round(6, 4, 'How ___ does a ticket cost?', 'much', ['many', 'long'], 0, 'How much — «сколько стоит».'),
    round(6, 5, 'How ___ people live here?', 'many', ['much'], 1, 'Людей считают — значит how many.'),
    round(6, 6, 'Who ___ the orders?', 'checks', ['check'], 0, 'После who слово идёт с -s: checks.'),
  ],
  7: [
    round(7, 1, 'She ___ a ticket', 'has', ['have'], 1, 'С she идёт has.'),
    round(7, 2, 'They ___ a car', 'have', ['has'], 0, 'С they идёт have.'),
    round(7, 3, 'Does he ___ any change?', 'have', ['has'], 1, 'После does идёт have.'),
    round(7, 4, 'We have ___ appointment', 'an', ['a'], 0, 'Перед appointment говорят an — так легче произнести.'),
    round(7, 5, 'We have ___', 'time', ['a time'], 1, 'Time здесь не считают штуками — a не нужно.'),
    round(7, 6, '___ you have a pen?', 'Do', ['Does', 'Are'], 0, 'С you вопрос начинается с do.'),
  ],
  8: [
    round(8, 1, 'I start ___ seven', 'at', ['on', 'in'], 0, 'Время на часах — с at.'),
    round(8, 2, 'We meet ___ Tuesday', 'on', ['at', 'in'], 1, 'Дни недели — с on.'),
    round(8, 3, 'I travel ___ July', 'in', ['on', 'at'], 2, 'Месяцы — с in.'),
    round(8, 4, 'She studies ___ the evening', 'in', ['on', 'at'], 0, 'Вечером — in the evening.'),
    round(8, 5, 'He works ___ night', 'at', ['in', 'on'], 1, 'Ночью — at night.'),
    round(8, 6, 'The rent is due ___ the first of May', 'on', ['in', 'at'], 2, 'Число месяца — с on.'),
  ],
  // зачем (сессия макетов 12.11): уроки 9–12; отброшены пары, где неверный вариант тоже даёт правильную фразу
  // («I call the office», «Does she check…», «arrived ten minutes later»)
  9: [
    round(9, 1, 'There ___ a lift', 'is', ['are'], 0, 'Лифт один — значит is.'),
    round(9, 2, 'There ___ two queues', 'are', ['is'], 1, 'Очередей две — значит are.'),
    round(9, 3, '___ there a quiet room?', 'Is', ['Are'], 0, 'Комната одна — значит is.'),
    round(9, 4, 'Are there ___ blankets?', 'any', ['a'], 1, 'Одеял несколько — any; a ставят только перед одним.'),
    round(9, 5, 'There is ___ hot water', 'no', ['not'], 0, '«Нет горячей воды» — no hot water.'),
    round(9, 6, 'There is a toilet ___', 'upstairs', ['at upstairs'], 1, 'Upstairs обходится без at.'),
  ],
  10: [
    round(10, 1, 'I can ___', 'swim', ['to swim'], 0, 'После can — swim, без to.'),
    round(10, 2, 'She ___ drive', 'can', ['is'], 1, 'Она умеет — she can drive.'),
    round(10, 3, 'Can I ___ here?', 'sit', ['to sit'], 0, 'После can I сразу идёт sit.'),
    round(10, 4, 'You should ___ the receipt', 'keep', ['to keep'], 1, 'После should сразу идёт keep.'),
    round(10, 5, 'He ___ bring his passport', 'has to', ['have to'], 0, 'С he — has to.'),
    round(10, 6, 'We ___ to show our tickets', 'have', ['has'], 1, 'С we — have to.'),
  ],
  11: [
    round(11, 1, 'We ___ late yesterday', 'worked', ['work'], 0, 'Yesterday — значит worked.'),
    round(11, 2, 'Did you ___ the office?', 'call', ['called'], 1, 'После did — call, без -ed.'),
    round(11, 3, 'I did not ___ the label', 'check', ['checked'], 0, 'После did not — check, без -ed.'),
    round(11, 4, '___ the bus arrive on time?', 'Did', ['Is', 'Are'], 2, 'Вопрос о прошлом начинается с did.'),
    round(11, 5, 'She ___ the gate', 'closed', ['close'], 1, 'Про неё в прошлом — closed.'),
    round(11, 6, 'I ___ home yesterday', 'walked', ['walk'], 0, 'Yesterday — значит walked.'),
  ],
  12: [
    round(12, 1, 'I ___ your sister yesterday', 'met', ['meet'], 1, 'Yesterday — значит met.'),
    round(12, 2, 'Did you ___ your keys?', 'find', ['found'], 0, 'После did — find, а не found.'),
    round(12, 3, 'She did not ___ my coat', 'take', ['took'], 1, 'После did not — take, а не took.'),
    round(12, 4, 'Did they ___ the bus?', 'catch', ['caught'], 0, 'После did — catch, а не caught.'),
    round(12, 5, 'She ___ a spare key', 'brought', ['bring'], 1, 'Про неё в прошлом — brought.'),
    round(12, 6, 'Who ___ the last cup?', 'took', ['take'], 0, 'Это уже было — took.'),
  ],
};
