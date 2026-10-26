// chapter_exam_v2_l29_c4.ts — банк экзамена v2: урок 29, глава 4 (эпизоды 25–32). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 4 — уточнение «кто» и «что именно» через who / which («The woman who helped me», «The table which I bought») и вежливые вопросы («Could you explain the rules?», «May we look around?»). Только слова и формы эпизодов 1–32 урока 29; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C4: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l29c4_who_which_subject', label: { ru: 'кто сделал: The woman who helped me / The player who scored', uk: 'хто зробив: The woman who helped me / The player who scored' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l29c4_who_which_object', label: { ru: 'с кем или чем: The person who I called / The picture which I chose', uk: 'з ким чи чим: The person who I called / The picture which I chose' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l29c4_requests', label: { ru: 'вежливые вопросы: Could you …? / May we …? / Shall we …?', uk: 'ввічливі запитання: Could you …? / May we …? / Shall we …?' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l29c4-01', type: 'situation', grammarPoint: 'l29c4_who_which_subject', situation: { ru: 'Соседка помогла тебе с коробками. Скажи, что женщина, которая тебе помогла, живёт рядом.', uk: 'Сусідка допомогла тобі з коробками. Скажи, що жінка, яка тобі допомогла, живе поруч.' }, accepted: ['The woman who helped me lives nearby.'] },
    { id: 'l29c4-02', type: 'situation', grammarPoint: 'l29c4_who_which_subject', situation: { ru: 'Ты купил стол, и он тяжёлый. Скажи, что стол, который ты купил, тяжёлый.', uk: 'Ти купив стіл, і він важкий. Скажи, що стіл, який ти купив, важкий.' }, accepted: ['The table which I bought is heavy.'] },
    { id: 'l29c4-03', type: 'situation', grammarPoint: 'l29c4_who_which_object', situation: { ru: 'Ты звонил знакомому, а он был занят. Скажи, что человек, которому ты позвонил, был занят.', uk: 'Ти телефонував знайомому, а він був зайнятий. Скажи, що людина, якій ти зателефонував, була зайнята.' }, accepted: ['The person who I called was busy.'] },
    { id: 'l29c4-04', type: 'situation', grammarPoint: 'l29c4_who_which_object', situation: { ru: 'Ты выбрал картину, она небольшая. Скажи, что картина, которую ты выбрал, маленькая.', uk: 'Ти вибрав картину, вона невелика. Скажи, що картина, яку ти вибрав, маленька.' }, accepted: ['The picture which I chose is small.'] },
    { id: 'l29c4-05', type: 'situation', grammarPoint: 'l29c4_requests', situation: { ru: 'Ты на рынке и хочешь побеседовать с продавцом рыбы. Вежливо спроси, можно ли с ним поговорить.', uk: 'Ти на ринку й хочеш побалакати з продавцем риби. Ввічливо запитай, чи можна з ним поговорити.' }, accepted: ['Could I speak to the fishmonger?'] },
    { id: 'l29c4-06', type: 'situation', grammarPoint: 'l29c4_requests', situation: { ru: 'Вы пришли в магазин антиквариата. Вежливо спроси, можно ли вам осмотреться.', uk: 'Ви прийшли в антикварну крамницю. Ввічливо запитай, чи можна вам роззирнутися.' }, accepted: ['May we look around?'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l29c4-07', type: 'dialogue', grammarPoint: 'l29c4_who_which_subject', partnerLine: 'Thank you for helping with the boxes.', situation: { ru: 'Друг благодарит за помощь с коробками. Скажи, что человек, который тебе помог, был добрым.', uk: 'Друг дякує за допомогу з коробками. Скажи, що людина, яка тобі допомогла, була доброю.' }, accepted: ['The person who helped me was kind.'] },
    { id: 'l29c4-08', type: 'dialogue', grammarPoint: 'l29c4_who_which_subject', partnerLine: 'The striker scored twice.', situation: { ru: 'Друг говорит, что нападающий забил дважды. Скажи, что игрок, который забил гол, вон там.', uk: 'Друг каже, що нападник забив двічі. Скажи, що гравець, який забив гол, он там.' }, accepted: ['The player who scored the goal is over there.'] },
    { id: 'l29c4-09', type: 'dialogue', grammarPoint: 'l29c4_who_which_object', partnerLine: 'I like abstract art.', situation: { ru: 'Друг любит абстрактное искусство. Скажи, что друг, которого ты учил, часто выигрывает.', uk: 'Друг любить абстрактне мистецтво. Скажи, що друг, якого ти вчив, часто виграє.' }, accepted: ['The friend who I taught often wins.'] },
    { id: 'l29c4-10', type: 'dialogue', grammarPoint: 'l29c4_who_which_object', partnerLine: 'My brother is a defender.', situation: { ru: 'Друг говорит, что его брат играет в защите. Скажи, что игрок, которого ты знаешь, живёт рядом.', uk: 'Друг каже, що його брат грає в захисті. Скажи, що гравець, якого ти знаєш, живе поруч.' }, accepted: ['The player who I know lives nearby.'] },
    { id: 'l29c4-11', type: 'dialogue', grammarPoint: 'l29c4_requests', partnerLine: 'Our team won the match.', situation: { ru: 'Друг рассказывает про матч. Спроси, какой счёт.', uk: 'Друг розповідає про матч. Запитай, який рахунок.' }, accepted: ['What is the score?'] },
    { id: 'l29c4-12', type: 'dialogue', grammarPoint: 'l29c4_requests', partnerLine: 'I am still learning.', situation: { ru: 'Друг говорит, что только учится играть. Предложи сыграть в рамми.', uk: 'Друг каже, що тільки вчиться грати. Запропонуй зіграти в раммі.' }, accepted: ['Shall we play rummy?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l29c4-13', type: 'fix', grammarPoint: 'l29c4_who_which_subject', wrong: 'The woman which helped me lives nearby.', accepted: ['The woman who helped me lives nearby.'] },
    { id: 'l29c4-14', type: 'fix', grammarPoint: 'l29c4_who_which_object', wrong: 'The picture who I chose is small.', accepted: ['The picture which I chose is small.'] },
    { id: 'l29c4-15', type: 'fix', grammarPoint: 'l29c4_requests', wrong: 'Could you to explain the rules?', accepted: ['Could you explain the rules?'] },
    { id: 'l29c4-16', type: 'fix', grammarPoint: 'l29c4_requests', wrong: 'May we to look around?', accepted: ['May we look around?'] },
  ],
};
