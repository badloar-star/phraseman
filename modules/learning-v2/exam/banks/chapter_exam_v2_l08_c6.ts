// chapter_exam_v2_l08_c6.ts — банк экзамена v2: урок 8, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–48 — I can / she can + действие без to и без s, you / we / they / anyone can;
// вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C6: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l08c6_skill', label: { ru: 'умею — I can + действие', uk: 'вмію — I can + дія' }, episodeOrdinals: [41, 43, 44] },
    { id: 'l08c6_others', label: { ru: 'и другие могут — you / we / they can', uk: 'і інші можуть — you / we / they can' }, episodeOrdinals: [46] },
    { id: 'l08c6_she', label: { ru: 'она умеет — she can', uk: 'вона вміє — she can' }, episodeOrdinals: [41, 45, 47] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c6-01', type: 'situation', grammarPoint: 'l08c6_skill', situation: { ru: 'Организаторы ярмарки спорят о месте. Скажи, что ты умеешь вести переговоры.', uk: 'Організатори ярмарку сперечаються про місце. Скажи, що ти вмієш вести перемовини.' }, accepted: ['I can negotiate.'] },
    { id: 'l08c6-02', type: 'situation', grammarPoint: 'l08c6_skill', situation: { ru: 'Нужен человек для трудного разговора с поставщиком. Спроси коллегу, умеет ли он вести переговоры.', uk: 'Потрібна людина для складної розмови з постачальником. Запитай колегу, чи вміє він вести перемовини.' }, accepted: ['Can you negotiate?'] },
    { id: 'l08c6-03', type: 'situation', grammarPoint: 'l08c6_others', situation: { ru: 'Новичок боится ошибиться. Скажи, что ошибиться может каждый.', uk: 'Новачок боїться помилитися. Скажи, що помилитися може кожен.' }, accepted: ['Anyone can make a mistake.'] },
    { id: 'l08c6-04', type: 'situation', grammarPoint: 'l08c6_she', situation: { ru: 'Соседка отлично улаживает споры. Скажи, что она умеет мирить людей.', uk: 'Сусідка чудово залагоджує суперечки. Скажи, що вона вміє мирити людей.' }, accepted: ['She can mediate.'] },
    { id: 'l08c6-05', type: 'situation', grammarPoint: 'l08c6_others', situation: { ru: 'Вы с другом таскаете коробки и устали. Скажи, что вы можете сделать перерыв.', uk: 'Ви з другом носите коробки й утомилися. Скажи, що ви можете зробити перерву.' }, accepted: ['We can take a break.'] },
    { id: 'l08c6-06', type: 'situation', grammarPoint: 'l08c6_she', situation: { ru: 'Начальница раздаёт задачи всей команде. Скажи, что она умеет делегировать.', uk: 'Начальниця роздає завдання всій команді. Скажи, що вона вміє делегувати.' }, accepted: ['She can delegate.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c6-07', type: 'dialogue', grammarPoint: 'l08c6_skill', partnerLine: "I can't operate it.", situation: { ru: 'На мастер-классе подруга растерялась у швейной машины. Скажи, что ты умеешь ею управлять.', uk: 'На майстер-класі подруга розгубилася біля швейної машини. Скажи, що ти вмієш нею керувати.' }, accepted: ['I can operate it.'] },
    { id: 'l08c6-08', type: 'dialogue', grammarPoint: 'l08c6_others', partnerLine: "I can't assemble it.", situation: { ru: 'Друг мучается с полкой. Скажи, что он может попросить помощи.', uk: 'Друг мучиться з поличкою. Скажи, що він може попросити допомоги.' }, accepted: ['You can ask for help.'] },
    { id: 'l08c6-09', type: 'dialogue', grammarPoint: 'l08c6_she', partnerLine: "I can't reset the timer.", situation: { ru: 'Скажи, что твоя напарница может сбросить таймер.', uk: 'Скажи, що твоя напарниця може скинути таймер.' }, accepted: ['She can reset the timer.', 'She can reset it.'] },
    { id: 'l08c6-10', type: 'dialogue', grammarPoint: 'l08c6_skill', partnerLine: "I can't find the trailhead.", situation: { ru: 'Друг не видит, где начинается тропа. Скажи, что ты умеешь ориентироваться.', uk: 'Друг не бачить, де починається стежка. Скажи, що ти вмієш орієнтуватися.' }, accepted: ['I can navigate.'] },
    { id: 'l08c6-11', type: 'dialogue', grammarPoint: 'l08c6_others', partnerLine: 'I can supervise.', situation: { ru: 'Новички волнуются. Скажи, что они могут попросить помощи.', uk: 'Новачки хвилюються. Скажи, що вони можуть попросити допомоги.' }, accepted: ['They can ask for help.'] },
    { id: 'l08c6-12', type: 'dialogue', grammarPoint: 'l08c6_she', partnerLine: 'I can align the shelves.', situation: { ru: 'На сцене забыли реквизит. Скажи, что подруга умеет импровизировать.', uk: 'На сцені забули реквізит. Скажи, що подруга вміє імпровізувати.' }, accepted: ['She can improvise.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c6-13', type: 'fix', grammarPoint: 'l08c6_skill', wrong: 'I can negotiates.', accepted: ['I can negotiate.'] },
    { id: 'l08c6-14', type: 'fix', grammarPoint: 'l08c6_others', wrong: 'Anyone can makes a mistake.', accepted: ['Anyone can make a mistake.'] },
    { id: 'l08c6-15', type: 'fix', grammarPoint: 'l08c6_she', wrong: 'She cans delegate.', accepted: ['She can delegate.'] },
    { id: 'l08c6-16', type: 'fix', grammarPoint: 'l08c6_skill', wrong: 'Can you adapts?', accepted: ['Can you adapt?'] },
  ],
};
