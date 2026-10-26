// chapter_exam_v2_l10_c7.ts — банк экзамена v2: урок 10, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–56 — вежливые фразы Excuse me / You are welcome / No problem / Take care, время already / soon / on time / right now, кто-то и никто somebody / nobody / everywhere; вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C7: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l10c7_polite', label: { ru: 'вежливые фразы — Excuse me, You are welcome, No problem, Take care', uk: 'ввічливі фрази — Excuse me, You are welcome, No problem, Take care' }, episodeOrdinals: [53, 54] },
    { id: 'l10c7_time', label: { ru: 'время — already, later, on time, right now', uk: 'час — already, later, on time, right now' }, episodeOrdinals: [50, 56] },
    { id: 'l10c7_nobody', label: { ru: 'кто-то и никто — somebody, nobody, everywhere', uk: 'хтось і ніхто — somebody, nobody, everywhere' }, episodeOrdinals: [52] },
    { id: 'l10c7_ask', label: { ru: 'спросить — What is…? / Are you … right now?', uk: 'запитати — What is…? / Are you … right now?' }, episodeOrdinals: [49, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c7-01', type: 'situation', grammarPoint: 'l10c7_polite', situation: { ru: 'Тебе нужно спросить дорогу у прохожего. Обратись к нему.', uk: 'Тобі треба запитати дорогу в перехожого. Звернися до нього.' }, accepted: ['Excuse me.'] },
    { id: 'l10c7-02', type: 'situation', grammarPoint: 'l10c7_time', situation: { ru: 'Ты пришёл раньше друга. Напиши, что ты уже на месте.', uk: 'Ти прийшов раніше за друга. Напиши, що ти вже на місці.' }, accepted: ['I am already here.'] },
    { id: 'l10c7-03', type: 'situation', grammarPoint: 'l10c7_nobody', situation: { ru: 'В дверь стучат. Скажи, что кто-то стучит.', uk: 'У двері стукають. Скажи, що хтось стукає.' }, accepted: ['Somebody is knocking.'] },
    { id: 'l10c7-04', type: 'situation', grammarPoint: 'l10c7_polite', situation: { ru: 'Сосед поблагодарил тебя за помощь. Ответь, что не за что.', uk: 'Сусід подякував тобі за допомогу. Відповідай, що нема за що.' }, accepted: ['You are welcome.', "You're welcome."] },
    { id: 'l10c7-05', type: 'situation', grammarPoint: 'l10c7_ask', situation: { ru: 'Собираешься на прогулку и не знаешь, как одеться. Спроси, какая температура.', uk: 'Збираєшся на прогулянку й не знаєш, як одягнутися. Запитай, яка температура.' }, accepted: ['What is the temperature?'] },
    { id: 'l10c7-06', type: 'situation', grammarPoint: 'l10c7_nobody', situation: { ru: 'Курьер звонит в дверь, а дома никого. Напиши ему, что дома никого нет.', uk: 'Кур’єр дзвонить у двері, а вдома нікого. Напиши йому, що вдома нікого немає.' }, accepted: ['Nobody is at home.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c7-07', type: 'dialogue', grammarPoint: 'l10c7_polite', partnerLine: 'Thank you for your help.', situation: { ru: 'Ответь, что это не проблема.', uk: 'Відповідай, що це не проблема.' }, accepted: ['No problem.'] },
    { id: 'l10c7-08', type: 'dialogue', grammarPoint: 'l10c7_time', partnerLine: 'The train leaves soon.', situation: { ru: 'Попрощайся: увидимся позже.', uk: 'Попрощайся: побачимося пізніше.' }, accepted: ['See you later.'] },
    { id: 'l10c7-09', type: 'dialogue', grammarPoint: 'l10c7_nobody', partnerLine: 'I cannot find my keys anywhere.', situation: { ru: 'Скажи, что ты ищешь везде.', uk: 'Скажи, що ти шукаєш усюди.' }, accepted: ['I am looking everywhere.'] },
    { id: 'l10c7-10', type: 'dialogue', grammarPoint: 'l10c7_polite', partnerLine: 'I am leaving now.', situation: { ru: 'Друг уезжает. Пожелай ему беречь себя.', uk: 'Друг їде. Побажай йому берегти себе.' }, accepted: ['Take care.'] },
    { id: 'l10c7-11', type: 'dialogue', grammarPoint: 'l10c7_ask', partnerLine: 'I am at home at the moment.', situation: { ru: 'Спроси, работает ли он прямо сейчас.', uk: 'Запитай, чи працює він просто зараз.' }, accepted: ['Are you working right now?'] },
    { id: 'l10c7-12', type: 'dialogue', grammarPoint: 'l10c7_nobody', partnerLine: 'Somebody is knocking.', situation: { ru: 'Скажи, что на кухне никого нет.', uk: 'Скажи, що на кухні нікого немає.' }, accepted: ['Nobody is in the kitchen.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c7-13', type: 'fix', grammarPoint: 'l10c7_polite', wrong: 'Excuse to me.', accepted: ['Excuse me.'] },
    { id: 'l10c7-14', type: 'fix', grammarPoint: 'l10c7_time', wrong: 'I already am here.', accepted: ['I am already here.'] },
    { id: 'l10c7-15', type: 'fix', grammarPoint: 'l10c7_nobody', wrong: 'Nobody are at home.', accepted: ['Nobody is at home.'] },
    { id: 'l10c7-16', type: 'fix', grammarPoint: 'l10c7_ask', wrong: 'What are the temperature?', accepted: ['What is the temperature?'] },
  ],
};
