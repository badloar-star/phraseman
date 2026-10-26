// chapter_exam_v2_l19_c5.ts — банк экзамена v2: урок 19, глава 5 (эпизоды 33–40). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 5 — «can» (умею, могу), «am able to» / «will be able to» (способен, смогу) и «so / such» на словах про привычки, ответы и выгоду. Только слова и формы эпизодов 1–40 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C5: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l19c5_able', label: { ru: 'способен и смогу: I am able to … / I will be able to …', uk: 'здатен і зможу: I am able to … / I will be able to …' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
    { id: 'l19c5_can', label: { ru: 'умею, могу: I can describe / pay / send …', uk: 'вмію, можу: I can describe / pay / send …' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
    { id: 'l19c5_so_such', label: { ru: 'так и такой: so inconvenient / such a dishonest answer', uk: 'так і такий: so inconvenient / such a dishonest answer' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c5-01', type: 'situation', grammarPoint: 'l19c5_able', situation: { ru: 'Тебе скоро нужно будет всё объяснить, и ты уверен в себе. Скажи, что ты сможешь это объяснить.', uk: 'Тобі скоро потрібно буде все пояснити, і ти впевнений у собі. Скажи, що ти зможеш це пояснити.' }, accepted: ['I will be able to explain this.'] },
    { id: 'l19c5-02', type: 'situation', grammarPoint: 'l19c5_able', situation: { ru: 'Подруга заговорила без напряжения. Скажи, что она способна нормально говорить.', uk: 'Подруга заговорила без напруги. Скажи, що вона здатна нормально говорити.' }, accepted: ['She is able to speak normally.'] },
    { id: 'l19c5-03', type: 'situation', grammarPoint: 'l19c5_can', situation: { ru: 'У тебя спросили про питание. Скажи, что можешь описать свой рацион.', uk: 'У тебе запитали про харчування. Скажи, що можеш описати свій раціон.' }, accepted: ['I can describe my diet.'] },
    { id: 'l19c5-04', type: 'situation', grammarPoint: 'l19c5_can', situation: { ru: 'Платить сразу тебе удобно. Скажи, что можешь заплатить заранее.', uk: 'Платити одразу тобі зручно. Скажи, що можеш заплатити наперед.' }, accepted: ['I can pay in advance.'] },
    { id: 'l19c5-05', type: 'situation', grammarPoint: 'l19c5_so_such', situation: { ru: 'Назначенное время никому не подходит. Скажи, что это время так неудобно.', uk: 'Призначений час нікому не підходить. Скажи, що цей час такий незручний.' }, accepted: ['This time is so inconvenient.'] },
    { id: 'l19c5-06', type: 'situation', grammarPoint: 'l19c5_so_such', situation: { ru: 'Тебе ответили нечестно. Скажи, что это такой нечестный ответ.', uk: 'Тобі відповіли нечесно. Скажи, що це така нечесна відповідь.' }, accepted: ['That is such a dishonest answer.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c5-07', type: 'dialogue', grammarPoint: 'l19c5_able', partnerLine: 'I am able to practise regularly.', situation: { ru: 'Друг говорит, что может заниматься регулярно. Скажи, что вы сможете отлично тебя услышать.', uk: 'Друг каже, що може займатися регулярно. Скажи, що ви зможете чудово тебе почути.' }, accepted: ['We will be able to hear you perfectly.'] },
    { id: 'l19c5-08', type: 'dialogue', grammarPoint: 'l19c5_able', partnerLine: 'They will be able to finish successfully.', situation: { ru: 'Друг говорит, что они смогут успешно закончить. Скажи, что ты способен регулярно заниматься.', uk: 'Друг каже, що вони зможуть успішно закінчити. Скажи, що ти здатен регулярно займатися.' }, accepted: ['I am able to practise regularly.'] },
    { id: 'l19c5-09', type: 'dialogue', grammarPoint: 'l19c5_can', partnerLine: 'I can invite my sibling.', situation: { ru: 'Друг говорит, что может пригласить брата. Скажи, что ты можешь отправить напоминание.', uk: 'Друг каже, що може запросити брата. Скажи, що ти можеш надіслати нагадування.' }, accepted: ['I can send you a reminder.'] },
    { id: 'l19c5-10', type: 'dialogue', grammarPoint: 'l19c5_can', partnerLine: 'She can work mostly from home.', situation: { ru: 'Друг говорит, что она в основном работает из дома. Скажи, что ты на самом деле умеешь плавать.', uk: 'Друг каже, що вона здебільшого працює з дому. Скажи, що ти насправді вмієш плавати.' }, accepted: ['I can actually swim.'] },
    { id: 'l19c5-11', type: 'dialogue', grammarPoint: 'l19c5_so_such', partnerLine: 'This habit is so unhealthy.', situation: { ru: 'Друг говорит, что эта привычка такая вредная. Скажи, что это такой важный факт.', uk: 'Друг каже, що ця звичка така шкідлива. Скажи, що це такий важливий факт.' }, accepted: ['This is such an important fact.'] },
    { id: 'l19c5-12', type: 'dialogue', grammarPoint: 'l19c5_so_such', partnerLine: 'This is such a big family.', situation: { ru: 'Друг говорит, что это такая большая семья. Скажи, что блюдо такое хорошее.', uk: 'Друг каже, що це така велика родина. Скажи, що страва така добра.' }, accepted: ['This meal is so good.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c5-13', type: 'fix', grammarPoint: 'l19c5_able', wrong: 'I will able to explain this.', accepted: ['I will be able to explain this.'] },
    { id: 'l19c5-14', type: 'fix', grammarPoint: 'l19c5_can', wrong: 'I can to pay in advance.', accepted: ['I can pay in advance.'] },
    { id: 'l19c5-15', type: 'fix', grammarPoint: 'l19c5_so_such', wrong: 'That result is such unlikely.', accepted: ['That result is so unlikely.'] },
    { id: 'l19c5-16', type: 'fix', grammarPoint: 'l19c5_so_such', wrong: 'This is so small profit.', accepted: ['This is such a small profit.'] },
  ],
};
