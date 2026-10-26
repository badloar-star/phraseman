// chapter_exam_v2_l19_c1.ts — банк экзамена v2: урок 19, глава 1 (эпизоды 1–8). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 1 — «can» + глагол без «to» (умею, могу), планы «We are going to …» / «We are meeting … tomorrow» и «so / such» на тех же словах. Только слова и формы эпизодов 1–8 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C1: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l19c1_can', label: { ru: 'могу: I can describe / She can suggest …', uk: 'можу: I can describe / She can suggest …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'l19c1_plans', label: { ru: 'планы: We are going to … / We are meeting … tomorrow', uk: 'плани: We are going to … / We are meeting … tomorrow' }, episodeOrdinals: [2, 3, 4, 5, 6, 7, 8] },
    { id: 'l19c1_so_such', label: { ru: 'так и такой: so useful / such a good plan', uk: 'так і такий: so useful / such a good plan' }, episodeOrdinals: [2, 3, 4, 5, 6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c1-01', type: 'situation', grammarPoint: 'l19c1_can', situation: { ru: 'Тебя просят рассказать о месте, где ты был. Скажи, что можешь описать это место.', uk: 'Тебе просять розповісти про місце, де ти був. Скажи, що можеш описати це місце.' }, accepted: ['I can describe the place.'] },
    { id: 'l19c1-02', type: 'situation', grammarPoint: 'l19c1_can', situation: { ru: 'Подруга знает хороший ресторан. Скажи, что она может его предложить.', uk: 'Подруга знає хороший ресторан. Скажи, що вона може його запропонувати.' }, accepted: ['She can suggest a restaurant.'] },
    { id: 'l19c1-03', type: 'situation', grammarPoint: 'l19c1_plans', situation: { ru: 'Вы решили заменить батарейку. Скажи, что вы собираетесь её заменить.', uk: 'Ви вирішили замінити батарейку. Скажи, що ви збираєтесь її замінити.' }, accepted: ['We are going to replace the battery.'] },
    { id: 'l19c1-04', type: 'situation', grammarPoint: 'l19c1_plans', situation: { ru: 'Завтра вы встречаетесь в саду — договорились. Скажи об этом.', uk: 'Завтра ви зустрічаєтесь у саду — домовилися. Скажи про це.' }, accepted: ['We are meeting in the garden tomorrow.'] },
    { id: 'l19c1-05', type: 'situation', grammarPoint: 'l19c1_so_such', situation: { ru: 'Идея кажется тебе очень полезной. Скажи, что эта идея так полезна.', uk: 'Ідея здається тобі дуже корисною. Скажи, що ця ідея така корисна.' }, accepted: ['This idea is so useful.'] },
    { id: 'l19c1-06', type: 'situation', grammarPoint: 'l19c1_so_such', situation: { ru: 'План кажется тебе очень хорошим. Скажи, что это такой хороший план.', uk: 'План здається тобі дуже добрим. Скажи, що це такий гарний план.' }, accepted: ['This is such a good plan.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c1-07', type: 'dialogue', grammarPoint: 'l19c1_can', partnerLine: 'I can remove this stain.', situation: { ru: 'Друг говорит, что может убрать это пятно. Скажи, что она может заменить батарейку.', uk: 'Друг каже, що може прибрати цю пляму. Скажи, що вона може замінити батарейку.' }, accepted: ['She can replace the battery.'] },
    { id: 'l19c1-08', type: 'dialogue', grammarPoint: 'l19c1_can', partnerLine: 'We can protect the plants.', situation: { ru: 'Друг говорит, что вы можете защитить растения. Скажи, что вы можете предотвратить ущерб.', uk: 'Друг каже, що ви можете захистити рослини. Скажи, що ви можете запобігти шкоді.' }, accepted: ['We can prevent damage.'] },
    { id: 'l19c1-09', type: 'dialogue', grammarPoint: 'l19c1_plans', partnerLine: 'We can discuss this possibility.', situation: { ru: 'Друг говорит, что вы можете обсудить эту возможность. Скажи, что вы собираетесь обсудить этот метод.', uk: 'Друг каже, що ви можете обговорити цю можливість. Скажи, що ви збираєтесь обговорити цей метод.' }, accepted: ['We are going to discuss this method.'] },
    { id: 'l19c1-10', type: 'dialogue', grammarPoint: 'l19c1_plans', partnerLine: 'She can accept this challenge.', situation: { ru: 'Друг говорит, что она может принять этот вызов. Скажи, что завтра вы встречаетесь с другом — договорились.', uk: 'Друг каже, що вона може прийняти цей виклик. Скажи, що завтра ви зустрічаєтесь із другом — домовилися.' }, accepted: ['We are meeting our friend tomorrow.'] },
    { id: 'l19c1-11', type: 'dialogue', grammarPoint: 'l19c1_so_such', partnerLine: 'Music can inspire us.', situation: { ru: 'Друг говорит, что музыка может нас вдохновлять. Скажи, что это такая милая песня.', uk: 'Друг каже, що музика може нас надихати. Скажи, що це така мила пісня.' }, accepted: ['This is such a lovely song.'] },
    { id: 'l19c1-12', type: 'dialogue', grammarPoint: 'l19c1_so_such', partnerLine: 'We can discuss this fear.', situation: { ru: 'Друг говорит, что вы можете обсудить этот страх. Скажи, что фильм такой грустный.', uk: 'Друг каже, що ви можете обговорити цей страх. Скажи, що фільм такий сумний.' }, accepted: ['This film is so sad.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c1-13', type: 'fix', grammarPoint: 'l19c1_can', wrong: 'He can recommends a hotel.', accepted: ['He can recommend a hotel.'] },
    { id: 'l19c1-14', type: 'fix', grammarPoint: 'l19c1_plans', wrong: 'We are going protect the plants.', accepted: ['We are going to protect the plants.'] },
    { id: 'l19c1-15', type: 'fix', grammarPoint: 'l19c1_so_such', wrong: 'This method is such useful.', accepted: ['This method is so useful.'] },
    { id: 'l19c1-16', type: 'fix', grammarPoint: 'l19c1_so_such', wrong: 'This is so strong emotion.', accepted: ['This is such a strong emotion.'] },
  ],
};
