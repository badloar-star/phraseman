/**
 * Банк игры «На слух» — английский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — игры должны быть на всех уроках, «фразы должны корректно подбираться».
 * Правила вычитки: произносится дословная фраза урока; каждый неверный вариант отличается от неё ровно
 * одним словом, остаётся правильной английской фразой и собран из слов, которые ученик уже встречал;
 * подмена различима на слух (нет пар вроде a / the). Пояснение — перевод прозвучавшей фразы.
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { QuizRound } from '../quiz_core';

const ASK = 'Что прозвучало?';

/** `text` — что произносится (он же верный вариант); `at` — его место среди вариантов. */
function round(lesson: number, n: number, text: string, wrong: readonly [string, string], at: number, note: string): QuizRound {
  const correctIndex = Math.min(Math.max(at, 0), wrong.length);
  const options = [...wrong.slice(0, correctIndex), text, ...wrong.slice(correctIndex)];
  return { id: `ls-en-l${String(lesson).padStart(2, '0')}-${n}`, ask: ASK, options, correctIndex, prompt: { kind: 'audio', text, rate: 1 }, note };
}

export const LISTEN_BANK_EN: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'She is busy', ['He is busy', 'She is ready'], 0, 'Она занята'),
    round(1, 2, 'The door is open', ['The door is closed', 'The shop is open'], 1, 'Дверь открыта'),
    round(1, 3, 'We are at home', ['We are at work', 'They are at home'], 2, 'Мы дома'),
    round(1, 4, 'The bus is late', ['The bus is here', 'My bus is late'], 0, 'Автобус опаздывает'),
    round(1, 5, 'My hands are cold', ['Your hands are cold', 'My hands are warm'], 1, 'Мои руки холодные'),
    round(1, 6, 'Your coffee is ready', ['Your coffee is cold', 'Our coffee is ready'], 2, 'Ваш кофе готов'),
  ],
  2: [
    round(2, 1, 'She is not ready', ['He is not ready', 'She is not busy'], 1, 'Она не готова'),
    round(2, 2, 'Are you ready?', ['Are we ready?', 'Are they ready?'], 0, 'Вы готовы?'),
    round(2, 3, 'Is the bus here?', ['Is the lift here?', 'Is the bus late?'], 2, 'Автобус здесь?'),
    round(2, 4, 'Is this seat free?', ['Is your seat free?', 'Is this room free?'], 1, 'Это место свободно?'),
    round(2, 5, 'The platform is not empty', ['The platform is not safe', 'The station is not empty'], 0, 'Платформа не пуста'),
    round(2, 6, 'Are your hands cold?', ['Are her hands cold?', 'Are your hands warm?'], 2, 'Ваши руки холодные?'),
  ],
  3: [
    round(3, 1, 'She works nearby', ['He works nearby', 'She lives nearby'], 0, 'Она работает неподалёку'),
    round(3, 2, 'We start early', ['We start late', 'We finish early'], 1, 'Мы начинаем рано'),
    round(3, 3, 'The shop opens at nine', ['The shop opens at ten', 'The shop closes at nine'], 2, 'Магазин открывается в девять'),
    round(3, 4, 'He takes the train', ['She takes the train', 'He takes the bus'], 1, 'Он ездит на поезде'),
    round(3, 5, 'I need help', ['We need help', 'I want help'], 0, 'Мне нужна помощь'),
    round(3, 6, 'The bus leaves at eight', ['The bus leaves at nine', 'The train leaves at eight'], 2, 'Автобус отправляется в восемь'),
  ],
  4: [
    round(4, 1, 'I do not drive', ['We do not drive', 'I do not smoke'], 1, 'Я не вожу машину'),
    round(4, 2, 'She does not smoke', ['He does not smoke', 'She does not drive'], 0, 'Она не курит'),
    round(4, 3, 'The tap does not work', ['The lift does not work', 'My tap does not work'], 2, 'Кран не работает'),
    round(4, 4, 'They do not accept cards', ['They do not accept coins', 'We do not accept cards'], 1, 'Они не принимают карты'),
    round(4, 5, 'We do not need a receipt', ['We do not have a receipt', 'I do not need a receipt'], 0, 'Нам не нужен чек'),
    round(4, 6, 'This key does not fit', ['That key does not fit', 'This key does not work'], 2, 'Этот ключ не подходит'),
  ],
  5: [
    round(5, 1, 'Do you drive?', ['Do they drive?', 'Do you smoke?'], 0, 'Вы водите машину?'),
    round(5, 2, 'Does she want tea?', ['Does he want tea?', 'Does she want coffee?'], 2, 'Она хочет чаю?'),
    round(5, 3, 'Do we pay here?', ['Do you pay here?', 'Do we sign here?'], 1, 'Мы платим здесь?'),
    round(5, 4, 'Does the door lock?', ['Does the gate lock?', 'Does the door open?'], 0, 'Дверь запирается?'),
    round(5, 5, 'Do you need my address?', ['Do you have my address?', 'Do they need my address?'], 1, 'Вам нужен мой адрес?'),
    round(5, 6, 'Does this bus stop here?', ['Does this train stop here?', 'Does that bus stop here?'], 2, 'Этот автобус останавливается здесь?'),
  ],
  6: [
    round(6, 1, 'Where do you work?', ['When do you work?', 'Where do you live?'], 1, 'Где вы работаете?'),
    round(6, 2, 'When does it close?', ['When does it open?', 'When does it start?'], 0, 'Когда оно закрывается?'),
    round(6, 3, 'What do you need?', ['What do you want?', 'What do they need?'], 2, 'Что вам нужно?'),
    round(6, 4, 'Where do I sign?', ['Where do we sign?', 'When do I sign?'], 0, 'Где мне расписаться?'),
    round(6, 5, 'Which card do you use?', ['Which desk do you use?', 'Which card do you need?'], 1, 'Какую карту вы используете?'),
    round(6, 6, 'Who checks the orders?', ['Who checks the post?', 'Who has the orders?'], 2, 'Кто проверяет заказы?'),
  ],
  7: [
    round(7, 1, 'I have a ticket', ['We have a ticket', 'I have a question'], 2, 'У меня есть билет'),
    round(7, 2, 'She has a headache', ['He has a headache', 'She has a cough'], 0, 'У неё болит голова'),
    round(7, 3, 'They have a car', ['We have a car', 'They have a bicycle'], 1, 'У них есть машина'),
    round(7, 4, 'Do you have a pen?', ['Do you have a charger?', 'Do they have a pen?'], 0, 'У вас есть ручка?'),
    round(7, 5, 'He has a fever', ['She has a fever', 'He has a cold'], 2, 'У него температура'),
    round(7, 6, 'We have a table for two', ['We have a table for three', 'They have a table for two'], 1, 'У нас есть столик на двоих'),
  ],
  8: [
    round(8, 1, 'I start at seven', ['I start at eleven', 'We start at seven'], 0, 'Я начинаю в семь'),
    round(8, 2, 'We meet on Tuesday', ['We meet on Thursday', 'We meet on Monday'], 1, 'Мы встречаемся во вторник'),
    round(8, 3, 'I travel in July', ['I travel in June', 'I travel in January'], 2, 'Я путешествую в июле'),
    round(8, 4, 'She starts next week', ['He starts next week', 'She works next week'], 0, 'Она начинает на следующей неделе'),
    round(8, 5, 'The film starts tonight', ['The film starts today', 'The concert starts tonight'], 1, 'Фильм начинается сегодня вечером'),
    round(8, 6, 'The last bus leaves at eleven', ['The last bus leaves at seven', 'The last train leaves at eleven'], 2, 'Последний автобус отправляется в одиннадцать'),
  ],
};
