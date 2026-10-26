// chapter_exam_v2_l10_c2.ts — банк экзамена v2: урок 10, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–16 — обычно и сейчас I usually buy / I am buying, у меня болит I have / she has, знаю и желаю know / hope / wish / promise; вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C2: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l10c2_usual', label: { ru: 'обычно и сейчас — I usually buy, I am buying', uk: 'зазвичай і зараз — I usually buy, I am buying' }, episodeOrdinals: [9, 12, 16] },
    { id: 'l10c2_have', label: { ru: 'у меня — I have, she has', uk: 'у мене — I have, she has' }, episodeOrdinals: [11, 13] },
    { id: 'l10c2_wish', label: { ru: 'знаю, надеюсь, желаю — know, hope, wish, promise', uk: 'знаю, сподіваюся, бажаю — know, hope, wish, promise' }, episodeOrdinals: [10] },
    { id: 'l10c2_ask', label: { ru: 'спросить — Can I have…? / Where is…? / What is your…?', uk: 'запитати — Can I have…? / Where is…? / What is your…?' }, episodeOrdinals: [11, 14, 15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c2-01', type: 'situation', grammarPoint: 'l10c2_ask', situation: { ru: 'Новый знакомый предлагает созвониться. Попроси его номер телефона.', uk: 'Новий знайомий пропонує зідзвонитися. Попроси його номер телефону.' }, accepted: ['Can I have your phone number?'] },
    { id: 'l10c2-02', type: 'situation', grammarPoint: 'l10c2_have', situation: { ru: 'Ты охрип и пропускаешь репетицию. Скажи, что у тебя болит горло.', uk: 'Ти захрип і пропускаєш репетицію. Скажи, що в тебе болить горло.' }, accepted: ['I have a sore throat.'] },
    { id: 'l10c2-03', type: 'situation', grammarPoint: 'l10c2_wish', situation: { ru: 'Друг идёт на важное собеседование. Пожелай ему удачи.', uk: 'Друг іде на важливу співбесіду. Побажай йому удачі.' }, accepted: ['I wish you good luck.'] },
    { id: 'l10c2-04', type: 'situation', grammarPoint: 'l10c2_usual', situation: { ru: 'Готовить сегодня некогда. Скажи, что сегодня покупаешь готовый обед.', uk: 'Готувати сьогодні ніколи. Скажи, що сьогодні купуєш готовий обід.' }, accepted: ['I am buying a ready-made meal today.'] },
    { id: 'l10c2-05', type: 'situation', grammarPoint: 'l10c2_have', situation: { ru: 'Подруга не пришла на встречу — у неё болит ухо. Объясни это.', uk: 'Подруга не прийшла на зустріч — у неї болить вухо. Поясни це.' }, accepted: ['She has earache.'] },
    { id: 'l10c2-06', type: 'situation', grammarPoint: 'l10c2_wish', situation: { ru: 'Друг просит помочь с переездом. Пообещай помочь.', uk: 'Друг просить допомогти з переїздом. Пообіцяй допомогти.' }, accepted: ['I promise to help.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c2-07', type: 'dialogue', grammarPoint: 'l10c2_have', partnerLine: 'I am sending a text message.', situation: { ru: 'Скажи, что у тебя пропущенный звонок.', uk: 'Скажи, що в тебе пропущений дзвінок.' }, accepted: ['I have a missed call.'] },
    { id: 'l10c2-08', type: 'dialogue', grammarPoint: 'l10c2_ask', partnerLine: 'My surname is Brown.', situation: { ru: 'Фамилию ты узнал. Спроси его имя.', uk: 'Прізвище ти дізнався. Запитай його ім’я.' }, accepted: ['What is your first name?'] },
    { id: 'l10c2-09', type: 'dialogue', grammarPoint: 'l10c2_usual', partnerLine: 'She usually wears a nightdress.', situation: { ru: 'Скажи, что сейчас она в халате.', uk: 'Скажи, що зараз вона в халаті.' }, accepted: ['She is wearing a dressing gown.'] },
    { id: 'l10c2-10', type: 'dialogue', grammarPoint: 'l10c2_have', partnerLine: 'I have backache.', situation: { ru: 'Скажи, что у брата тоже болит спина.', uk: 'Скажи, що в брата теж болить спина.' }, accepted: ['My brother has backache.', 'He has backache.'] },
    { id: 'l10c2-11', type: 'dialogue', grammarPoint: 'l10c2_wish', partnerLine: 'My brother has toothache.', situation: { ru: 'Брат друга заболел. Скажи, что надеешься, что он в порядке.', uk: 'Брат друга захворів. Скажи, що сподіваєшся, що він у порядку.' }, accepted: ['I hope he is well.'] },
    { id: 'l10c2-12', type: 'dialogue', grammarPoint: 'l10c2_usual', partnerLine: 'I need some foil.', situation: { ru: 'Скажи, что ты сейчас пользуешься пищевой плёнкой.', uk: 'Скажи, що ти зараз користуєшся харчовою плівкою.' }, accepted: ['I am using cling film.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c2-13', type: 'fix', grammarPoint: 'l10c2_usual', wrong: 'I usually buying tinned tomatoes.', accepted: ['I usually buy tinned tomatoes.'] },
    { id: 'l10c2-14', type: 'fix', grammarPoint: 'l10c2_have', wrong: 'She have earache.', accepted: ['She has earache.'] },
    { id: 'l10c2-15', type: 'fix', grammarPoint: 'l10c2_wish', wrong: 'I promise help.', accepted: ['I promise to help.'] },
    { id: 'l10c2-16', type: 'fix', grammarPoint: 'l10c2_ask', wrong: 'Where are the boarding gate?', accepted: ['Where is the boarding gate?'] },
  ],
};
