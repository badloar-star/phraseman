// chapter_exam_v2_l24_c5.ts — банк экзамена v2: урок 24, глава 5 (эпизоды 33–40). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–40 урока 24 — have / has: опыт и результат сейчас (before, already) против прошлого с
// названным временем (yesterday, last week). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C5: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l24c5_result', label: { ru: 'опыт и результат — I have saved, before', uk: 'досвід і результат — I have saved, before' }, episodeOrdinals: [33, 34, 36] },
    { id: 'l24c5_when', label: { ru: 'названо время — got yesterday', uk: 'названо час — got yesterday' }, episodeOrdinals: [33, 35, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c5-01', type: 'situation', grammarPoint: 'l24c5_result', situation: { ru: 'Друг удивляется, что ты спокойно переносишь жару. Скажи, что ты уже жил в тёплом климате раньше.', uk: 'Друг дивується, що ти спокійно переносиш спеку. Скажи, що ти вже жив у теплому кліматі раніше.' }, accepted: ['I have lived in a warm climate before.'] },
    { id: 'l24c5-02', type: 'situation', grammarPoint: 'l24c5_when', situation: { ru: 'Ты весь красный после пляжа. Скажи, что вчера обгорел.', uk: 'Ти весь червоний після пляжу. Скажи, що вчора обгорів.' }, accepted: ['I got sunburn yesterday.'] },
    { id: 'l24c5-03', type: 'situation', grammarPoint: 'l24c5_result', situation: { ru: 'Ты копишь на поездку. Похвастайся другу, что уже отложил сто фунтов.', uk: 'Ти збираєш на поїздку. Похвалися другові, що вже відклав сто фунтів.' }, accepted: ['I have saved a hundred pounds.'] },
    { id: 'l24c5-04', type: 'situation', grammarPoint: 'l24c5_when', situation: { ru: 'Коллега спрашивает, что ты делал вчера вечером. Скажи, что ходил на встречу для общения.', uk: 'Колега питає, що ти робив учора ввечері. Скажи, що ходив на зустріч для спілкування.' }, accepted: ['I went to a social event yesterday.'] },
    { id: 'l24c5-05', type: 'situation', grammarPoint: 'l24c5_result', situation: { ru: 'Ты полчаса помогал соседу искать ключ, но так и не нашёл. Скажи, что тебе не повезло.', uk: 'Ти пів години допомагав сусідові шукати ключ, але так і не знайшов. Скажи, що тобі не пощастило.' }, accepted: ['I have had no luck.', "I've had no luck."] },
    { id: 'l24c5-06', type: 'situation', grammarPoint: 'l24c5_when', situation: { ru: 'Ты пишешь человеку, с которым познакомился вчера. Напиши, что было приятно познакомиться.', uk: 'Ти пишеш людині, з якою познайомився вчора. Напиши, що було приємно познайомитися.' }, accepted: ['It was a pleasure to meet you yesterday.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c5-07', type: 'dialogue', grammarPoint: 'l24c5_result', partnerLine: 'She checked the rainfall yesterday.', situation: { ru: 'Скажи, что у вас здесь уже бывала засуха.', uk: 'Скажи, що у вас тут уже бувала посуха.' }, accepted: ['We have had a drought here before.'] },
    { id: 'l24c5-08', type: 'dialogue', grammarPoint: 'l24c5_when', partnerLine: 'I have read the official letter.', situation: { ru: 'Скажи, что ты прочитал его ещё вчера.', uk: 'Скажи, що ти прочитав його ще вчора.' }, accepted: ['I read the official letter yesterday.', 'I read it yesterday.'] },
    { id: 'l24c5-09', type: 'dialogue', grammarPoint: 'l24c5_when', partnerLine: 'They bought a dozen eggs yesterday.', situation: { ru: 'Скажи, что ты вчера купил дюжину яиц.', uk: 'Скажи, що ти вчора купив дюжину яєць.' }, accepted: ['I bought a dozen eggs yesterday.'] },
    { id: 'l24c5-10', type: 'dialogue', grammarPoint: 'l24c5_result', partnerLine: 'I have bought some wood.', situation: { ru: 'Вы собираете полку. Скажи, что вы уже выбрали стальную.', uk: 'Ви збираєте полицю. Скажи, що ви вже вибрали сталеву.' }, accepted: ['We have chosen a steel shelf.'] },
    { id: 'l24c5-11', type: 'dialogue', grammarPoint: 'l24c5_when', partnerLine: 'I have cleaned the edge of the table.', situation: { ru: 'Скажи, что ты почистил его ещё вчера.', uk: 'Скажи, що ти почистив його ще вчора.' }, accepted: ['I cleaned it yesterday.', 'I cleaned the edge of the table yesterday.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c5-12', type: 'fix', grammarPoint: 'l24c5_when', wrong: 'She has got sunburn yesterday.', accepted: ['She got sunburn yesterday.'] },
    { id: 'l24c5-13', type: 'fix', grammarPoint: 'l24c5_result', wrong: 'We has sold a million books.', accepted: ['We have sold a million books.'] },
    { id: 'l24c5-14', type: 'fix', grammarPoint: 'l24c5_when', wrong: 'They have recycled the cardboard yesterday.', accepted: ['They recycled the cardboard yesterday.'] },
    { id: 'l24c5-15', type: 'fix', grammarPoint: 'l24c5_when', wrong: 'She pay a thousand dollars yesterday.', accepted: ['She paid a thousand dollars yesterday.'] },
  ],
};
