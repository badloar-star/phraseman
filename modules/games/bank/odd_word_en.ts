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
    task(6, 5, 'Who [do] teaches the evening class?', 'Кто ведёт вечерний урок?', 'Спрашиваем, кто это делает, — после who сразу teaches.'),
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
};
