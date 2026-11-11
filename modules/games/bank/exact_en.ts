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
    round(7, 4, 'We have ___ appointment', 'an', ['a'], 0, 'Appointment начинается на «а» — перед ним an.'),
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
};
