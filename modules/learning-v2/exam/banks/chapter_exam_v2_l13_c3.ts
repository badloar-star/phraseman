// chapter_exam_v2_l13_c3.ts — банк экзамена v2: урок 13, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–24 урока 13
// (после didn’t глагол без -ed (clean up, trip over), как — carefully, gently, calmly; вежливые фразы); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C3: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l13c3_phrasal', label: { ru: 'не сделал — didn’t clean up, trip over', uk: 'не зробив — didn’t clean up, trip over' }, episodeOrdinals: [18, 19, 20] },
    { id: 'l13c3_how', label: { ru: 'как — carefully, gently, calmly', uk: 'як — carefully, gently, calmly' }, episodeOrdinals: [21, 23, 24] },
    { id: 'l13c3_polite', label: { ru: 'вежливо — Please, Sorry, Thank you', uk: 'ввічливо — Please, Sorry, Thank you' }, episodeOrdinals: [22] },
    { id: 'l13c3_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [17, 21, 23] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c3-01', type: 'situation', grammarPoint: 'l13c3_phrasal', situation: { ru: 'Мама видит грязную кухню. Признайся, что ты её не убрал.', uk: 'Мама бачить брудну кухню. Зізнайся, що ти її не прибрав.' }, accepted: ['I didn’t clean up the kitchen.', 'I did not clean up the kitchen.'] },
    { id: 'l13c3-02', type: 'situation', grammarPoint: 'l13c3_how', situation: { ru: 'Друг волнуется за вашу поездку. Скажи, что вы не ехали быстро.', uk: 'Друг хвилюється за вашу поїздку. Скажи, що ви не їхали швидко.' }, accepted: ['We didn’t drive fast.', 'We did not drive fast.'] },
    { id: 'l13c3-03', type: 'situation', grammarPoint: 'l13c3_polite', situation: { ru: 'Собеседник говорит очень быстро. Попроси говорить медленнее.', uk: 'Співрозмовник говорить дуже швидко. Попроси говорити повільніше.' }, accepted: ['Please speak more slowly.'] },
    { id: 'l13c3-04', type: 'situation', grammarPoint: 'l13c3_phrasal', situation: { ru: 'Друг испугался, что ты упал. Скажи, что ты не споткнулся о сумку.', uk: 'Друг злякався, що ти впав. Скажи, що ти не перечепився через сумку.' }, accepted: ['I didn’t trip over the bag.', 'I did not trip over the bag.'] },
    { id: 'l13c3-05', type: 'situation', grammarPoint: 'l13c3_ask', situation: { ru: 'Друг вернулся из поездки. Спроси, доехал ли он без происшествий.', uk: 'Друг повернувся з поїздки. Запитай, чи доїхав він без пригод.' }, accepted: ['Did you arrive safely?'] },
    { id: 'l13c3-06', type: 'situation', grammarPoint: 'l13c3_polite', situation: { ru: 'Друг помог тебе с переездом. Поблагодари его.', uk: 'Друг допоміг тобі з переїздом. Подякуй йому.' }, accepted: ['Thank you for your help.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c3-07', type: 'dialogue', grammarPoint: 'l13c3_phrasal', partnerLine: 'He didn’t wash up yesterday.', situation: { ru: 'Скажи, что ты тоже не помыл посуду после ужина.', uk: 'Скажи, що ти теж не помив посуд після вечері.' }, accepted: ['I didn’t wash up after dinner.', 'I did not wash up after dinner.'] },
    { id: 'l13c3-08', type: 'dialogue', grammarPoint: 'l13c3_how', partnerLine: 'We didn’t open the window.', situation: { ru: 'Скажи, что ты закрыл дверь мягко, без хлопка.', uk: 'Скажи, що ти зачинив двері м’яко, без грюкоту.' }, accepted: ['I closed the door gently.'] },
    { id: 'l13c3-09', type: 'dialogue', grammarPoint: 'l13c3_polite', partnerLine: 'Please take a seat.', situation: { ru: 'Ты говорил резко. Извинись за свой тон.', uk: 'Ти говорив різко. Перепроси за свій тон.' }, accepted: ['Sorry about my tone.'] },
    { id: 'l13c3-10', type: 'dialogue', grammarPoint: 'l13c3_ask', partnerLine: 'I didn’t put back the book.', situation: { ru: 'Спроси, поставил ли книгу на место он.', uk: 'Запитай, чи поставив книжку на місце він.' }, accepted: ['Did he put back the book?'] },
    { id: 'l13c3-11', type: 'dialogue', grammarPoint: 'l13c3_how', partnerLine: 'Did you speak loudly?', situation: { ru: 'Ответь, что ты не говорил громко.', uk: 'Відповідай, що ти не говорив голосно.' }, accepted: ['I didn’t speak loudly.', 'I did not speak loudly.'] },
    { id: 'l13c3-12', type: 'dialogue', grammarPoint: 'l13c3_how', partnerLine: 'We waited patiently by the door.', situation: { ru: 'Скажи, что дети радостно махали.', uk: 'Скажи, що діти радісно махали.' }, accepted: ['The children waved happily.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c3-13', type: 'fix', grammarPoint: 'l13c3_phrasal', wrong: 'I didn’t tidied up my room.', accepted: ['I didn’t tidy up my room.', 'I did not tidy up my room.'] },
    { id: 'l13c3-14', type: 'fix', grammarPoint: 'l13c3_how', wrong: 'She didn’t drove carefully yesterday.', accepted: ['She didn’t drive carefully yesterday.', 'She did not drive carefully yesterday.'] },
    { id: 'l13c3-15', type: 'fix', grammarPoint: 'l13c3_polite', wrong: 'Thank for your help.', accepted: ['Thank you for your help.'] },
    { id: 'l13c3-16', type: 'fix', grammarPoint: 'l13c3_ask', wrong: 'Did you tidied up your room?', accepted: ['Did you tidy up your room?'] },
  ],
};
