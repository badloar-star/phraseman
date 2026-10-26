// chapter_exam_v2_l26_c5.ts — банк экзамена v2: урок 26, глава 5 (эпизоды 33–40). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–40 урока 26 — if (условие в начале или в конце), when о будущем и had … by the time. После if
// и when — настоящее. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C5: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l26c5_if', label: { ru: 'если — if the subway is closed', uk: 'якщо — if the subway is closed' }, episodeOrdinals: [33, 34, 36] },
    { id: 'l26c5_when', label: { ru: 'когда — I will ask when she comes back', uk: 'коли — I will ask when she comes back' }, episodeOrdinals: [35, 38, 40] },
    { id: 'l26c5_by_the_time', label: { ru: 'к тому моменту уже — had … by the time', uk: 'на той момент уже — had … by the time' }, episodeOrdinals: [34, 37, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c5-01', type: 'situation', grammarPoint: 'l26c5_if', situation: { ru: 'Метро сегодня может закрыться. Скажи, что вы поедете на автобусе, если метро закрыто.', uk: 'Метро сьогодні може закритися. Скажи, що ви поїдете автобусом, якщо метро закрите.' }, accepted: ['We will take a bus if the subway is closed.'] },
    { id: 'l26c5-02', type: 'situation', grammarPoint: 'l26c5_if', situation: { ru: 'Вы идёте в закусочную. Скажи, что если там нет мест, вы возьмёте еду с собой.', uk: 'Ви йдете до закусочної. Скажи, що якщо там немає місць, ви візьмете їжу з собою.' }, accepted: ['If the diner is full, we will get takeout.', 'We will get takeout if the diner is full.'] },
    { id: 'l26c5-03', type: 'situation', grammarPoint: 'l26c5_when', situation: { ru: 'Подруга вышла на минуту. Скажи, что спросишь её, когда она вернётся.', uk: 'Подруга вийшла на хвилинку. Скажи, що запитаєш її, коли вона повернеться.' }, accepted: ['I will ask when she comes back.', 'I will ask her when she comes back.'] },
    { id: 'l26c5-04', type: 'situation', grammarPoint: 'l26c5_by_the_time', situation: { ru: 'Друг пришёл, а фрукты уже нарезаны. Расскажи об этом.', uk: 'Друг прийшов, а фрукти вже нарізані. Розкажи про це.' }, accepted: ['I had cut the fruit by the time he arrived.'] },
    { id: 'l26c5-05', type: 'situation', grammarPoint: 'l26c5_when', situation: { ru: 'Друг уходит по делам. Скажи, что погуляешь с собакой, когда он вернётся домой.', uk: 'Друг іде у справах. Скажи, що вигуляєш собаку, коли він повернеться додому.' }, accepted: ['I will walk the dog when you get home.'] },
    { id: 'l26c5-06', type: 'situation', grammarPoint: 'l26c5_by_the_time', situation: { ru: 'Все пошли спать, а дверь ты уже запер. Расскажи об этом.', uk: 'Усі пішли спати, а двері ти вже замкнув. Розкажи про це.' }, accepted: ['I had locked the door by the time everyone went to bed.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c5-07', type: 'dialogue', grammarPoint: 'l26c5_if', partnerLine: 'I am busy.', situation: { ru: 'В дверь звонят. Предложи открыть, если он занят.', uk: 'У двері дзвонять. Запропонуй відчинити, якщо він зайнятий.' }, accepted: ['I can answer the door if you are busy.'] },
    { id: 'l26c5-08', type: 'dialogue', grammarPoint: 'l26c5_if', partnerLine: 'I like this pullover.', situation: { ru: 'Скажи, что купишь его, если он тёплый.', uk: 'Скажи, що купиш його, якщо він теплий.' }, accepted: ['I will buy it if the pullover is warm.', 'I will buy it if it is warm.'] },
    { id: 'l26c5-09', type: 'dialogue', grammarPoint: 'l26c5_by_the_time', partnerLine: 'The soup was cold.', situation: { ru: 'Объясни: он остыл к тому времени, как вы сели за стол.', uk: 'Поясни: він охолов на той час, як ви сіли за стіл.' }, accepted: ['The soup had cooled by the time we sat down.', 'It had cooled by the time we sat down.'] },
    { id: 'l26c5-10', type: 'dialogue', grammarPoint: 'l26c5_when', partnerLine: 'Get the bowls, please.', situation: { ru: 'Скажи, что принесёшь миски, когда он будет готов.', uk: 'Скажи, що принесеш миски, коли він буде готовий.' }, accepted: ['I will get the bowls when you are ready.'] },
    { id: 'l26c5-11', type: 'dialogue', grammarPoint: 'l26c5_by_the_time', partnerLine: 'She arrived at eight.', situation: { ru: 'Скажи, что ты застелил кровать к её приезду.', uk: 'Скажи, що ти застелив ліжко до її приїзду.' }, accepted: ['I had made the bed by the time she arrived.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c5-12', type: 'fix', grammarPoint: 'l26c5_if', wrong: 'We will take a bus if the subway will be closed.', accepted: ['We will take a bus if the subway is closed.'] },
    { id: 'l26c5-13', type: 'fix', grammarPoint: 'l26c5_when', wrong: 'I will ask when she will come back.', accepted: ['I will ask when she comes back.'] },
    { id: 'l26c5-14', type: 'fix', grammarPoint: 'l26c5_by_the_time', wrong: 'I have made the bed by the time she arrived.', accepted: ['I had made the bed by the time she arrived.'] },
    { id: 'l26c5-15', type: 'fix', grammarPoint: 'l26c5_if', wrong: 'I will buy some if they will be sweet.', accepted: ['I will buy some if they are sweet.'] },
  ],
};
