// chapter_exam_v2_l14_c1.ts — банк экзамена v2: урок 14, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–8 урока 14
// (урок 14 вводит длительное прошедшее: I / he / she was + -ing, we / they were + -ing, «в восемь вчера»); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C1: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l14c1_was', label: { ru: 'я, он, она делал — was + …ing', uk: 'я, він, вона робив — was + …ing' }, episodeOrdinals: [1, 2, 8] },
    { id: 'l14c1_were', label: { ru: 'мы, они делали — were + …ing', uk: 'ми, вони робили — were + …ing' }, episodeOrdinals: [3, 4, 6] },
    { id: 'l14c1_at_time', label: { ru: 'в какой-то час — at seven yesterday', uk: 'о певній годині — at seven yesterday' }, episodeOrdinals: [5, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c1-01', type: 'situation', grammarPoint: 'l14c1_was', situation: { ru: 'Друг спрашивает, почему ты вчера в восемь не отвечал. Скажи, что ты читал комикс.', uk: 'Друг питає, чому ти вчора о восьмій не відповідав. Скажи, що ти читав комікс.' }, accepted: ['I was reading a comic book.'] },
    { id: 'l14c1-02', type: 'situation', grammarPoint: 'l14c1_were', situation: { ru: 'Вчера в десять вы с мамой поливали яблоню. Расскажи об этом.', uk: 'Учора о десятій ви з мамою поливали яблуню. Розкажи про це.' }, accepted: ['We were watering the apple tree at ten yesterday.', 'We were watering the apple tree.'] },
    { id: 'l14c1-03', type: 'situation', grammarPoint: 'l14c1_at_time', situation: { ru: 'Тренер спрашивает, где ты был вчера в шесть. Скажи, что ждал в спортивном зале.', uk: 'Тренер питає, де ти був учора о шостій. Скажи, що чекав у спортивній залі.' }, accepted: ['I was waiting in the sports hall at six yesterday.', 'I was waiting in the sports hall.'] },
    { id: 'l14c1-04', type: 'situation', grammarPoint: 'l14c1_was', situation: { ru: 'Расскажи, что вчера в девять сестра искала ночник.', uk: 'Розкажи, що вчора о дев’ятій сестра шукала нічник.' }, accepted: ['She was looking for the night light at nine yesterday.', 'She was looking for the night light.'] },
    { id: 'l14c1-05', type: 'situation', grammarPoint: 'l14c1_were', situation: { ru: 'Расскажи, что вчера в полдень дети смотрели на мыльные пузыри.', uk: 'Розкажи, що вчора опівдні діти дивилися на мильні бульбашки.' }, accepted: ['The children were watching the soap bubbles at noon yesterday.', 'The children were watching the soap bubbles.'] },
    { id: 'l14c1-06', type: 'situation', grammarPoint: 'l14c1_at_time', situation: { ru: 'Тебя спрашивают, чем ты был занят вчера в семь. Скажи, что ел рыбную котлету.', uk: 'Тебе питають, чим ти був зайнятий учора о сьомій. Скажи, що їв рибну котлету.' }, accepted: ['I was eating a fishcake at seven yesterday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c1-07', type: 'dialogue', grammarPoint: 'l14c1_was', partnerLine: 'I was cooking at seven.', situation: { ru: 'Скажи, что ты в это время мыл посуду.', uk: 'Скажи, що ти в цей час мив посуд.' }, accepted: ['I was washing the dishes.'] },
    { id: 'l14c1-08', type: 'dialogue', grammarPoint: 'l14c1_were', partnerLine: 'I was reading at eight.', situation: { ru: 'Скажи, что дети в это время играли.', uk: 'Скажи, що діти в цей час гралися.' }, accepted: ['They were playing at eight.', 'They were playing.'] },
    { id: 'l14c1-09', type: 'dialogue', grammarPoint: 'l14c1_was', partnerLine: 'We were playing at five.', situation: { ru: 'Скажи, что она сидела на полу.', uk: 'Скажи, що вона сиділа на підлозі.' }, accepted: ['She was sitting on the floor.'] },
    { id: 'l14c1-10', type: 'dialogue', grammarPoint: 'l14c1_were', partnerLine: 'I was working in the garden.', situation: { ru: 'Скажи, что они поливали цветы.', uk: 'Скажи, що вони поливали квіти.' }, accepted: ['They were watering the flowers.'] },
    { id: 'l14c1-11', type: 'dialogue', grammarPoint: 'l14c1_at_time', partnerLine: 'She was cooking at four.', situation: { ru: 'Скажи, что ты вчера в четыре раскатывал тесто скалкой.', uk: 'Скажи, що ти вчора о четвертій розкачував тісто качалкою.' }, accepted: ['I was using a rolling pin at four yesterday.'] },
    { id: 'l14c1-12', type: 'dialogue', grammarPoint: 'l14c1_was', partnerLine: 'We were cleaning at noon.', situation: { ru: 'Скажи, что она мыла пол.', uk: 'Скажи, що вона мила підлогу.' }, accepted: ['She was washing the floor.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c1-13', type: 'fix', grammarPoint: 'l14c1_was', wrong: 'I were reading a comic book.', accepted: ['I was reading a comic book.'] },
    { id: 'l14c1-14', type: 'fix', grammarPoint: 'l14c1_were', wrong: 'They was playing at eight.', accepted: ['They were playing at eight.'] },
    { id: 'l14c1-15', type: 'fix', grammarPoint: 'l14c1_at_time', wrong: 'I was cook at seven yesterday.', accepted: ['I was cooking at seven yesterday.'] },
    { id: 'l14c1-16', type: 'fix', grammarPoint: 'l14c1_were', wrong: 'We was watering the apple tree.', accepted: ['We were watering the apple tree.'] },
  ],
};
