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
  // зачем (сессия макетов 12.11): уроки 9–12; звучат только фразы урока — у них уже есть запись курса
  9: [
    round(9, 1, 'There is a lift', ['There is a queue', 'There is a map'], 0, 'Есть лифт'),
    round(9, 2, 'There are two queues', ['There are two stops', 'There are three queues'], 1, 'Есть две очереди'),
    round(9, 3, 'There is no hot water', ['There is no cold water', 'There is no hot soup'], 2, 'Нет горячей воды'),
    round(9, 4, 'Is there a direct train?', ['Is there a direct bus?', 'Is there a late train?'], 0, 'Есть ли прямой поезд?'),
    round(9, 5, 'There are no trains after midnight', ['There are no buses after midnight', 'There are no trains after nine'], 1, 'Нет поездов после полуночи'),
    round(9, 6, 'There is bread on the table', ['There is bread on the shelf', 'There is soup on the table'], 2, 'Есть хлеб на столе'),
  ],
  10: [
    round(10, 1, 'I can swim', ['I can wait', 'We can swim'], 0, 'Я умею плавать'),
    round(10, 2, 'We can wait', ['We can stay', 'They can wait'], 1, 'Мы можем подождать'),
    round(10, 3, 'Can I sit here?', ['Can I stay here?', 'Can we sit here?'], 2, 'Можно мне сесть здесь?'),
    round(10, 4, 'Can you say that again?', ['Can you write that again?', 'Can you say that slowly?'], 0, 'Можете сказать это ещё раз?'),
    round(10, 5, 'You should keep the receipt', ['You should check the receipt', 'You should keep the ticket'], 1, 'Вам следует сохранить чек'),
    round(10, 6, 'He has to bring his passport', ['He has to bring his ticket', 'She has to bring his passport'], 2, 'Он должен принести свой паспорт'),
  ],
  11: [
    round(11, 1, 'I called the office', ['I called the driver', 'We called the office'], 0, 'Я позвонил в офис'),
    round(11, 2, 'She called a taxi', ['She called a friend', 'She booked a taxi'], 1, 'Она вызвала такси'),
    round(11, 3, 'We cleaned the kitchen', ['We cleaned the room', 'We locked the kitchen'], 2, 'Мы убрали кухню'),
    round(11, 4, 'He signed the receipt', ['He signed the form', 'He checked the receipt'], 0, 'Он подписал чек'),
    round(11, 5, 'Did you call the office?', ['Did you call the driver?', 'Did they call the office?'], 1, 'Вы звонили в офис?'),
    round(11, 6, 'They booked two seats', ['They booked two rooms', 'They booked three seats'], 2, 'Они забронировали два места'),
  ],
  12: [
    round(12, 1, 'I bought fresh bread', ['I bought fresh milk', 'We bought fresh bread'], 0, 'Я купил свежий хлеб'),
    round(12, 2, 'She lost her bus pass', ['She lost her bus ticket', 'He lost her bus pass'], 1, 'Она потеряла свой проездной'),
    round(12, 3, 'We caught the early train', ['We caught the last train', 'We caught the early bus'], 2, 'Мы сели на ранний поезд'),
    round(12, 4, 'Did you see the sign?', ['Did you see the map?', 'Did you read the sign?'], 0, 'Ты видел знак?'),
    round(12, 5, 'I forgot my password', ['I forgot my ticket', 'I forgot your password'], 1, 'Я забыл свой пароль'),
    round(12, 6, 'He gave me a lift', ['He gave me a pen', 'She gave me a lift'], 2, 'Он подвёз меня'),
  ],
  // зачем (координатор 12.11): уроки 13–16; звучат только фразы урока — у них уже есть запись курса
  13: [
    round(13, 1, 'I will wait outside', ['We will wait outside', 'I will wait here'], 0, 'Я подожду снаружи'),
    round(13, 2, 'She will call later', ['He will call later', 'She will call tomorrow'], 1, 'Она позвонит позже'),
    round(13, 3, 'We will pay by card', ['They will pay by card', 'We will pay by phone'], 2, 'Мы заплатим картой'),
    round(13, 4, 'Will it rain tomorrow?', ['Will it rain tonight?', 'Will it rain today?'], 0, 'Завтра будет дождь?'),
    round(13, 5, 'The soup will be ready soon', ['The soup will be ready later', 'The tea will be ready soon'], 1, 'Суп скоро будет готов'),
    round(13, 6, 'He will check the lock', ['He will check the gate', 'She will check the lock'], 2, 'Он проверит замок'),
  ],
  14: [
    round(14, 1, 'This bag is lighter', ['That bag is lighter', 'This bag is heavier'], 0, 'Эта сумка легче'),
    round(14, 2, 'This room is warmer', ['This room is colder', 'This room is smaller'], 1, 'В этой комнате теплее'),
    round(14, 3, 'This route is shorter', ['This route is longer', 'This road is shorter'], 2, 'Этот маршрут короче'),
    round(14, 4, 'The bus is cheaper', ['The bus is faster', 'The train is cheaper'], 0, 'Автобус дешевле'),
    round(14, 5, 'Which room is the quietest?', ['Which room is the smallest?', 'Which route is the quietest?'], 1, 'Какая комната самая тихая?'),
    round(14, 6, 'This is the nearest exit', ['This is the nearest stop', 'That is the nearest exit'], 2, 'Это ближайший выход'),
  ],
  15: [
    round(15, 1, 'This is my coat', ['This is my bag', 'This is your coat'], 0, 'Это моё пальто'),
    round(15, 2, 'This key is hers', ['This key is his', 'This key is yours'], 1, 'Этот ключ её'),
    round(15, 3, 'My gloves are wet', ['My gloves are here', 'My boots are wet'], 2, 'Мои перчатки мокрые'),
    round(15, 4, 'Whose coat is this?', ['Whose bag is this?', 'Whose coat is that?'], 0, 'Чьё это пальто?'),
    round(15, 5, 'Their boots are outside', ['Their bags are outside', 'Our boots are outside'], 1, 'Их ботинки снаружи'),
    round(15, 6, 'I found my umbrella', ['I found my badge', 'I lost my umbrella'], 2, 'Я нашёл свой зонтик'),
  ],
  16: [
    round(16, 1, 'I get up at seven', ['I get up at six', 'We get up at seven'], 0, 'Я встаю в семь'),
    round(16, 2, 'Turn on the lamp', ['Turn off the lamp', 'Turn on the fan'], 1, 'Включите лампу'),
    round(16, 3, 'Pick up the phone', ['Pick up the box', 'Pick up the bag'], 2, 'Поднимите трубку'),
    round(16, 4, 'We ran out of milk', ['We ran out of bread', 'We ran out of paper'], 0, 'У нас закончилось молоко'),
    round(16, 5, 'She gets off at the next stop', ['She gets on at the next stop', 'She gets off at the last stop'], 1, 'Она выходит на следующей остановке'),
    round(16, 6, 'The alarm went off at five', ['The alarm went off at six', 'The alarm went off at seven'], 2, 'Будильник зазвонил в пять'),
  ],
  // зачем (сессия Elevate 12.11): уроки 17–20; звучат только фразы урока — у них уже есть запись курса
  17: [
    round(17, 1, 'I am waiting', ['I am listening', 'I am leaving'], 0, 'Я жду'),
    round(17, 2, 'The phone is ringing', ['The phone is charging', 'The phone is working'], 1, 'Телефон звонит'),
    round(17, 3, 'The bus is coming', ['The bus is moving', 'The taxi is coming'], 2, 'Автобус подъезжает'),
    round(17, 4, 'Are you listening?', ['Are you leaving?', 'Are they listening?'], 0, 'Ты слушаешь?'),
    round(17, 5, 'Is the kettle boiling?', ['Is the water boiling?', 'Is the kettle working?'], 1, 'Чайник кипит?'),
    round(17, 6, 'It is not raining now', ['It is not raining today', 'It is not working now'], 2, 'Сейчас не идёт дождь'),
  ],
  18: [
    round(18, 1, 'Wait by the gate', ['Wait by the door', 'Wait by the lift'], 0, 'Подождите у ворот'),
    round(18, 2, 'Hold the handrail', ['Hold the door', 'Hold the handle'], 1, 'Держитесь за поручень'),
    round(18, 3, 'Do not touch the oven', ['Do not touch the kettle', 'Do not open the oven'], 2, 'Не прикасайтесь к духовке'),
    round(18, 4, 'Turn left at the bank', ['Turn right at the bank', 'Turn left at the pharmacy'], 0, 'Поверните налево у банка'),
    round(18, 5, 'Take the second exit', ['Take the first exit', 'Take the second bus'], 1, 'Сверните на втором съезде'),
    round(18, 6, "Let's share a taxi", ["Let's book a taxi", "Let's share a table"], 2, 'Давай поедем на одном такси'),
  ],
  19: [
    round(19, 1, 'The keys are on the shelf', ['The keys are on the desk', 'The keys are under the shelf'], 0, 'Ключи лежат на полке'),
    round(19, 2, 'The keys are in the drawer', ['The keys are in the folder', 'The bags are in the drawer'], 1, 'Ключи лежат в ящике'),
    round(19, 3, 'My coat is behind the door', ['My coat is behind the chair', 'My coat is by the door'], 2, 'Моё пальто за дверью'),
    round(19, 4, 'She is on the bus', ['She is on the train', 'He is on the bus'], 0, 'Она в автобусе'),
    round(19, 5, 'The pharmacy is opposite the bank', ['The pharmacy is opposite the hotel', 'The bakery is opposite the bank'], 1, 'Аптека напротив банка'),
    round(19, 6, 'Is the room on the ground floor?', ['Is the lift on the ground floor?', 'Is the room on the top floor?'], 2, 'Комната на первом этаже?'),
  ],
  20: [
    round(20, 1, 'I need a pen', ['I need a key', 'I need a map'], 0, 'Мне нужна ручка'),
    round(20, 2, 'She has a receipt', ['She has a ticket', 'He has a receipt'], 1, 'У неё есть чек'),
    round(20, 3, 'We need a taxi', ['We need a table', 'We want a taxi'], 2, 'Нам нужно такси'),
    round(20, 4, 'He walks to work', ['She walks to work', 'He goes to work'], 0, 'Он ходит на работу пешком'),
    round(20, 5, 'I buy fruit at the market', ['I buy bread at the market', 'I buy fruit at the shop'], 1, 'Я покупаю фрукты на рынке'),
    round(20, 6, 'The bread on the table is fresh', ['The bread on the shelf is fresh', 'The bread on the table is cold'], 2, 'Хлеб на столе свежий'),
  ],
};
