// chapter_exam_v2_l14_c6.ts — банк экзамена v2: урок 14, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–48 урока 14
// (рассказ о прошлом: while + was / were + -ing; when I arrived; when you called); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C6: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l14c6_while', label: { ru: 'пока — while + was / were …ing', uk: 'поки — while + was / were …ing' }, episodeOrdinals: [42, 44, 47] },
    { id: 'l14c6_arrived', label: { ru: 'когда я пришёл — when I arrived', uk: 'коли я прийшов — when I arrived' }, episodeOrdinals: [41, 45, 46] },
    { id: 'l14c6_called', label: { ru: 'когда ты позвонил — when you called', uk: 'коли ти зателефонував — when you called' }, episodeOrdinals: [43, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c6-01', type: 'situation', grammarPoint: 'l14c6_while', situation: { ru: 'Друг читал, а ты рядом рисовал крота. Расскажи ему.', uk: 'Друг читав, а ти поруч малював кріта. Розкажи йому.' }, accepted: ['I was drawing a mole while you were reading.'] },
    { id: 'l14c6-02', type: 'situation', grammarPoint: 'l14c6_arrived', situation: { ru: 'Ты пришёл к друзьям, а они бросали игральные кубики. Расскажи.', uk: 'Ти прийшов до друзів, а вони кидали гральні кубики. Розкажи.' }, accepted: ['They were rolling the dice when I arrived.'] },
    { id: 'l14c6-03', type: 'situation', grammarPoint: 'l14c6_called', situation: { ru: 'Друг звонил вам, а вы играли в настольный теннис. Объясни ему.', uk: 'Друг телефонував вам, а ви грали в настільний теніс. Поясни йому.' }, accepted: ['We were playing table tennis when you called.'] },
    { id: 'l14c6-04', type: 'situation', grammarPoint: 'l14c6_while', situation: { ru: 'Друг готовил, а ты в это время давил чеснок прессом. Расскажи ему.', uk: 'Друг готував, а ти в цей час чавив часник пресом. Розкажи йому.' }, accepted: ['I was using a garlic press while you were cooking.'] },
    { id: 'l14c6-05', type: 'situation', grammarPoint: 'l14c6_arrived', situation: { ru: 'Ты пришёл к друзьям, а они делали украшения. Расскажи.', uk: 'Ти прийшов до друзів, а вони робили прикраси. Розкажи.' }, accepted: ['They were making decorations when I arrived.'] },
    { id: 'l14c6-06', type: 'situation', grammarPoint: 'l14c6_called', situation: { ru: 'Друг звонил, а вы искали вязальные спицы. Объясни ему.', uk: 'Друг телефонував, а ви шукали в’язальні спиці. Поясни йому.' }, accepted: ['We were looking for the knitting needles when you called.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c6-07', type: 'dialogue', grammarPoint: 'l14c6_while', partnerLine: 'She was playing draughts while I was reading.', situation: { ru: 'Скажи другу, что ты чистил шахматную доску, пока он читал.', uk: 'Скажи другові, що ти чистив шахову дошку, поки він читав.' }, accepted: ['I was cleaning the chessboard while you were reading.'] },
    { id: 'l14c6-08', type: 'dialogue', grammarPoint: 'l14c6_arrived', partnerLine: 'I was drawing while she was reading.', situation: { ru: 'Скажи, что они шили сумку, когда ты пришёл.', uk: 'Скажи, що вони шили сумку, коли ти прийшов.' }, accepted: ['They were making a bag when I arrived.'] },
    { id: 'l14c6-09', type: 'dialogue', grammarPoint: 'l14c6_called', partnerLine: 'They were using a hole punch when I arrived.', situation: { ru: 'Скажи другу, что вы клеили малярную ленту, когда он позвонил.', uk: 'Скажи другові, що ви клеїли малярну стрічку, коли він зателефонував.' }, accepted: ['We were using masking tape when you called.'] },
    { id: 'l14c6-10', type: 'dialogue', grammarPoint: 'l14c6_while', partnerLine: 'They were making dinner when I arrived.', situation: { ru: 'Скажи, что ты мыл посуду, пока она готовила.', uk: 'Скажи, що ти мив посуд, поки вона готувала.' }, accepted: ['I was washing the dishes while she was cooking.'] },
    { id: 'l14c6-11', type: 'dialogue', grammarPoint: 'l14c6_arrived', partnerLine: 'I was playing while she was reading.', situation: { ru: 'Скажи, что они веселились, когда ты пришёл.', uk: 'Скажи, що вони веселилися, коли ти прийшов.' }, accepted: ['They were having fun when I arrived.'] },
    { id: 'l14c6-12', type: 'dialogue', grammarPoint: 'l14c6_called', partnerLine: 'She was drawing a frog while I was talking.', situation: { ru: 'Скажи другу, что вы наблюдали за головастиком, когда он позвонил.', uk: 'Скажи другові, що ви спостерігали за пуголовком, коли він зателефонував.' }, accepted: ['We were watching a tadpole when you called.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c6-13', type: 'fix', grammarPoint: 'l14c6_while', wrong: 'I was drawing while you was reading.', accepted: ['I was drawing while you were reading.'] },
    { id: 'l14c6-14', type: 'fix', grammarPoint: 'l14c6_arrived', wrong: 'They was rolling the dice when I arrived.', accepted: ['They were rolling the dice when I arrived.'] },
    { id: 'l14c6-15', type: 'fix', grammarPoint: 'l14c6_called', wrong: 'We were play table tennis when you called.', accepted: ['We were playing table tennis when you called.'] },
    { id: 'l14c6-16', type: 'fix', grammarPoint: 'l14c6_while', wrong: 'She were using a colander while I was cooking.', accepted: ['She was using a colander while I was cooking.'] },
  ],
};
