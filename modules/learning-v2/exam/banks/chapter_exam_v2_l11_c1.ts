// chapter_exam_v2_l11_c1.ts — банк экзамена v2: урок 11, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–8 — прошлое I / he / she was, we / they were, когда ago / until / during / on Tuesday / in May; not ещё впереди; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C1: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l11c1_was', label: { ru: 'я / он был — I / he was', uk: 'я / він був — I / he was' }, episodeOrdinals: [1, 4, 6] },
    { id: 'l11c1_were', label: { ru: 'мы / они были — we / they were', uk: 'ми / вони були — we / they were' }, episodeOrdinals: [1, 6, 7] },
    { id: 'l11c1_when', label: { ru: 'когда — ago, until, during, in May', uk: 'коли — ago, until, during, in May' }, episodeOrdinals: [5, 6, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c1-01', type: 'situation', grammarPoint: 'l11c1_was', situation: { ru: 'Друг звонил вчера и не застал тебя на улице. Скажи, что вчера ты был дома.', uk: 'Друг дзвонив учора й не застав тебе на вулиці. Скажи, що вчора ти був удома.' }, accepted: ['I was at home yesterday.'] },
    { id: 'l11c1-02', type: 'situation', grammarPoint: 'l11c1_were', situation: { ru: 'Вчера вечером вы с друзьями сидели в кафе. Скажи, что вы были в кафе вчера вечером.', uk: 'Учора ввечері ви з друзями сиділи в кафе. Скажи, що ви були в кафе вчора ввечері.' }, accepted: ['We were in a cafe last night.'] },
    { id: 'l11c1-03', type: 'situation', grammarPoint: 'l11c1_when', situation: { ru: 'Начальница спрашивает, почему ты ответил поздно. Скажи, что был на работе до шести.', uk: 'Начальниця питає, чому ти відповів пізно. Скажи, що був на роботі до шостої.' }, accepted: ['I was at work until six.'] },
    { id: 'l11c1-04', type: 'situation', grammarPoint: 'l11c1_was', situation: { ru: 'Брат пропустил встречу на прошлой неделе. Объясни, что он болел на прошлой неделе.', uk: 'Брат пропустив зустріч минулого тижня. Поясни, що він хворів минулого тижня.' }, accepted: ['He was ill last week.'] },
    { id: 'l11c1-05', type: 'situation', grammarPoint: 'l11c1_were', situation: { ru: 'На Рождество вся семья собралась за одним столом. Скажи, что вы были вместе на Рождество.', uk: 'На Різдво вся родина зібралася за одним столом. Скажи, що ви були разом на Різдво.' }, accepted: ['We were together at Christmas.'] },
    { id: 'l11c1-06', type: 'situation', grammarPoint: 'l11c1_when', situation: { ru: 'Подруга заходила, пока тебя не было. Скажи, что она была здесь час назад.', uk: 'Подруга заходила, поки тебе не було. Скажи, що вона була тут годину тому.' }, accepted: ['She was here an hour ago.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c1-07', type: 'dialogue', grammarPoint: 'l11c1_was', partnerLine: 'The shop was closed on Thursday.', situation: { ru: 'Скажи, что ты в четверг был свободен.', uk: 'Скажи, що ти в четвер був вільний.' }, accepted: ['I was free on Thursday.'] },
    { id: 'l11c1-08', type: 'dialogue', grammarPoint: 'l11c1_were', partnerLine: 'I was in London last week.', situation: { ru: 'Скажи, что вы были в Париже на прошлой неделе.', uk: 'Скажи, що ви були в Парижі минулого тижня.' }, accepted: ['We were in Paris last week.'] },
    { id: 'l11c1-09', type: 'dialogue', grammarPoint: 'l11c1_when', partnerLine: 'It was warm in May.', situation: { ru: 'Скажи, что в декабре было холодно.', uk: 'Скажи, що в грудні було холодно.' }, accepted: ['It was cold in December.'] },
    { id: 'l11c1-10', type: 'dialogue', grammarPoint: 'l11c1_was', partnerLine: 'The train station was busy.', situation: { ru: 'Скажи, что торговый центр был переполнен.', uk: 'Скажи, що торговий центр був переповнений.' }, accepted: ['The shopping centre was crowded.'] },
    { id: 'l11c1-11', type: 'dialogue', grammarPoint: 'l11c1_were', partnerLine: 'The children were happy at Christmas.', situation: { ru: 'Скажи, что на Пасху они были дома.', uk: 'Скажи, що на Великдень вони були вдома.' }, accepted: ['They were at home at Easter.'] },
    { id: 'l11c1-12', type: 'dialogue', grammarPoint: 'l11c1_when', partnerLine: 'I was tired during the trip.', situation: { ru: 'Скажи, что она была тихой во время фильма.', uk: 'Скажи, що вона була тихою під час фільму.' }, accepted: ['She was quiet during the film.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c1-13', type: 'fix', grammarPoint: 'l11c1_was', wrong: 'I were at home yesterday.', accepted: ['I was at home yesterday.'] },
    { id: 'l11c1-14', type: 'fix', grammarPoint: 'l11c1_were', wrong: 'We was in a cafe last night.', accepted: ['We were in a cafe last night.'] },
    { id: 'l11c1-15', type: 'fix', grammarPoint: 'l11c1_when', wrong: 'She was here a hour ago.', accepted: ['She was here an hour ago.'] },
    { id: 'l11c1-16', type: 'fix', grammarPoint: 'l11c1_were', wrong: 'They was at home on Saturday.', accepted: ['They were at home on Saturday.'] },
  ],
};
