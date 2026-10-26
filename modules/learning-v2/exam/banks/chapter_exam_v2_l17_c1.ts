// chapter_exam_v2_l17_c1.ts — банк экзамена v2: урок 17, глава 1 (эпизоды 1–8). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 1 — предметы можно считать и нельзя: «a / an» с одним предметом, «two …s» с несколькими, «this … is / we need …» с веществами и понятиями без числа. Только слова и формы эпизодов 1–8 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C1: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l17c1_a_an', label: { ru: 'один предмет: This is a / an …', uk: 'один предмет: This is a / an …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'l17c1_plural', label: { ru: 'несколько предметов: There are two …s …', uk: 'кілька предметів: There are two …s …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'l17c1_noncount', label: { ru: 'без числа и без «a»: This … is … / We need …', uk: 'без числа й без «a»: This … is … / We need …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c1-01', type: 'situation', grammarPoint: 'l17c1_a_an', situation: { ru: 'Ты показываешь на упор для книг на полке. Скажи, что это упор для книг.', uk: 'Ти показуєш на утримувач для книжок на полиці. Скажи, що це утримувач для книжок.' }, accepted: ['This is a bookend.'] },
    { id: 'l17c1-02', type: 'situation', grammarPoint: 'l17c1_a_an', situation: { ru: 'Ты показываешь на стиральную машину. Скажи, что это бытовой прибор.', uk: 'Ти показуєш на пральну машину. Скажи, що це побутовий прилад.' }, accepted: ['This is an appliance.'] },
    { id: 'l17c1-03', type: 'situation', grammarPoint: 'l17c1_plural', situation: { ru: 'На полке лежат две автобиографии. Скажи об этом.', uk: 'На полиці лежать дві автобіографії. Скажи про це.' }, accepted: ['There are two autobiographies on the shelf.'] },
    { id: 'l17c1-04', type: 'situation', grammarPoint: 'l17c1_plural', situation: { ru: 'На земле лежат два окурка. Скажи об этом.', uk: 'На землі лежать два недопалки. Скажи про це.' }, accepted: ['There are two cigarette ends on the ground.'] },
    { id: 'l17c1-05', type: 'situation', grammarPoint: 'l17c1_noncount', situation: { ru: 'Посуда в шкафу совсем новая. Скажи, что эта посуда новая.', uk: 'Посуд у шафі зовсім новий. Скажи, що цей посуд новий.' }, accepted: ['This crockery is new.'] },
    { id: 'l17c1-06', type: 'situation', grammarPoint: 'l17c1_noncount', situation: { ru: 'В доме нет постельного белья. Скажи, что вам оно нужно.', uk: 'У домі немає постільної білизни. Скажи, що вам воно потрібне.' }, accepted: ['We need bedding.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c1-07', type: 'dialogue', grammarPoint: 'l17c1_a_an', partnerLine: 'This is a shallot.', situation: { ru: 'Друг показывает на лук-шалот. Скажи, что у тебя в руках биография.', uk: 'Друг показує на цибулю-шалот. Скажи, що це біографія.' }, accepted: ['This is a biography.'] },
    { id: 'l17c1-08', type: 'dialogue', grammarPoint: 'l17c1_a_an', partnerLine: 'This is a wrapper.', situation: { ru: 'Друг показывает на обёртку. Скажи, что это поручение.', uk: 'Друг показує на обгортку. Скажи, що це доручення.' }, accepted: ['This is an errand.'] },
    { id: 'l17c1-09', type: 'dialogue', grammarPoint: 'l17c1_plural', partnerLine: 'This is a planter.', situation: { ru: 'Друг показывает на кашпо. Скажи, что у двери стоят два кашпо.', uk: 'Друг показує на кашпо. Скажи, що біля дверей стоять два кашпо.' }, accepted: ['There are two planters by the door.'] },
    { id: 'l17c1-10', type: 'dialogue', grammarPoint: 'l17c1_plural', partnerLine: 'This is a replacement.', situation: { ru: 'Друг показывает на запасную деталь. Скажи, что в магазине лежат две такие детали.', uk: 'Друг показує на запасну деталь. Скажи, що в магазині лежать дві такі деталі.' }, accepted: ['There are two replacements in the shop.'] },
    { id: 'l17c1-11', type: 'dialogue', grammarPoint: 'l17c1_noncount', partnerLine: 'This litter is dangerous.', situation: { ru: 'Друг говорит, что мусор опасен. Скажи, что вы убираете хлам.', uk: 'Друг каже, що сміття небезпечне. Скажи, що ви прибираєте мотлох.' }, accepted: ['We are clearing clutter.'] },
    { id: 'l17c1-12', type: 'dialogue', grammarPoint: 'l17c1_noncount', partnerLine: 'This paperwork is important.', situation: { ru: 'Друг говорит, что бумаги важны. Скажи, что вам нужно обучение.', uk: 'Друг каже, що папери важливі. Скажи, що вам потрібне навчання.' }, accepted: ['We need training.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c1-13', type: 'fix', grammarPoint: 'l17c1_a_an', wrong: 'This is a appliance.', accepted: ['This is an appliance.'] },
    { id: 'l17c1-14', type: 'fix', grammarPoint: 'l17c1_plural', wrong: 'There are two ottoman in the room.', accepted: ['There are two ottomans in the room.'] },
    { id: 'l17c1-15', type: 'fix', grammarPoint: 'l17c1_noncount', wrong: 'This crockery are new.', accepted: ['This crockery is new.'] },
    { id: 'l17c1-16', type: 'fix', grammarPoint: 'l17c1_noncount', wrong: 'We need a bedding.', accepted: ['We need bedding.'] },
  ],
};
