// chapter_exam_v2_l19_c7.ts — банк экзамена v2: урок 19, глава 7 (эпизоды 49–56). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 7 — итог урока: «can» с выражениями («by chance») и с глаголами-партнёрами («work out»), вежливая просьба «Could I have it in writing?» и «so / such» с «will be able to». Только слова и формы эпизодов 1–56 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C7: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l19c7_can_phrases', label: { ru: 'могу + выражение: by chance / for free / by myself', uk: 'можу + вираз: by chance / for free / by myself' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
    { id: 'l19c7_phrasal', label: { ru: 'могу + work out / leave out / come across …', uk: 'можу + work out / leave out / come across …' }, episodeOrdinals: [54, 55, 56] },
    { id: 'l19c7_could_i', label: { ru: 'вежливая просьба: Could I have / read / wait / join …?', uk: 'ввічливе прохання: Could I have / read / wait / join …?' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
    { id: 'l19c7_will_so', label: { ru: 'смогу, так и такой: will be able to / so quiet / such a useful …', uk: 'зможу, так і такий: will be able to / so quiet / such a useful …' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c7-01', type: 'situation', grammarPoint: 'l19c7_can_phrases', situation: { ru: 'Люди иногда знакомятся случайно. Скажи, что люди могут встретиться случайно.', uk: 'Люди іноді знайомляться випадково. Скажи, що люди можуть зустрітися випадково.' }, accepted: ['People can meet by chance.'] },
    { id: 'l19c7-02', type: 'situation', grammarPoint: 'l19c7_phrasal', situation: { ru: 'Нужно посчитать расходы. Скажи, что вы можете вычислить стоимость.', uk: 'Потрібно порахувати витрати. Скажи, що ви можете вирахувати вартість.' }, accepted: ['We can work out the cost.'] },
    { id: 'l19c7-03', type: 'situation', grammarPoint: 'l19c7_could_i', situation: { ru: 'Тебе нужен письменный ответ. Вежливо спроси, можно ли получить его в письменном виде.', uk: 'Тобі потрібна письмова відповідь. Ввічливо запитай, чи можна отримати її письмово.' }, accepted: ['Could I have it in writing?', 'Can I have it in writing?'] },
    { id: 'l19c7-04', type: 'situation', grammarPoint: 'l19c7_could_i', situation: { ru: 'В комнате шумно, а тебе надо читать. Вежливо спроси, можно ли читать в тишине.', uk: 'У кімнаті шумно, а тобі треба читати. Ввічливо запитай, чи можна читати в тиші.' }, accepted: ['Could I read in silence?', 'Can I read in silence?'] },
    { id: 'l19c7-05', type: 'situation', grammarPoint: 'l19c7_will_so', situation: { ru: 'В комнате почти нет шума. Скажи, что в этой комнате так тихо.', uk: 'У кімнаті майже немає шуму. Скажи, що в цій кімнаті так тихо.' }, accepted: ['This room is so quiet.'] },
    { id: 'l19c7-06', type: 'situation', grammarPoint: 'l19c7_will_so', situation: { ru: 'Объяснение тебя выручило. Скажи, что это такое полезное объяснение.', uk: 'Пояснення тебе виручило. Скажи, що це таке корисне пояснення.' }, accepted: ['This is such a useful explanation.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c7-07', type: 'dialogue', grammarPoint: 'l19c7_can_phrases', partnerLine: 'Anyone can break a glass by accident.', situation: { ru: 'Друг говорит, что любой может нечаянно разбить стакан. Скажи, что ты можешь пойти сам.', uk: 'Друг каже, що будь-хто може ненавмисно розбити склянку. Скажи, що ти можеш піти сам.' }, accepted: ['I can go by myself.'] },
    { id: 'l19c7-08', type: 'dialogue', grammarPoint: 'l19c7_phrasal', partnerLine: 'She can point out the mistake.', situation: { ru: 'Друг говорит, что она может указать на ошибку. Скажи, что ты можешь пропустить эту деталь.', uk: 'Друг каже, що вона може вказати на помилку. Скажи, що ти можеш пропустити цю деталь.' }, accepted: ['I can leave out this detail.'] },
    { id: 'l19c7-09', type: 'dialogue', grammarPoint: 'l19c7_could_i', partnerLine: 'I can explain it in detail.', situation: { ru: 'Друг говорит, что может объяснить это подробно. Вежливо спроси, можно ли подождать здесь пока что.', uk: 'Друг каже, що може пояснити це докладно. Ввічливо запитай, чи можна почекати тут поки що.' }, accepted: ['Could I wait here in the meantime?', 'Can I wait here in the meantime?'] },
    { id: 'l19c7-10', type: 'dialogue', grammarPoint: 'l19c7_could_i', partnerLine: 'I can join you in a minute.', situation: { ru: 'Друг говорит, что присоединится через минуту. Вежливо спроси, можно ли и тебе присоединиться через минуту.', uk: 'Друг каже, що приєднається за хвилину. Ввічливо запитай, чи можна й тобі приєднатися за хвилину.' }, accepted: ['Could I join you in a minute?', 'Can I join you in a minute?'] },
    { id: 'l19c7-11', type: 'dialogue', grammarPoint: 'l19c7_will_so', partnerLine: 'We can find something in common.', situation: { ru: 'Друг говорит, что вы можете найти что-то общее. Скажи, что ты сможешь это объяснить.', uk: 'Друг каже, що ви можете знайти щось спільне. Скажи, що ти зможеш це пояснити.' }, accepted: ['I will be able to explain this.'] },
    { id: 'l19c7-12', type: 'dialogue', grammarPoint: 'l19c7_will_so', partnerLine: 'She can learn this poem by heart.', situation: { ru: 'Друг говорит, что она может выучить это стихотворение наизусть. Скажи, что завтра вы сможете помочь.', uk: 'Друг каже, що вона може вивчити цей вірш напам’ять. Скажи, що завтра ви зможете допомогти.' }, accepted: ['We will be able to help tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c7-13', type: 'fix', grammarPoint: 'l19c7_can_phrases', wrong: 'I can explain it on detail.', accepted: ['I can explain it in detail.'] },
    { id: 'l19c7-14', type: 'fix', grammarPoint: 'l19c7_phrasal', wrong: 'You can come across at old photos here.', accepted: ['You can come across old photos here.'] },
    { id: 'l19c7-15', type: 'fix', grammarPoint: 'l19c7_could_i', wrong: 'Could I to plan it in secret?', accepted: ['Could I plan it in secret?', 'Can I plan it in secret?'] },
    { id: 'l19c7-16', type: 'fix', grammarPoint: 'l19c7_will_so', wrong: 'This is so useful explanation.', accepted: ['This is such a useful explanation.'] },
  ],
};
