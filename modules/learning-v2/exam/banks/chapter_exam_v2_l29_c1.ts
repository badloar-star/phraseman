// chapter_exam_v2_l29_c1.ts — банк экзамена v2: урок 29, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): урок 29 учит уточнять «который»: who — о человеке
// (the man who lives upstairs), that / which — о вещи (a key that opens this door) — и договариваться «я …, если …»
// (I will join if there is a place) (1–8). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C1: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l29c1_who', label: { ru: 'человек, который … — who', uk: 'людина, яка … — who' }, episodeOrdinals: [1, 2, 5] },
    { id: 'l29c1_that_which', label: { ru: 'вещь, которая … — that / which', uk: 'річ, яка … — that / which' }, episodeOrdinals: [1, 3, 4] },
    { id: 'l29c1_will_if', label: { ru: 'я …, если … — I will … if …', uk: 'я …, якщо … — I will … if …' }, episodeOrdinals: [2, 3, 5] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l29c1-01', type: 'situation', grammarPoint: 'l29c1_who', situation: { ru: 'Ты забыл в кафе перчатки и вернулся. Скажи кассиру, что ищешь баристу, который делал тебе кофе.', uk: 'Ти забув у кафе рукавички й повернувся. Скажи касирові, що шукаєш баристу, який робив тобі каву.' }, accepted: ['I am looking for the barista who made my coffee.'] },
    { id: 'l29c1-02', type: 'situation', grammarPoint: 'l29c1_that_which', situation: { ru: 'В связке десять ключей. Скажи соседу, что тебе нужен ключ, который открывает эту дверь.', uk: 'У зв’язці десять ключів. Скажи сусідові, що тобі потрібен ключ, який відчиняє ці двері.' }, accepted: ['I need a key that opens this door.', 'I need a key which opens this door.'] },
    { id: 'l29c1-03', type: 'situation', grammarPoint: 'l29c1_will_if', situation: { ru: 'Официант предлагает десерт сразу. Скажи, что закажешь его, если ещё будешь голоден.', uk: 'Офіціант пропонує десерт одразу. Скажи, що замовиш його, якщо ще будеш голодний.' }, accepted: ['I will order dessert if I am still hungry.', 'If I am still hungry, I will order dessert.'] },
    { id: 'l29c1-04', type: 'situation', grammarPoint: 'l29c1_who', situation: { ru: 'Гость спрашивает, кто поздоровался с вами на лестнице. Скажи, что это мужчина, который живёт наверху.', uk: 'Гість питає, хто привітався з вами на сходах. Скажи, що це чоловік, який живе нагорі.' }, accepted: ['That is the man who lives upstairs.', 'He is the man who lives upstairs.'] },
    { id: 'l29c1-05', type: 'situation', grammarPoint: 'l29c1_that_which', situation: { ru: 'Продавец показывает сумки без карманов. Скажи, что тебе нужна сумка, в которой есть карман.', uk: 'Продавець показує сумки без кишень. Скажи, що тобі потрібна сумка, у якій є кишеня.' }, accepted: ['I need a bag that has a pocket.', 'I need a bag which has a pocket.'] },
    { id: 'l29c1-06', type: 'situation', grammarPoint: 'l29c1_will_if', situation: { ru: 'Мастер спрашивает, когда прийти чинить окно. Скажи, что ты будешь дома, если он придёт завтра.', uk: 'Майстер питає, коли прийти лагодити вікно. Скажи, що ти будеш удома, якщо він прийде завтра.' }, accepted: ['I will be at home if you come tomorrow.', 'If you come tomorrow, I will be at home.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l29c1-07', type: 'dialogue', grammarPoint: 'l29c1_who', partnerLine: 'Who called?', situation: { ru: 'Звонила женщина, и она уже ждёт в холле. Скажи, что женщина, которая звонила, ждёт.', uk: 'Дзвонила жінка, і вона вже чекає в холі. Скажи, що жінка, яка дзвонила, чекає.' }, accepted: ['The woman who called is waiting.'] },
    { id: 'l29c1-08', type: 'dialogue', grammarPoint: 'l29c1_that_which', partnerLine: 'Does the risotto contain mushrooms?', situation: { ru: 'Тебе нельзя сливки. Скажи, что тебе нужен соус, в котором нет сливок.', uk: 'Тобі не можна вершків. Скажи, що тобі потрібен соус, у якому немає вершків.' }, accepted: ['I need a sauce that contains no cream.', 'I need a sauce which contains no cream.'] },
    { id: 'l29c1-09', type: 'dialogue', grammarPoint: 'l29c1_will_if', partnerLine: 'Please call me when you arrive.', situation: { ru: 'Ты заказываешь еду на дом для гостей. Скажи курьеру, что позвонишь, если понадобится ещё еды.', uk: 'Ти замовляєш їжу додому для гостей. Скажи кур’єрові, що зателефонуєш, якщо знадобиться ще їжі.' }, accepted: ['I will call if we need more food.', 'If we need more food, I will call.'] },
    { id: 'l29c1-10', type: 'dialogue', grammarPoint: 'l29c1_who', partnerLine: 'Could you look at the cracked window?', situation: { ru: 'Стекольщик, который уже чинил тебе окно, как раз пришёл. Скажи, что он здесь.', uk: 'Скляр, який уже лагодив тобі вікно, якраз прийшов. Скажи, що він тут.' }, accepted: ['The man who repaired the window is here.'] },
    { id: 'l29c1-11', type: 'dialogue', grammarPoint: 'l29c1_that_which', partnerLine: 'Could I see the class timetable?', situation: { ru: 'Ты работаешь до шести. Скажи, что тебе нужно занятие, которое начинается после шести.', uk: 'Ти працюєш до шостої. Скажи, що тобі потрібне заняття, яке починається після шостої.' }, accepted: ['I need a class that starts after six.', 'I need a class which starts after six.'] },
    { id: 'l29c1-12', type: 'dialogue', grammarPoint: 'l29c1_will_if', partnerLine: 'Can I join the dodgeball game?', situation: { ru: 'Ты тоже хочешь поиграть. Скажи, что присоединишься, если есть место.', uk: 'Ти теж хочеш пограти. Скажи, що приєднаєшся, якщо є місце.' }, accepted: ['I will join if there is a place.', 'If there is a place, I will join.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l29c1-13', type: 'fix', grammarPoint: 'l29c1_who', wrong: 'The barista which made my coffee is here.', accepted: ['The barista who made my coffee is here.'] },
    { id: 'l29c1-14', type: 'fix', grammarPoint: 'l29c1_that_which', wrong: 'I need a key who opens this door.', accepted: ['I need a key that opens this door.', 'I need a key which opens this door.'] },
    { id: 'l29c1-15', type: 'fix', grammarPoint: 'l29c1_will_if', wrong: 'I will buy the set if it will cost less.', accepted: ['I will buy the set if it costs less.', 'If it costs less, I will buy the set.'] },
    { id: 'l29c1-16', type: 'fix', grammarPoint: 'l29c1_who', wrong: 'The woman who call is waiting.', accepted: ['The woman who called is waiting.'] },
  ],
};
