// chapter_exam_v2_l10_c3.ts — банк экзамена v2: урок 10, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–24 — как часто и только once / twice / only, вежливость I want to apologise / Thank you for, доверяю и узнаю I trust / I recognize, деньги earn / cannot afford / do not waste; вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C3: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l10c3_often', label: { ru: 'как часто и только — once, twice, only', uk: 'як часто й лише — once, twice, only' }, episodeOrdinals: [17] },
    { id: 'l10c3_thank', label: { ru: 'вежливо — I want to apologise, Thank you for …', uk: 'ввічливо — I want to apologise, Thank you for …' }, episodeOrdinals: [19] },
    { id: 'l10c3_trust', label: { ru: 'доверяю и узнаю — I trust, I recognize', uk: 'довіряю й упізнаю — I trust, I recognize' }, episodeOrdinals: [22, 23] },
    { id: 'l10c3_money', label: { ru: 'деньги — earn, cannot afford, do not waste', uk: 'гроші — earn, cannot afford, do not waste' }, episodeOrdinals: [18] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c3-01', type: 'situation', grammarPoint: 'l10c3_often', situation: { ru: 'Тренер спрашивает, как часто ты плаваешь. Скажи, что раз в неделю.', uk: 'Тренер питає, як часто ти плаваєш. Скажи, що раз на тиждень.' }, accepted: ['I swim once a week.'] },
    { id: 'l10c3-02', type: 'situation', grammarPoint: 'l10c3_thank', situation: { ru: 'Ты не расслышал собеседника. Вежливо попроси повторить.', uk: 'Ти не розчув співрозмовника. Ввічливо попроси повторити.' }, accepted: ['Can you repeat that?'] },
    { id: 'l10c3-03', type: 'situation', grammarPoint: 'l10c3_trust', situation: { ru: 'Друг сомневается, можно ли тебе что-то рассказать. Скажи, что доверяешь ему.', uk: 'Друг вагається, чи можна тобі щось розповісти. Скажи, що довіряєш йому.' }, accepted: ['I trust you.'] },
    { id: 'l10c3-04', type: 'situation', grammarPoint: 'l10c3_often', situation: { ru: 'Продавец предлагает что-нибудь ещё. Скажи, что тебе нужно только молоко.', uk: 'Продавець пропонує щось іще. Скажи, що тобі потрібне лише молоко.' }, accepted: ['I only need milk.'] },
    { id: 'l10c3-05', type: 'situation', grammarPoint: 'l10c3_thank', situation: { ru: 'Соседка помогла донести сумки. Поблагодари её за помощь.', uk: 'Сусідка допомогла донести сумки. Подякуй їй за допомогу.' }, accepted: ['Thank you for your help.'] },
    { id: 'l10c3-06', type: 'situation', grammarPoint: 'l10c3_trust', situation: { ru: 'На письме чья-то подпись. Спроси друга, узнаёт ли он подпись.', uk: 'На листі чийсь підпис. Запитай друга, чи впізнає він підпис.' }, accepted: ['Do you recognize the signature?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c3-07', type: 'dialogue', grammarPoint: 'l10c3_often', partnerLine: 'What else do you need?', situation: { ru: 'Больше ничего не надо — только молоко. Ответь.', uk: 'Більше нічого не треба — лише молоко. Відповідай.' }, accepted: ['I only need milk.'] },
    { id: 'l10c3-08', type: 'dialogue', grammarPoint: 'l10c3_thank', partnerLine: 'This is my gift.', situation: { ru: 'Поблагодари за подарок.', uk: 'Подякуй за подарунок.' }, accepted: ['Thank you for your gift.'] },
    { id: 'l10c3-09', type: 'dialogue', grammarPoint: 'l10c3_trust', partnerLine: 'This is my sister.', situation: { ru: 'Скажи, что ты её узнаёшь.', uk: 'Скажи, що ти її впізнаєш.' }, accepted: ['I recognize her.'] },
    { id: 'l10c3-10', type: 'dialogue', grammarPoint: 'l10c3_money', partnerLine: 'I earn money.', situation: { ru: 'Пальто слишком дорогое. Скажи, что не можешь его себе позволить.', uk: 'Пальто задороге. Скажи, що не можеш собі його дозволити.' }, accepted: ['I cannot afford this coat.'] },
    { id: 'l10c3-11', type: 'dialogue', grammarPoint: 'l10c3_trust', partnerLine: 'I recognize the accent.', situation: { ru: 'Скажи, что узнаёшь и его голос.', uk: 'Скажи, що впізнаєш і його голос.' }, accepted: ['I recognize his voice.'] },
    { id: 'l10c3-12', type: 'dialogue', grammarPoint: 'l10c3_money', partnerLine: 'I do not waste food.', situation: { ru: 'Скажи, что вы не тратите зря воду.', uk: 'Скажи, що ви не витрачаєте даремно воду.' }, accepted: ['We do not waste water.', "We don't waste water."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c3-13', type: 'fix', grammarPoint: 'l10c3_often', wrong: 'I only needs milk.', accepted: ['I only need milk.'] },
    { id: 'l10c3-14', type: 'fix', grammarPoint: 'l10c3_thank', wrong: 'I want apologise.', accepted: ['I want to apologise.'] },
    { id: 'l10c3-15', type: 'fix', grammarPoint: 'l10c3_money', wrong: 'I cannot to afford this coat.', accepted: ['I cannot afford this coat.'] },
    { id: 'l10c3-16', type: 'fix', grammarPoint: 'l10c3_trust', wrong: 'I recognizes her handwriting.', accepted: ['I recognize her handwriting.'] },
  ],
};
