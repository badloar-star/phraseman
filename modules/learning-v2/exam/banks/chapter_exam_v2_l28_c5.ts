// chapter_exam_v2_l28_c5.ts — банк экзамена v2: урок 28, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 5 урока 28 называет, КЕМ сделано — by (The statue was
// made by a sculptor) — и повторяет will be + третья форма и правила can / must be, is / are kept (33–40): искусство, кино, музыка,
// книги, музей, уборка, фото, вязание. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C5: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l28c5_by', label: { ru: 'кем сделано — was / were + … by', uk: 'ким зроблено — was / were + … by' }, episodeOrdinals: [33, 34, 35] },
    { id: 'l28c5_will_be', label: { ru: 'что сделают — will be + recorded / cleaned', uk: 'що зроблять — will be + recorded / cleaned' }, episodeOrdinals: [34, 35, 38] },
    { id: 'l28c5_rules', label: { ru: 'правила и порядок — can / must be, are kept', uk: 'правила й порядок — can / must be, are kept' }, episodeOrdinals: [36, 38, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c5-01', type: 'situation', grammarPoint: 'l28c5_by', situation: { ru: 'Гость любуется статуей в вашем парке. Скажи, что её сделал скульптор.', uk: 'Гість милується статуєю у вашому парку. Скажи, що її зробив скульптор.' }, accepted: ['The statue was made by a sculptor.', 'It was made by a sculptor.'] },
    { id: 'l28c5-02', type: 'situation', grammarPoint: 'l28c5_will_be', situation: { ru: 'Подруга не попадает на концерт. Утешь: концерт сегодня будут записывать.', uk: 'Подруга не потрапляє на концерт. Утіш: концерт сьогодні записуватимуть.' }, accepted: ['The concert will be recorded tonight.'] },
    { id: 'l28c5-03', type: 'situation', grammarPoint: 'l28c5_rules', situation: { ru: 'Читатель не находит старые книги в зале. Скажи, что книги хранятся наверху.', uk: 'Читач не знаходить старі книжки в залі. Скажи, що книжки зберігаються нагорі.' }, accepted: ['The books are kept upstairs.'] },
    { id: 'l28c5-04', type: 'situation', grammarPoint: 'l28c5_by', situation: { ru: 'Подруга хвалит семейные фото на стене. Скажи, что их сделал твой брат.', uk: 'Подруга хвалить сімейні фото на стіні. Скажи, що їх зробив твій брат.' }, accepted: ['The photos were taken by my brother.', 'They were taken by my brother.'] },
    { id: 'l28c5-05', type: 'situation', grammarPoint: 'l28c5_will_be', situation: { ru: 'Соседка жалуется на грязные окна в подъезде. Скажи, что их вымоют завтра.', uk: 'Сусідка скаржиться на брудні вікна в під’їзді. Скажи, що їх вимиють завтра.' }, accepted: ['The windows will be cleaned tomorrow.'] },
    { id: 'l28c5-06', type: 'situation', grammarPoint: 'l28c5_rules', situation: { ru: 'Ты билетёр в кинозале. Напомни, что телефоны нужно выключить.', uk: 'Ти контролер у кінозалі. Нагадай, що телефони треба вимкнути.' }, accepted: ['Phones must be switched off.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c5-07', type: 'dialogue', grammarPoint: 'l28c5_by', partnerLine: 'Who made this?', situation: { ru: 'Гость смотрит на рисунок на холодильнике. Скажи, что его нарисовала твоя сестра.', uk: 'Гість дивиться на малюнок на холодильнику. Скажи, що його намалювала твоя сестра.' }, accepted: ['This was drawn by my sister.', 'It was drawn by my sister.'] },
    { id: 'l28c5-08', type: 'dialogue', grammarPoint: 'l28c5_will_be', partnerLine: 'Are there any seats left?', situation: { ru: 'Мест на сегодня нет. Скажи, что фильм покажут снова завтра.', uk: 'Місць на сьогодні немає. Скажи, що фільм покажуть знову завтра.' }, accepted: ['The film will be shown again tomorrow.'] },
    { id: 'l28c5-09', type: 'dialogue', grammarPoint: 'l28c5_rules', partnerLine: 'Can I help you clean the kitchen?', situation: { ru: 'Покажи гостю, где тряпки: они хранятся под раковиной.', uk: 'Покажи гостеві, де ганчірки: вони зберігаються під раковиною.' }, accepted: ['The cloths are kept under the sink.'] },
    { id: 'l28c5-10', type: 'dialogue', grammarPoint: 'l28c5_by', partnerLine: 'I enjoyed the soundtrack.', situation: { ru: 'Похвастайся: музыку к фильму записал твой брат.', uk: 'Похвалися: музику до фільму записав твій брат.' }, accepted: ['The music was recorded by my brother.'] },
    { id: 'l28c5-11', type: 'dialogue', grammarPoint: 'l28c5_rules', partnerLine: 'How much does it cost to print this?', situation: { ru: 'Ты работник фотосалона. Скажи, что фото можно будет забрать в пятницу.', uk: 'Ти працівник фотосалону. Скажи, що фото можна буде забрати в п’ятницю.' }, accepted: ['The photos can be collected on Friday.'] },
    { id: 'l28c5-12', type: 'dialogue', grammarPoint: 'l28c5_rules', partnerLine: 'Can I try this jumper on?', situation: { ru: 'Конечно. И предупреди: этот свитер стирают только вручную.', uk: 'Звісно. І попередь: цей светр перуть тільки вручну.' }, accepted: ['This jumper must be washed by hand.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c5-13', type: 'fix', grammarPoint: 'l28c5_by', wrong: 'The book was written from my friend.', accepted: ['The book was written by my friend.'] },
    { id: 'l28c5-14', type: 'fix', grammarPoint: 'l28c5_by', wrong: 'The pictures was drawn by her.', accepted: ['The pictures were drawn by her.'] },
    { id: 'l28c5-15', type: 'fix', grammarPoint: 'l28c5_will_be', wrong: 'The concert will recorded tonight.', accepted: ['The concert will be recorded tonight.'] },
    { id: 'l28c5-16', type: 'fix', grammarPoint: 'l28c5_will_be', wrong: 'The windows will be clean tomorrow.', accepted: ['The windows will be cleaned tomorrow.'] },
  ],
};
