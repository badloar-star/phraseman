// chapter_exam_v2_l13_c1.ts — банк экзамена v2: урок 13, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–8 урока 13
// (глава 1 урока 13 — только вопросы «Did you / he / she / they …?»; «I», «we», «yes / no» ещё не встречались, поэтому ответ — о нём, о ней, о них); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C1: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l13c1_washed', label: { ru: 'помыли, убрали — washed, cleaned', uk: 'помили, прибрали — washed, cleaned' }, episodeOrdinals: [1, 2, 6] },
    { id: 'l13c1_cooked', label: { ru: 'приготовили, попробовали — cooked, tried', uk: 'приготували, спробували — cooked, tried' }, episodeOrdinals: [3, 4] },
    { id: 'l13c1_bought', label: { ru: 'купили, взяли — bought, took, picked up', uk: 'купили, взяли — bought, took, picked up' }, episodeOrdinals: [5, 7, 8] },
    { id: 'l13c1_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [1, 2, 4] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c1-01', type: 'situation', grammarPoint: 'l13c1_washed', situation: { ru: 'Мама спрашивает, помыл ли брат тарелки. Ответь, что помыл.', uk: 'Мама питає, чи помив брат тарілки. Відповідай, що помив.' }, accepted: ['He washed the plates.'] },
    { id: 'l13c1-02', type: 'situation', grammarPoint: 'l13c1_ask', situation: { ru: 'Спроси друга, приготовил ли он баклажан.', uk: 'Запитай друга, чи приготував він баклажан.' }, accepted: ['Did you cook the aubergine?'] },
    { id: 'l13c1-03', type: 'situation', grammarPoint: 'l13c1_bought', situation: { ru: 'Друг спрашивает, забрала ли соседка посылку. Ответь, что забрала.', uk: 'Друг питає, чи забрала сусідка посилку. Відповідай, що забрала.' }, accepted: ['She picked up the parcel.'] },
    { id: 'l13c1-04', type: 'situation', grammarPoint: 'l13c1_washed', situation: { ru: 'Хозяйка спрашивает, убрали ли гости кухню. Ответь, что убрали.', uk: 'Господиня питає, чи прибрали гості кухню. Відповідай, що прибрали.' }, accepted: ['They cleaned the kitchen.'] },
    { id: 'l13c1-05', type: 'situation', grammarPoint: 'l13c1_ask', situation: { ru: 'Спроси подругу, попробовала ли она инжир.', uk: 'Запитай подругу, чи скуштувала вона інжир.' }, accepted: ['Did you try a fig?'] },
    { id: 'l13c1-06', type: 'situation', grammarPoint: 'l13c1_bought', situation: { ru: 'Мама спрашивает, купил ли папа ржаной хлеб. Ответь, что купил.', uk: 'Мама питає, чи купив тато житній хліб. Відповідай, що купив.' }, accepted: ['He bought rye bread.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c1-07', type: 'dialogue', grammarPoint: 'l13c1_washed', partnerLine: 'Did he wash the dishes?', situation: { ru: 'Ответь, что помыл.', uk: 'Відповідай, що помив.' }, accepted: ['He washed the dishes.'] },
    { id: 'l13c1-08', type: 'dialogue', grammarPoint: 'l13c1_cooked', partnerLine: 'He washed the vegetables.', situation: { ru: 'Скажи, что они их приготовили.', uk: 'Скажи, що вони їх приготували.' }, accepted: ['They cooked the vegetables.'] },
    { id: 'l13c1-09', type: 'dialogue', grammarPoint: 'l13c1_bought', partnerLine: 'She tried a crumpet.', situation: { ru: 'Скажи, что он купил белый хлеб.', uk: 'Скажи, що він купив білий хліб.' }, accepted: ['He bought white bread.'] },
    { id: 'l13c1-10', type: 'dialogue', grammarPoint: 'l13c1_ask', partnerLine: 'She bought some bread.', situation: { ru: 'Спроси её, купила ли она белый хлеб.', uk: 'Запитай її, чи купила вона білий хліб.' }, accepted: ['Did you buy white bread?'] },
    { id: 'l13c1-11', type: 'dialogue', grammarPoint: 'l13c1_cooked', partnerLine: 'He bought some bread.', situation: { ru: 'Скажи, что она попробовала нектарин.', uk: 'Скажи, що вона спробувала нектарин.' }, accepted: ['She tried a nectarine.'] },
    { id: 'l13c1-12', type: 'dialogue', grammarPoint: 'l13c1_bought', partnerLine: 'They ate out.', situation: { ru: 'Скажи, что он взял обед с собой.', uk: 'Скажи, що він узяв обід із собою.' }, accepted: ['He took a packed lunch.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c1-13', type: 'fix', grammarPoint: 'l13c1_washed', wrong: 'He wash the plates yesterday.', accepted: ['He washed the plates yesterday.'] },
    { id: 'l13c1-14', type: 'fix', grammarPoint: 'l13c1_cooked', wrong: 'She cook the courgette yesterday.', accepted: ['She cooked the courgette yesterday.'] },
    { id: 'l13c1-15', type: 'fix', grammarPoint: 'l13c1_bought', wrong: 'He buy rye bread yesterday.', accepted: ['He bought rye bread yesterday.'] },
    { id: 'l13c1-16', type: 'fix', grammarPoint: 'l13c1_ask', wrong: 'Did you washed the coffee mug?', accepted: ['Did you wash the coffee mug?'] },
  ],
};
