/**
 * Банк игры «Лишнее слово» — английский классический курс, уроки 1–8 (D207).
 * зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 * Правила вычитки: без лишнего слова остаётся фраза урока (или фраза только из слов урока);
 * с лишним словом фраза неверна; убрав любое ДРУГОЕ слово, верную фразу не получить
 * (поэтому нет заданий вида «My your keys» или «is is»); лишнее слово ученик уже встречал.
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { OddWordTask } from '../odd_word_core';

/** Лишнее слово помечено скобками: `I am [is] ready` — так индекс нельзя посчитать с ошибкой. */
function task(lesson: number, n: number, marked: string, translation: string, whyText: string): OddWordTask {
  const raw = marked.split(' ');
  const extraIndex = raw.findIndex((w) => w.startsWith('['));
  const words = raw.map((w) => w.replace(/[[\]]/g, ''));
  const extra = (words[extraIndex] ?? '').replace(/[?.,!]/g, '');
  return {
    id: `ow-en-l${String(lesson).padStart(2, '0')}-${n}`,
    words,
    extraIndex,
    translation,
    whyTitle: `«${extra}» здесь лишнее`,
    whyText,
  };
}

export const ODD_WORD_BANK_EN: Readonly<Record<number, readonly OddWordTask[]>> = {
  1: [
    task(1, 1, 'I am [is] ready', 'Я готов', 'С I всегда идёт am.'),
    task(1, 2, 'She is [are] busy', 'Она занята', 'С she идёт is, а не are.'),
    task(1, 3, 'We [is] are free', 'Мы свободны', 'С we идёт are, а не is.'),
    task(1, 4, 'They [am] are late', 'Они опаздывают', 'Am бывает только с I.'),
    task(1, 5, 'The shops [is] are open', 'Магазины открыты', 'Shops — их несколько, значит are.'),
    task(1, 6, 'He is [at] here', 'Он здесь', 'Here обходится без at.'),
    task(1, 7, 'The kitchen is [the] warm', 'Кухня тёплая', 'Warm — это «тёплая», the перед ним не ставят.'),
    task(1, 8, 'The door is [it] closed', 'Дверь закрыта', 'The door уже названа — it её повторяет.'),
  ],
  2: [
    task(2, 1, 'I am [no] not late', 'Я не опаздываю', 'Внутри фразы «не» — это not. No — отдельный ответ «нет».'),
    task(2, 2, 'Is she [are] ready?', 'Она готова?', 'С she идёт is, и оно уже стоит в начале.'),
    task(2, 3, 'Is this seat [it] free?', 'Это место свободно?', 'This seat уже названо — it его повторяет.'),
    task(2, 4, 'Are these [this] seats free?', 'Эти места свободны?', 'Seats — их несколько, значит these.'),
    task(2, 5, 'Is this [these] ticket valid?', 'Этот билет действителен?', 'Ticket — один, значит this.'),
    task(2, 6, 'The lift is not [at] here', 'Лифт не здесь', 'Here обходится без at.'),
    task(2, 7, 'Am I [is] early?', 'Я рано?', 'С I идёт am, и оно уже стоит в начале.'),
    task(2, 8, 'The stairs [is] are not safe', 'Лестница небезопасна', 'Stairs — ступеней много, значит are.'),
  ],
  3: [
    task(3, 1, 'I walk [to] home', 'Я иду пешком домой', 'Home обходится без to.'),
    task(3, 2, 'The cafe closes [at] early', 'Кафе закрывается рано', 'At ставят перед часом: at nine. Early обходится без него.'),
    task(3, 3, 'She walks to [the] work', 'Она идёт пешком на работу', 'To work — «на работу», без the.'),
    // зачем (владелец 11.11, «Да, принять»): прежние «I am need help» и «He is checks his phone» давали гладкую бессмыслицу, если убрать соседнее слово
    task(3, 4, 'The class starts at [on] ten', 'Занятие начинается в десять', 'Перед часом ставят at: at ten.'),
    task(3, 5, 'He [is] wants tea', 'Он хочет чай', 'Wants справляется сам, is тут не нужно.'),
    task(3, 6, 'My shift starts [at] soon', 'Моя смена скоро начинается', 'At ставят перед часом: at ten. Soon обходится без него.'),
    task(3, 7, 'This key opens [it] the gate', 'Этот ключ открывает ворота', 'The gate уже названы — it их повторяет.'),
    task(3, 8, 'The shop opens at [the] nine', 'Магазин открывается в девять', 'Перед часом the не ставят: at nine.'),
  ],
  4: [
    task(4, 1, 'She does [do] not smoke', 'Она не курит', 'С she идёт does, do тут лишнее.'),
    task(4, 2, 'We [does] do not drive', 'Мы не водим машину', 'С we идёт do, а не does.'),
    task(4, 3, 'The tap [is] does not work', 'Кран не работает', 'Помощник здесь уже есть — это does.'),
    task(4, 4, 'I do [no] not eat meat', 'Я не ем мясо', 'После do идёт not. No — отдельный ответ «нет».'),
    task(4, 5, 'I do not have [a] cash', 'У меня нет наличных', 'Cash не считают штуками — a не нужно.'),
    task(4, 6, 'This train does not go to [the] Cork', 'Этот поезд не едет в Корк', 'Перед названием города the не ставят.'),
    task(4, 7, 'The buses do not run [at] today', 'Автобусы не ходят сегодня', 'Today обходится без at.'),
    task(4, 8, 'I [am] do not know the code', 'Я не знаю код', 'Помощник здесь уже есть — это do.'),
  ],
  5: [
    task(5, 1, 'Does [do] she drive?', 'Она водит машину?', 'С she идёт does, и оно уже стоит в начале.'),
    task(5, 2, 'Do [does] they work nearby?', 'Они работают поблизости?', 'С they идёт do, и оно уже стоит в начале.'),
    task(5, 3, 'Does it [is] work?', 'Это работает?', 'Помощник здесь уже есть — это does.'),
    task(5, 4, 'Do we need [a] tickets?', 'Нам нужны билеты?', 'Tickets — их несколько, a ставят только перед одним.'),
    task(5, 5, 'Does the lift go [to] down?', 'Лифт идёт вниз?', 'Down обходится без to.'),
    task(5, 6, 'Do you hear [to] that noise?', 'Вы слышите тот шум?', 'После hear сразу идёт то, что слышно.'),
    task(5, 7, 'Does the key [it] fit?', 'Ключ подходит?', 'The key уже назван — it его повторяет.'),
    task(5, 8, 'Do you [are] need a bag?', 'Вам нужна сумка?', 'Помощник здесь уже есть — это do.'),
  ],
  6: [
    task(6, 1, 'Where does [do] she live?', 'Где она живёт?', 'С she идёт does, do тут лишнее.'),
    task(6, 2, 'When do [does] we start?', 'Когда мы начинаем?', 'С we идёт do, does тут лишнее.'),
    task(6, 3, 'What [is] does he want?', 'Что он хочет?', 'Помощник здесь уже есть — это does.'),
    task(6, 4, 'Which bus [does] goes to the centre?', 'Какой автобус едет до центра?', 'Автобус едет сам: goes, и помощник не нужен.'),
    // зачем (владелец 11.11): прежнее «Who do teaches…» спорило с «Who do I call?» из того же урока — объяснение путало
    task(6, 5, 'What time do you finish [to] work?', 'Во сколько вы заканчиваете работу?', 'После finish сразу идёт work, без to.'),
    task(6, 6, 'How long [time] does the journey take?', 'Сколько времени занимает поездка?', 'How long уже значит «как долго».'),
    task(6, 7, 'Which [the] colour do you prefer?', 'Какой цвет вы предпочитаете?', 'После which сразу идёт colour, без the.'),
    task(6, 8, 'Where does this train [it] stop?', 'Где этот поезд останавливается?', 'This train уже назван — it его повторяет.'),
  ],
  7: [
    task(7, 1, 'She [have] has a ticket', 'У неё есть билет', 'С she идёт has, а не have.'),
    task(7, 2, 'They [has] have a car', 'У них есть машина', 'С they идёт have, а не has.'),
    // зачем (владелец 11.11, «Да, принять»): прежнее «I am have a question» без have давало гладкое «I am a question»
    task(7, 3, 'Do you [are] have a pen?', 'У вас есть ручка?', 'Помощник здесь уже есть — это do.'),
    task(7, 4, 'We have [a] time', 'У нас есть время', 'Time здесь не считают штуками — a не нужно.'),
    task(7, 5, 'The form has [a] three pages', 'У анкеты три страницы', 'Страниц три, a ставят только перед одной.'),
    task(7, 6, 'Does she [has] have her passport?', 'У неё с собой паспорт?', 'После does идёт have, а не has.'),
    task(7, 7, 'I do [no] not have a booking', 'У меня нет бронирования', 'После do идёт not. No — отдельный ответ «нет».'),
    task(7, 8, 'Does the bag [it] have a zip?', 'На сумке есть молния?', 'The bag уже названа — it её повторяет.'),
  ],
  8: [
    task(8, 1, 'I start at [on] seven', 'Я начинаю в семь', 'Время на часах — с at.'),
    task(8, 2, 'We meet [at] on Tuesday', 'Мы встречаемся во вторник', 'Дни недели — с on.'),
    task(8, 3, 'My birthday is [at] in June', 'Мой день рождения в июне', 'Месяцы — с in.'),
    task(8, 4, 'She starts [on] next week', 'Она начинает на следующей неделе', 'Next week обходится без on.'),
    task(8, 5, 'The film starts [at] tonight', 'Фильм начинается сегодня вечером', 'Tonight обходится без at.'),
    task(8, 6, 'I see him [in] every morning', 'Я вижу его каждое утро', 'Every morning обходится без in.'),
    task(8, 7, 'We finish at [the] midnight', 'Мы заканчиваем в полночь', 'At midnight — без the.'),
    task(8, 8, 'She studies [at] in the evening', 'Она учится вечером', 'Вечером — in the evening.'),
  ],
  // зачем (сессия макетов 12.11: банки кончались на уроке 8): уроки 9–12 по тем же правилам вычитки; отброшены задания,
  // где без соседнего слова остаётся разговорная фраза («There's eggs», «He did his glasses»)
  9: [
    task(9, 1, 'There is [a] milk in the fridge', 'Есть молоко в холодильнике', 'Milk не считают штуками — a не нужно.'),
    task(9, 2, 'There are [a] two queues', 'Есть две очереди', 'Очередей две, a ставят только перед одной.'),
    task(9, 3, 'There is a toilet [at] upstairs', 'Есть туалет наверху', 'Upstairs обходится без at.'),
    task(9, 4, 'Is there a bus stop [at] nearby?', 'Есть ли автобусная остановка поблизости?', 'Nearby обходится без at.'),
    task(9, 5, 'There is no [any] hot water', 'Нет горячей воды', 'No уже значит «нет» — any не нужно.'),
    task(9, 6, 'There are no buses [at] tonight', 'Нет автобусов сегодня вечером', 'Tonight обходится без at.'),
    task(9, 7, 'There is [a] bread on the table', 'Есть хлеб на столе', 'Bread не считают штуками — a не нужно.'),
    task(9, 8, 'Are there [a] any blankets?', 'Есть ли какие-нибудь одеяла?', 'Any уже значит «какие-нибудь» — a не нужно.'),
  ],
  10: [
    task(10, 1, 'I can [to] swim', 'Я умею плавать', 'После can сразу идёт swim, без to.'),
    task(10, 2, 'She [is] can drive', 'Она умеет водить машину', 'Can справляется сам, is тут не нужно.'),
    task(10, 3, 'We cannot [to] open the gate', 'Мы не можем открыть ворота', 'После cannot сразу идёт open, без to.'),
    task(10, 4, 'Can I [to] sit here?', 'Можно мне сесть здесь?', 'После can I сразу идёт sit.'),
    task(10, 5, 'Can you [to] speak more slowly?', 'Можете говорить медленнее?', 'После can you сразу идёт speak.'),
    task(10, 6, 'You should [to] keep the receipt', 'Вам следует сохранить чек', 'После should сразу идёт keep, без to.'),
    task(10, 7, 'You must [to] wear a helmet', 'Вы обязаны носить шлем', 'После must сразу идёт wear, без to.'),
    task(10, 8, 'Can I [am] pay by card?', 'Можно мне расплатиться картой?', 'Вопрос уже начат с can — am не нужно.'),
  ],
  11: [
    task(11, 1, 'I [am] walked home yesterday', 'Я вчера пошёл домой пешком', 'Walked уже говорит о прошлом — am не нужно.'),
    task(11, 2, 'I called [to] the office', 'Я позвонил в офис', 'После called сразу идёт the office, без to.'),
    task(11, 3, 'He worked from [the] home on Monday', 'Он работал из дома в понедельник', 'From home — без the.'),
    task(11, 4, 'Did you [called] call the office?', 'Вы звонили в офис?', 'После did — call, без -ed.'),
    task(11, 5, 'Did she [checked] check the address?', 'Она проверила адрес?', 'После did — check, без -ed.'),
    task(11, 6, 'I did not [checked] check the label', 'Я не проверял этикетку', 'После did not — check, без -ed.'),
    task(11, 7, 'We did not stay [a] long', 'Мы не оставались надолго', 'Long здесь значит «долго» — a не нужно.'),
    task(11, 8, 'The train arrived [at] ten minutes late', 'Поезд опоздал на десять минут', 'Ten minutes late — без at.'),
  ],
  12: [
    task(12, 1, 'I went [to] home early', 'Я ушёл домой рано', 'Home обходится без to.'),
    task(12, 2, 'We took the bus [to] home', 'Мы поехали домой на автобусе', 'Home обходится без to.'),
    task(12, 3, 'Did you [found] find your keys?', 'Ты нашёл свои ключи?', 'После did — find, а не found.'),
    task(12, 4, 'Did she [brought] bring the charger?', 'Она принесла зарядное устройство?', 'После did — bring, а не brought.'),
    task(12, 5, 'She did not [took] take my coat', 'Она не взяла мое пальто', 'После did not — take, а не took.'),
    task(12, 6, 'I paid the bill [on] online', 'Я оплатил счёт онлайн', 'Online обходится без on.'),
    task(12, 7, 'We ate lunch [at] outside', 'Мы пообедали на улице', 'Outside обходится без at.'),
    task(12, 8, 'They got home [in] at nine', 'Они вернулись домой в девять', 'Время на часах — с at.'),
  ],
  // зачем (координатор 12.11: банки кончались на уроке 12): уроки 13–16 по тем же правилам; отброшены задания, где без
  // соседнего слова остаётся живая фраза («She is off at the next stop», «I get in at seven», «He handed it in»)
  13: [
    task(13, 1, 'I will [to] wait outside', 'Я подожду снаружи', 'После will сразу идёт wait, без to.'),
    task(13, 2, 'She will [is] call later', 'Она позвонит позже', 'Will справляется сам — is не нужно.'),
    task(13, 3, 'He will [opens] open the gate', 'Он откроет ворота', 'После will — open, без -s.'),
    task(13, 4, 'We will [are] pay by card', 'Мы заплатим картой', 'Will справляется сам — are не нужно.'),
    task(13, 5, 'The shop will not [opens] open tomorrow', 'Магазин завтра не откроется', 'После will not — open, без -s.'),
    task(13, 6, 'He will not stay [at] overnight', 'Он не останется на ночь', 'Overnight обходится без at.'),
    task(13, 7, 'Will they [are] send a receipt?', 'Они пришлют квитанцию?', 'Вопрос уже начат с will — are не нужно.'),
    task(13, 8, 'When will the parcel [arrives] arrive?', 'Когда придёт посылка?', 'После will — arrive, без -s.'),
  ],
  14: [
    task(14, 1, 'This bag is [more] lighter', 'Эта сумка легче', 'Lighter уже значит «легче» — more не нужно.'),
    task(14, 2, 'The bus is [more] cheaper', 'Автобус дешевле', 'Cheaper уже значит «дешевле» — more не нужно.'),
    task(14, 3, 'The weather is [more] worse today', 'Сегодня погода хуже', 'Worse уже значит «хуже» — more не нужно.'),
    task(14, 4, 'This is the [most] nearest exit', 'Это ближайший выход', 'Nearest уже значит «ближайший» — most не нужно.'),
    task(14, 5, 'The last box is the [most] heaviest', 'Последний ящик самый тяжёлый', 'Heaviest уже значит «самый тяжёлый» — most не нужно.'),
    task(14, 6, 'Tea is cheaper [that] than coffee here', 'Чай здесь дешевле кофе', 'Сравнивают через than, that не нужно.'),
    task(14, 7, 'This train is [more] faster than the bus', 'Этот поезд быстрее автобуса', 'Faster уже значит «быстрее» — more не нужно.'),
    task(14, 8, 'Which route is the [most] fastest?', 'Какой маршрут самый быстрый?', 'Fastest уже значит «самый быстрый» — most не нужно.'),
  ],
  15: [
    task(15, 1, 'This coat is [my] mine', 'Это пальто моё', 'Mine уже значит «моё» — my не нужно.'),
    task(15, 2, 'That bag is [your] yours', 'Вон та сумка твоя', 'Yours уже значит «твоя» — your не нужно.'),
    task(15, 3, 'This key is [her] hers', 'Этот ключ её', 'Hers уже значит «её» — her не нужно.'),
    task(15, 4, 'These seats are [our] ours', 'Эти места наши', 'Ours уже значит «наши» — our не нужно.'),
    task(15, 5, 'Is this umbrella [your] yours?', 'Этот зонт твой?', 'Yours уже значит «твой» — your не нужно.'),
    task(15, 6, 'Whose keys [is] are these?', 'Чьи это ключи?', 'Ключей несколько — are, is не нужно.'),
    task(15, 7, 'They forgot their [the] own bags', 'Они забыли свои сумки', 'Their own уже говорит, чьи сумки, — the не нужно.'),
    task(15, 8, 'Their boots are [at] outside', 'Их ботинки снаружи', 'Outside обходится без at.'),
  ],
  16: [
    task(16, 1, 'Please [to] come in', 'Пожалуйста, войдите', 'После please сразу идёт come, без to.'),
    task(16, 2, 'Can you [to] look after my bag?', 'Вы можете присмотреть за моей сумкой?', 'После can you сразу идёт look, без to.'),
    task(16, 3, 'Can I [to] give it back tomorrow?', 'Могу я вернуть её завтра?', 'После can I сразу идёт give, без to.'),
    task(16, 4, 'Did you [looked] look for it downstairs?', 'Ты искал её внизу?', 'После did — look, без -ed.'),
    task(16, 5, 'We ran out [off] of milk', 'У нас закончилось молоко', '«Закончилось» — ran out of, off не нужно.'),
    task(16, 6, 'She [did] gave the book back', 'Она вернула книгу', 'Gave уже говорит о прошлом — did не нужно.'),
    task(16, 7, 'I will drop you off [at] outside', 'Я высажу тебя снаружи', 'Outside обходится без at.'),
    task(16, 8, 'I [am] wrote down the number', 'Я записал номер', 'Wrote уже говорит о прошлом — am не нужно.'),
  ],
  // зачем (сессия Elevate 12.11: «работа идёт дальше»): уроки 17–20 по тем же правилам; отброшены задания, где без
  // соседнего слова остаётся живая фраза («Wait at the gate», «Let's sit at the window», «The keys are at the shelf»)
  17: [
    task(17, 1, 'We are [to] leaving', 'Мы уходим', 'После are сразу идёт leaving, без to.'),
    task(17, 2, 'The phone [does] is ringing', 'Телефон звонит', 'Is уже есть — does не нужно.'),
    task(17, 3, 'I am [wait] waiting', 'Я жду', 'Waiting уже есть — wait не нужно.'),
    task(17, 4, 'Are you [do] listening?', 'Ты слушаешь?', 'Вопрос уже начат с are — do не нужно.'),
    task(17, 5, 'What are you [do] cooking?', 'Что ты готовишь?', 'Вопрос уже держит are — do не нужно.'),
    task(17, 6, 'She is not [does] feeling well', 'Она не очень хорошо себя чувствует', 'Is not уже есть — does не нужно.'),
    task(17, 7, 'It is not raining [at] now', 'Сейчас не идёт дождь', 'Now обходится без at.'),
    task(17, 8, 'We are not staying [at] overnight', 'Мы не остаёмся на ночь', 'Overnight обходится без at.'),
  ],
  18: [
    task(18, 1, 'Do not [to] touch the oven', 'Не прикасайтесь к духовке', 'После do not сразу идёт touch, без to.'),
    task(18, 2, 'Please [to] pass the towel', 'Пожалуйста, передайте полотенце', 'После please сразу идёт pass, без to.'),
    task(18, 3, "Let's [to] share a taxi", 'Давай поедем на одном такси', "После let's сразу идёт share, без to."),
    task(18, 4, "Let's not [to] rush", 'Не будем спешить', "После let's not сразу идёт rush, без to."),
    task(18, 5, 'Sit down [at] here', 'Сядьте здесь', 'Here обходится без at.'),
    task(18, 6, 'Please [to] keep your ticket', 'Пожалуйста, сохраните билет', 'После please сразу идёт keep, без to.'),
    task(18, 7, 'Do not [to] open the parcel yet', 'Пока не открывайте посылку', 'После do not сразу идёт open, без to.'),
    task(18, 8, "Let's [we] check the address first", 'Сначала проверим адрес', "Let's уже значит «давайте мы» — we не нужно."),
  ],
  19: [
    task(19, 1, 'The keys [is] are on the shelf', 'Ключи лежат на полке', 'Ключей несколько — are, is не нужно.'),
    task(19, 2, 'My coat [are] is behind the door', 'Моё пальто за дверью', 'Пальто одно — is, are не нужно.'),
    task(19, 3, 'The clock is above [of] the desk', 'Часы над столом', 'Above обходится без of.'),
    task(19, 4, 'The bakery is next [of] to the library', 'Пекарня находится рядом с библиотекой', 'Next to — без of.'),
    task(19, 5, 'The cash machine is beside [of] the entrance', 'Банкомат находится рядом с входом', 'Beside обходится без of.'),
    task(19, 6, 'The cafe is across [of] the road', 'Кафе находится через дорогу', 'Across обходится без of.'),
    task(19, 7, 'Sit between [of] me and Anna', 'Сядьте между мной и Анной', 'Between обходится без of.'),
    task(19, 8, 'The taxi rank is in front [at] of the station', 'Стоянка такси находится перед вокзалом', 'In front of — без at.'),
  ],
  20: [
    task(20, 1, 'I need [a] an envelope', 'Мне нужен конверт', 'Перед envelope говорят an — a не нужно.'),
    task(20, 2, 'He has [a] an appointment', 'У него назначена встреча', 'Перед appointment говорят an — a не нужно.'),
    task(20, 3, 'I have [a] an idea', 'У меня есть идея', 'Перед idea говорят an — a не нужно.'),
    task(20, 4, 'He ordered [a] an omelette', 'Он заказал омлет', 'Перед omelette говорят an — a не нужно.'),
    task(20, 5, 'We need [an] a taxi', 'Нам нужно такси', 'Перед taxi говорят a — an не нужно.'),
    task(20, 6, 'Children need [a] sleep', 'Детям нужен сон', 'Sleep не считают штуками — a не нужно.'),
    task(20, 7, 'I drink [a] water with lunch', 'Я пью воду во время обеда', 'Water не считают штуками — a не нужно.'),
    task(20, 8, 'He walks to [the] work', 'Он ходит на работу пешком', 'To work — без the.'),
  ],
  // зачем (координатор 12.11): уроки 21–24; отброшены задания, где без соседнего слова остаётся живая фраза («I am nobody…», «They are already unpacked»)
  21: [
    task(21, 1, 'Nobody [not] answered the phone', 'Никто не ответил на телефон', 'Nobody уже значит «никто не» — not не нужно.'),
    task(21, 2, 'We have nothing [not] to declare', 'Нам нечего декларировать', 'Nothing уже значит «ничего не» — not не нужно.'),
    task(21, 3, 'Did anyone [saw] see my keys?', 'Кто-нибудь видел мои ключи?', 'После did — see, без прошлого.'),
    task(21, 4, 'Everybody [are] needs a ticket', 'Всем нужен билет', 'Про everybody говорят как про одного — needs, are не нужно.'),
    task(21, 5, 'Is there [a] anywhere to park?', 'Есть где припарковаться?', 'Anywhere обходится без a.'),
    task(21, 6, 'Everything is ready [at] now', 'Теперь всё готово', 'Now обходится без at.'),
    task(21, 7, 'She did not [bought] buy anything today', 'Она сегодня ничего не купила', 'После did not — buy, без прошлого.'),
    task(21, 8, 'Can anyone [to] hear me?', 'Кто-нибудь меня слышит?', 'После can сразу идёт hear, без to.'),
  ],
  22: [
    task(22, 1, 'I enjoy [to] cooking for friends', 'Мне нравится готовить для друзей', 'После enjoy сразу идёт cooking, без to.'),
    task(22, 2, 'He avoids [to] driving at night', 'Он избегает вождения ночью', 'После avoids сразу идёт driving, без to.'),
    task(22, 3, 'Thank you for [to] helping me', 'Спасибо, что помогли мне', 'После for сразу идёт helping, без to.'),
    task(22, 4, 'Swimming [is] helps me relax', 'Плавание помогает мне расслабиться', 'Helps справляется сам — is не нужно.'),
    task(22, 5, 'I am tired of [carry] carrying this bag', 'Я устал носить эту сумку', 'После of — carrying, с -ing.'),
    task(22, 6, 'She left without [say] saying goodbye', 'Она ушла, не попрощавшись', 'После without — saying, с -ing.'),
    task(22, 7, 'He is interested [at] in learning English', 'Он интересуется изучением английского', 'Интересуется — interested in, at не нужно.'),
    task(22, 8, 'Check the date before [pay] paying', 'Проверьте дату перед оплатой', 'После before — paying, с -ing.'),
  ],
  23: [
    task(23, 1, 'The rooms [is] are cleaned daily', 'Комнаты убирают ежедневно', 'Комнат несколько — are, is не нужно.'),
    task(23, 2, 'The tickets are [sell] sold online', 'Билеты продаются онлайн', 'Продаются — are sold, sell не нужно.'),
    task(23, 3, 'The milk is delivered [at] in the morning', 'Молоко доставляют утром', 'Утром — in the morning, at не нужно.'),
    task(23, 4, 'The flight was delayed because [for] of fog', 'Рейс задержали из-за тумана', 'Из-за — because of, for не нужно.'),
    task(23, 5, 'My order [did] was not delivered', 'Мой заказ не доставили', 'Was справляется сам — did не нужно.'),
    task(23, 6, 'The door was repaired [at] on Friday', 'Дверь починили в пятницу', 'День недели — с on, at не нужно.'),
    task(23, 7, 'The boxes must [are] be labelled', 'Коробки должны быть подписаны', 'После must — be, are не нужно.'),
    task(23, 8, 'Our keys [was] were found under the bench', 'Наши ключи нашли под скамейкой', 'Ключей несколько — were, was не нужно.'),
  ],
  24: [
    task(24, 1, 'I have [send] sent the form', 'Я отправил форму', 'После have — sent, send не нужно.'),
    task(24, 2, 'She has [find] found her card', 'Она нашла свою карту', 'После has — found, find не нужно.'),
    task(24, 3, 'She has just [call] called back', 'Она только что перезвонила', 'После has — called, call не нужно.'),
    task(24, 4, 'Have you [did] finished yet?', 'Вы уже закончили?', 'Вопрос уже начат с have — did не нужно.'),
    task(24, 5, 'I have lived here [since] for a year', 'Я живу здесь уже год', 'Срок — for a year, since не нужно.'),
    task(24, 6, 'He has never [use] used a locker', 'Он никогда не пользовался шкафчиком', 'После has never — used, use не нужно.'),
    task(24, 7, 'The train left [at] ten minutes ago', 'Поезд ушёл десять минут назад', 'Ten minutes ago обходится без at.'),
    task(24, 8, 'Has she [is] ever lived abroad?', 'Она когда-нибудь жила за границей?', 'Вопрос уже начат с has — is не нужно.'),
  ],
};
