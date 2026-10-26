// chapter_exam_v2_l19_c3.ts — банк экзамена v2: урок 19, глава 3 (эпизоды 17–24). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 3 — «At ten, I could change …» (умел раньше), вежливая просьба «May I have a sample?» и «so / such» на словах про быт, цены и условия. Только слова и формы эпизодов 1–24 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C3: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l19c3_could_past', label: { ru: 'умел раньше: At ten / At twenty, I could …', uk: 'умів раніше: At ten / At twenty, I could …' }, episodeOrdinals: [18, 19, 20, 21, 22, 23, 24] },
    { id: 'l19c3_may_i', label: { ru: 'просьба: May I have / change / watch …?', uk: 'прохання: May I have / change / watch …?' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24] },
    { id: 'l19c3_so_such', label: { ru: 'так и такой: so funny / such a useful explanation', uk: 'так і такий: so funny / such a useful explanation' }, episodeOrdinals: [18, 19, 20, 21, 22, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c3-01', type: 'situation', grammarPoint: 'l19c3_could_past', situation: { ru: 'В десять лет ты уже сам переключал канал. Скажи об этом.', uk: 'У десять років ти вже сам перемикав канал. Скажи про це.' }, accepted: ['At ten, I could change the channel.'] },
    { id: 'l19c3-02', type: 'situation', grammarPoint: 'l19c3_could_past', situation: { ru: 'В двадцать лет ты уже платил за аренду сам. Скажи об этом.', uk: 'У двадцять років ти вже платив за оренду сам. Скажи про це.' }, accepted: ['At twenty, I could pay the rent.'] },
    { id: 'l19c3-03', type: 'situation', grammarPoint: 'l19c3_may_i', situation: { ru: 'В магазине раздают образцы. Вежливо спроси, можно ли взять образец.', uk: 'У магазині роздають зразки. Ввічливо запитай, чи можна взяти зразок.' }, accepted: ['May I have a sample?', 'Can I have a sample?'] },
    { id: 'l19c3-04', type: 'situation', grammarPoint: 'l19c3_may_i', situation: { ru: 'Ты в гостях и хочешь сменить канал. Вежливо спроси, можно ли его поменять.', uk: 'Ти в гостях і хочеш змінити канал. Ввічливо запитай, чи можна його змінити.' }, accepted: ['May I change the channel?', 'Can I change the channel?'] },
    { id: 'l19c3-05', type: 'situation', grammarPoint: 'l19c3_so_such', situation: { ru: 'Эта серия очень смешная. Скажи, что она такая смешная.', uk: 'Ця серія дуже смішна. Скажи, що вона така смішна.' }, accepted: ['This episode is so funny.'] },
    { id: 'l19c3-06', type: 'situation', grammarPoint: 'l19c3_so_such', situation: { ru: 'Объяснение тебе очень помогло. Скажи, что это такое полезное объяснение.', uk: 'Пояснення тобі дуже допомогло. Скажи, що це таке корисне пояснення.' }, accepted: ['This is such a useful explanation.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c3-07', type: 'dialogue', grammarPoint: 'l19c3_could_past', partnerLine: 'At ten, I could choose a suitable book.', situation: { ru: 'Друг говорит, что в десять лет сам выбирал подходящую книгу. Скажи, что в двадцать лет ты мог понять эти условия.', uk: 'Друг каже, що у десять років сам вибирав підходящу книжку. Скажи, що у двадцять років ти міг зрозуміти ці умови.' }, accepted: ['At twenty, I could understand these conditions.'] },
    { id: 'l19c3-08', type: 'dialogue', grammarPoint: 'l19c3_could_past', partnerLine: 'At twenty, I could suggest a reasonable price.', situation: { ru: 'Друг говорит, что в двадцать лет мог предложить разумную цену. Скажи, что в двадцать лет ты уверенно говорил.', uk: 'Друг каже, що у двадцять років міг запропонувати розумну ціну. Скажи, що у двадцять років ти впевнено говорив.' }, accepted: ['At twenty, I could speak confidently.'] },
    { id: 'l19c3-09', type: 'dialogue', grammarPoint: 'l19c3_may_i', partnerLine: 'I can use the remote control.', situation: { ru: 'Друг говорит, что умеет пользоваться пультом. Вежливо спроси, можно ли посмотреть ещё одну серию.', uk: 'Друг каже, що вміє користуватися пультом. Ввічливо запитай, чи можна подивитися ще одну серію.' }, accepted: ['May I watch another episode?', 'Can I watch another episode?'] },
    { id: 'l19c3-10', type: 'dialogue', grammarPoint: 'l19c3_may_i', partnerLine: 'This episode is so funny.', situation: { ru: 'Друг говорит, что эта серия очень смешная. Вежливо спроси, можно ли посмотреть этот сериал.', uk: 'Друг каже, що ця серія дуже смішна. Ввічливо запитай, чи можна подивитися цей серіал.' }, accepted: ['May I watch this series?', 'Can I watch this series?'] },
    { id: 'l19c3-11', type: 'dialogue', grammarPoint: 'l19c3_so_such', partnerLine: 'I can give you additional help.', situation: { ru: 'Друг предлагает дополнительную помощь. Скажи, что эта книга так полезна.', uk: 'Друг пропонує додаткову допомогу. Скажи, що ця книжка така корисна.' }, accepted: ['This book is so useful.'] },
    { id: 'l19c3-12', type: 'dialogue', grammarPoint: 'l19c3_so_such', partnerLine: 'The average rent is so high.', situation: { ru: 'Друг говорит, что средняя аренда такая высокая. Скажи, что это условие так важно.', uk: 'Друг каже, що середня оренда така висока. Скажи, що ця умова така важлива.' }, accepted: ['This condition is so important.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c3-13', type: 'fix', grammarPoint: 'l19c3_could_past', wrong: 'At twenty, I can pay the rent.', accepted: ['At twenty, I could pay the rent.'] },
    { id: 'l19c3-14', type: 'fix', grammarPoint: 'l19c3_may_i', wrong: 'May I to have a sample?', accepted: ['May I have a sample?', 'Can I have a sample?'] },
    { id: 'l19c3-15', type: 'fix', grammarPoint: 'l19c3_so_such', wrong: 'This price is such high.', accepted: ['This price is so high.'] },
    { id: 'l19c3-16', type: 'fix', grammarPoint: 'l19c3_so_such', wrong: 'This is so helpful response.', accepted: ['This is such a helpful response.'] },
  ],
};
