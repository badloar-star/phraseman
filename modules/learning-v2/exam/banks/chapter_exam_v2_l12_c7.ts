// chapter_exam_v2_l12_c7.ts — банк экзамена v2: урок 12, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–56 урока 12
// (повторение прошедшего времени: found, ironed, packed, used, counted, added, filled, moved, washed; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C7: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l12c7_found', label: { ru: 'нашёл, погладил — found, ironed', uk: 'знайшов, попрасував — found, ironed' }, episodeOrdinals: [50, 52, 56] },
    { id: 'l12c7_packed', label: { ru: 'собрал, взял, пересчитал — packed, used, counted', uk: 'зібрав, узяв, перерахував — packed, used, counted' }, episodeOrdinals: [49, 53, 56] },
    { id: 'l12c7_added', label: { ru: 'добавил, наполнил, передвинул — added, filled, moved', uk: 'додав, наповнив, пересунув — added, filled, moved' }, episodeOrdinals: [51, 54] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c7-01', type: 'situation', grammarPoint: 'l12c7_found', situation: { ru: 'Ты искал чистое полотенце и нашёл новое, неиспользованное. Скажи об этом.', uk: 'Ти шукав чистий рушник і знайшов новий, невикористаний. Скажи про це.' }, accepted: ['I found an unused towel.'] },
    { id: 'l12c7-02', type: 'situation', grammarPoint: 'l12c7_packed', situation: { ru: 'Друг спрашивает, готов ли ты к походу. Скажи, что уже упаковал спальный мешок.', uk: 'Друг питає, чи готовий ти до походу. Скажи, що вже спакував спальник.' }, accepted: ['I packed my sleeping bag.'] },
    { id: 'l12c7-03', type: 'situation', grammarPoint: 'l12c7_added', situation: { ru: 'Напиток был тёплый. Скажи, что ты добавил кубик льда.', uk: 'Напій був теплий. Скажи, що ти додав кубик льоду.' }, accepted: ['I added an ice cube.'] },
    { id: 'l12c7-04', type: 'situation', grammarPoint: 'l12c7_found', situation: { ru: 'Подруга потеряла заколку, а ты нашёл одну в сумке. Скажи ей.', uk: 'Подруга загубила заколку, а ти знайшов одну в сумці. Скажи їй.' }, accepted: ['I found a hair clip.'] },
    { id: 'l12c7-05', type: 'situation', grammarPoint: 'l12c7_packed', situation: { ru: 'Расскажи, что в магазин ты ходил с многоразовой сумкой.', uk: 'Розкажи, що до магазину ти ходив із багаторазовою сумкою.' }, accepted: ['I used a reusable bag.'] },
    { id: 'l12c7-06', type: 'situation', grammarPoint: 'l12c7_added', situation: { ru: 'Кресло-качалка мешало проходу. Скажи, что ты передвинул его.', uk: 'Крісло-гойдалка заважало проходу. Скажи, що ти пересунув його.' }, accepted: ['I moved the rocking chair.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c7-07', type: 'dialogue', grammarPoint: 'l12c7_found', partnerLine: 'The shirt was creased.', situation: { ru: 'Скажи, что ты её погладил.', uk: 'Скажи, що ти її попрасував.' }, accepted: ['I ironed the creased shirt.', 'I ironed the shirt.'] },
    { id: 'l12c7-08', type: 'dialogue', grammarPoint: 'l12c7_packed', partnerLine: 'The tent was in the car.', situation: { ru: 'Скажи, что ты пересчитал колышки для палатки.', uk: 'Скажи, що ти перерахував кілочки для намету.' }, accepted: ['I counted the tent pegs.'] },
    { id: 'l12c7-09', type: 'dialogue', grammarPoint: 'l12c7_added', partnerLine: 'The food container was empty.', situation: { ru: 'Скажи, что ты его помыл.', uk: 'Скажи, що ти його помив.' }, accepted: ['I washed the food container.'] },
    { id: 'l12c7-10', type: 'dialogue', grammarPoint: 'l12c7_found', partnerLine: 'She found her keys yesterday.', situation: { ru: 'Скажи, что ты нашёл резинку для волос.', uk: 'Скажи, що ти знайшов гумку для волосся.' }, accepted: ['I found a hair tie.'] },
    { id: 'l12c7-11', type: 'dialogue', grammarPoint: 'l12c7_added', partnerLine: 'The footstool was by the sofa.', situation: { ru: 'Скажи, что ты передвинул подставку для ног.', uk: 'Скажи, що ти пересунув підставку для ніг.' }, accepted: ['I moved the footstool.'] },
    { id: 'l12c7-12', type: 'dialogue', grammarPoint: 'l12c7_packed', partnerLine: 'We packed our bags yesterday.', situation: { ru: 'Скажи, что ты положил шапочку для душа.', uk: 'Скажи, що ти поклав шапочку для душу.' }, accepted: ['I packed my shower cap.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c7-13', type: 'fix', grammarPoint: 'l12c7_found', wrong: 'I find a paper clip yesterday.', accepted: ['I found a paper clip yesterday.'] },
    { id: 'l12c7-14', type: 'fix', grammarPoint: 'l12c7_packed', wrong: 'I pack my sleeping bag yesterday.', accepted: ['I packed my sleeping bag yesterday.'] },
    { id: 'l12c7-15', type: 'fix', grammarPoint: 'l12c7_added', wrong: 'I fill the ice tray yesterday.', accepted: ['I filled the ice tray yesterday.'] },
    { id: 'l12c7-16', type: 'fix', grammarPoint: 'l12c7_found', wrong: 'The towel were clean.', accepted: ['The towel was clean.'] },
  ],
};
