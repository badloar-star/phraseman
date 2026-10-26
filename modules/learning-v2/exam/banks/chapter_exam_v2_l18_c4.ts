// chapter_exam_v2_l18_c4.ts — банк экзамена v2: урок 18, глава 4 (эпизоды 25–32). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 4 — «too big» (слишком) и «light enough» (достаточно), плюс планы «We are going to choose …» и «We are flying … tomorrow» на тех же словах. Только слова и формы эпизодов 1–32 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C4: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l18c4_too', label: { ru: 'слишком: too big / too low / too high', uk: 'занадто: too big / too low / too high' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l18c4_enough', label: { ru: 'достаточно: light enough / wide enough', uk: 'достатньо: light enough / wide enough' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l18c4_plans', label: { ru: 'планы: We are going to … / We are …ing tomorrow', uk: 'плани: We are going to … / We are …ing tomorrow' }, episodeOrdinals: [29, 30, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c4-01', type: 'situation', grammarPoint: 'l18c4_too', situation: { ru: 'Твоя ручная кладь не лезет — она слишком большая. Скажи об этом.', uk: 'Твій ручний багаж не влазить — він завеликий. Скажи про це.' }, accepted: ['This cabin bag is too big.'] },
    { id: 'l18c4-02', type: 'situation', grammarPoint: 'l18c4_too', situation: { ru: 'Стена в саду слишком низкая, через неё всё видно. Скажи об этом.', uk: 'Стіна в саду занизька, через неї все видно. Скажи про це.' }, accepted: ['This garden wall is too low.'] },
    { id: 'l18c4-03', type: 'situation', grammarPoint: 'l18c4_enough', situation: { ru: 'Сданный в багаж чемодан достаточно лёгкий. Скажи об этом.', uk: 'Зданий у багаж чемодан достатньо легкий. Скажи про це.' }, accepted: ['This checked bag is light enough.'] },
    { id: 'l18c4-04', type: 'situation', grammarPoint: 'l18c4_enough', situation: { ru: 'Боковая калитка достаточно высокая. Скажи об этом.', uk: 'Бічна хвіртка достатньо висока. Скажи про це.' }, accepted: ['This side gate is high enough.'] },
    { id: 'l18c4-05', type: 'situation', grammarPoint: 'l18c4_plans', situation: { ru: 'Вы решили выбрать место в середине ряда. Скажи, что собираетесь выбрать среднее место.', uk: 'Ви вирішили обрати місце посеред ряду. Скажи, що збираєтесь обрати середнє місце.' }, accepted: ['We are going to choose a middle seat.'] },
    { id: 'l18c4-06', type: 'situation', grammarPoint: 'l18c4_plans', situation: { ru: 'Завтра в семь вы летите — уже договорились. Скажи об этом.', uk: 'Завтра о сьомій ви летите — уже домовилися. Скажи про це.' }, accepted: ['We are flying at seven tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c4-07', type: 'dialogue', grammarPoint: 'l18c4_too', partnerLine: 'The monthly rent is too high.', situation: { ru: 'Друг говорит, что аренда в месяц слишком высокая. Скажи, что расходы на переезд тоже слишком высокие.', uk: 'Друг каже, що оренда на місяць занадто висока. Скажи, що витрати на переїзд теж занадто високі.' }, accepted: ['The moving costs are too high.'] },
    { id: 'l18c4-08', type: 'dialogue', grammarPoint: 'l18c4_too', partnerLine: 'This waist size is too small.', situation: { ru: 'Друг говорит, что размер в талии слишком мал. Скажи, что длина штанины слишком короткая.', uk: 'Друг каже, що розмір у талії замалий. Скажи, що довжина штанини закоротка.' }, accepted: ['This leg length is too short.'] },
    { id: 'l18c4-09', type: 'dialogue', grammarPoint: 'l18c4_enough', partnerLine: 'This passport photo is too old.', situation: { ru: 'Друг говорит, что фото на паспорт слишком старое. Скажи, что среднее кресло достаточно широкое.', uk: 'Друг каже, що фото на паспорт задавнє. Скажи, що середнє крісло достатньо широке.' }, accepted: ['This middle seat is wide enough.'] },
    { id: 'l18c4-10', type: 'dialogue', grammarPoint: 'l18c4_enough', partnerLine: 'This house price is low enough.', situation: { ru: 'Друг говорит, что цена дома достаточно низкая. Скажи, что залог за аренду тоже достаточно низкий.', uk: 'Друг каже, що ціна будинку достатньо низька. Скажи, що застава за оренду теж достатньо низька.' }, accepted: ['The rental deposit is low enough.'] },
    { id: 'l18c4-11', type: 'dialogue', grammarPoint: 'l18c4_plans', partnerLine: 'This garden wall is as high as ours.', situation: { ru: 'Друг говорит, что эта стена такая же высокая, как ваша. Скажи, что завтра вы встречаетесь у двери гаража — договорились.', uk: 'Друг каже, що ця стіна така ж висока, як ваша. Скажи, що завтра ви зустрічаєтесь біля дверей гаража — домовилися.' }, accepted: ['We are meeting by the garage door tomorrow.'] },
    { id: 'l18c4-12', type: 'dialogue', grammarPoint: 'l18c4_plans', partnerLine: 'This booster seat is as light as ours.', situation: { ru: 'Друг говорит, что это детское кресло такое же лёгкое, как ваше. Скажи, что вы собираетесь купить чехол на сиденье.', uk: 'Друг каже, що це дитяче крісло таке ж легке, як ваше. Скажи, що ви збираєтесь купити чохол на сидіння.' }, accepted: ['We are going to buy a seat cover.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c4-13', type: 'fix', grammarPoint: 'l18c4_too', wrong: 'This spare part is too shorter.', accepted: ['This spare part is too short.'] },
    { id: 'l18c4-14', type: 'fix', grammarPoint: 'l18c4_enough', wrong: 'This serving bowl is enough large.', accepted: ['This serving bowl is large enough.'] },
    { id: 'l18c4-15', type: 'fix', grammarPoint: 'l18c4_enough', wrong: 'This booster seat is enough light.', accepted: ['This booster seat is light enough.'] },
    { id: 'l18c4-16', type: 'fix', grammarPoint: 'l18c4_plans', wrong: 'We are going check the moving costs.', accepted: ['We are going to check the moving costs.'] },
  ],
};
