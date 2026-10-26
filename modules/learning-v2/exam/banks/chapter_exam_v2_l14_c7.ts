// chapter_exam_v2_l14_c7.ts — банк экзамена v2: урок 14, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–56 урока 14
// (повторение рассказа о прошлом: while + was / were + -ing; when I arrived; when you called); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C7: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l14c7_while', label: { ru: 'пока — while + was / were …ing', uk: 'поки — while + was / were …ing' }, episodeOrdinals: [49, 50, 54] },
    { id: 'l14c7_arrived', label: { ru: 'когда я пришёл — when I arrived', uk: 'коли я прийшов — when I arrived' }, episodeOrdinals: [50, 51, 53] },
    { id: 'l14c7_called', label: { ru: 'когда ты позвонил — when you called', uk: 'коли ти зателефонував — when you called' }, episodeOrdinals: [52, 55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c7-01', type: 'situation', grammarPoint: 'l14c7_while', situation: { ru: 'Друг читал, а ты в это время готовил лосося. Расскажи ему.', uk: 'Друг читав, а ти в цей час готував лосося. Розкажи йому.' }, accepted: ['I was cooking salmon while you were reading.'] },
    { id: 'l14c7-02', type: 'situation', grammarPoint: 'l14c7_arrived', situation: { ru: 'Ты пришёл к друзьям, а они готовили треску. Расскажи.', uk: 'Ти прийшов до друзів, а вони готували тріску. Розкажи.' }, accepted: ['They were cooking cod when I arrived.'] },
    { id: 'l14c7-03', type: 'situation', grammarPoint: 'l14c7_called', situation: { ru: 'Друг звонил, а вы готовили краба. Объясни ему.', uk: 'Друг телефонував, а ви готували краба. Поясни йому.' }, accepted: ['We were cooking a crab when you called.'] },
    { id: 'l14c7-04', type: 'situation', grammarPoint: 'l14c7_while', situation: { ru: 'Друг готовил, а ты рядом резал сельдерей. Расскажи ему.', uk: 'Друг готував, а ти поруч різав селеру. Розкажи йому.' }, accepted: ['I was cutting celery while you were cooking.'] },
    { id: 'l14c7-05', type: 'situation', grammarPoint: 'l14c7_arrived', situation: { ru: 'Ты пришёл к друзьям, а они выбирали ткань. Расскажи.', uk: 'Ти прийшов до друзів, а вони вибирали тканину. Розкажи.' }, accepted: ['They were choosing fabric when I arrived.'] },
    { id: 'l14c7-06', type: 'situation', grammarPoint: 'l14c7_called', situation: { ru: 'Друг звонил, а вы делали хумус. Объясни ему.', uk: 'Друг телефонував, а ви робили хумус. Поясни йому.' }, accepted: ['We were making hummus when you called.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c7-07', type: 'dialogue', grammarPoint: 'l14c7_while', partnerLine: 'They were preparing dinner when I arrived.', situation: { ru: 'Скажи, что она готовила рагу, пока ты читал.', uk: 'Скажи, що вона готувала рагу, поки ти читав.' }, accepted: ['She was making a stew while I was reading.'] },
    { id: 'l14c7-08', type: 'dialogue', grammarPoint: 'l14c7_arrived', partnerLine: 'I was making lunch while she was reading.', situation: { ru: 'Скажи, что они мыли брокколи, когда ты пришёл.', uk: 'Скажи, що вони мили броколі, коли ти прийшов.' }, accepted: ['They were washing broccoli when I arrived.'] },
    { id: 'l14c7-09', type: 'dialogue', grammarPoint: 'l14c7_called', partnerLine: 'I was cooking while she was reading.', situation: { ru: 'Скажи другу, что вы готовили сардины, когда он позвонил.', uk: 'Скажи другові, що ви готували сардини, коли він зателефонував.' }, accepted: ['We were cooking sardines when you called.'] },
    { id: 'l14c7-10', type: 'dialogue', grammarPoint: 'l14c7_while', partnerLine: 'They were choosing colours when I arrived.', situation: { ru: 'Скажи, что ты красил, пока она рисовала.', uk: 'Скажи, що ти фарбував, поки вона малювала.' }, accepted: ['I was painting while she was drawing.'] },
    { id: 'l14c7-11', type: 'dialogue', grammarPoint: 'l14c7_arrived', partnerLine: 'I was making a snack while she was cooking.', situation: { ru: 'Скажи, что они делали буррито, когда ты пришёл.', uk: 'Скажи, що вони робили бурито, коли ти прийшов.' }, accepted: ['They were making a burrito when I arrived.'] },
    { id: 'l14c7-12', type: 'dialogue', grammarPoint: 'l14c7_called', partnerLine: 'She was cutting cheddar while I was talking.', situation: { ru: 'Скажи другу, что вы добавляли пармезан, когда он позвонил.', uk: 'Скажи другові, що ви додавали пармезан, коли він зателефонував.' }, accepted: ['We were adding parmesan when you called.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c7-13', type: 'fix', grammarPoint: 'l14c7_while', wrong: 'I was cooking salmon while you reading.', accepted: ['I was cooking salmon while you were reading.'] },
    { id: 'l14c7-14', type: 'fix', grammarPoint: 'l14c7_arrived', wrong: 'They was cutting mozzarella when I arrived.', accepted: ['They were cutting mozzarella when I arrived.'] },
    { id: 'l14c7-15', type: 'fix', grammarPoint: 'l14c7_called', wrong: 'We were cut polyester when you called.', accepted: ['We were cutting polyester when you called.'] },
    { id: 'l14c7-16', type: 'fix', grammarPoint: 'l14c7_while', wrong: 'She were heating broth while I was talking.', accepted: ['She was heating broth while I was talking.'] },
  ],
};
