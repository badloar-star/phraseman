// chapter_exam_v2_l10_c5.ts — банк экзамена v2: урок 10, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–40 — лицо и руки My lips are dry / Your chin is wet, где вещи underneath / against / somewhere / nothing, сейчас и всё ещё We are having fun / It is still raining; вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C5: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l10c5_body', label: { ru: 'лицо и руки — My lips are dry, Your chin is wet', uk: 'обличчя й руки — My lips are dry, Your chin is wet' }, episodeOrdinals: [33] },
    { id: 'l10c5_where', label: { ru: 'где вещи — underneath, against, somewhere, nothing', uk: 'де речі — underneath, against, somewhere, nothing' }, episodeOrdinals: [37, 38] },
    { id: 'l10c5_still', label: { ru: 'сейчас и всё ещё — We are having fun, It is still raining', uk: 'зараз і досі — We are having fun, It is still raining' }, episodeOrdinals: [35, 36] },
    { id: 'l10c5_ask', label: { ru: 'спросить — Do you need…? / Is anyone…?', uk: 'запитати — Do you need…? / Is anyone…?' }, episodeOrdinals: [38, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c5-01', type: 'situation', grammarPoint: 'l10c5_body', situation: { ru: 'Малыш умылся и не вытерся. Скажи ему, что у него мокрый подбородок.', uk: 'Малюк умився й не витерся. Скажи йому, що в нього мокре підборіддя.' }, accepted: ['Your chin is wet.'] },
    { id: 'l10c5-02', type: 'situation', grammarPoint: 'l10c5_where', situation: { ru: 'Ключи нашлись под стулом. Скажи, где они.', uk: 'Ключі знайшлися під стільцем. Скажи, де вони.' }, accepted: ['The keys are underneath the chair.'] },
    { id: 'l10c5-03', type: 'situation', grammarPoint: 'l10c5_still', situation: { ru: 'Пикник под угрозой — за окном всё ещё дождь. Скажи, что дождь всё ещё идёт.', uk: 'Пікнік під загрозою — за вікном досі дощ. Скажи, що дощ досі йде.' }, accepted: ['It is still raining.'] },
    { id: 'l10c5-04', type: 'situation', grammarPoint: 'l10c5_body', situation: { ru: 'Зимой ты всё время мажешь губы бальзамом. Объясни: у тебя сухие губы.', uk: 'Узимку ти весь час мажеш губи бальзамом. Поясни: у тебе сухі губи.' }, accepted: ['My lips are dry.'] },
    { id: 'l10c5-05', type: 'situation', grammarPoint: 'l10c5_ask', situation: { ru: 'В кафе рядом с незнакомцем свободный стул. Спроси, не занят ли он.', uk: 'У кафе поруч із незнайомцем вільний стілець. Запитай, чи не зайнятий він.' }, accepted: ['Is anyone sitting here?'] },
    { id: 'l10c5-06', type: 'situation', grammarPoint: 'l10c5_still', situation: { ru: 'На семейном празднике всем весело. Скажи, что вы веселитесь.', uk: 'На родинному святі всім весело. Скажи, що ви веселитеся.' }, accepted: ['We are having fun.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c5-07', type: 'dialogue', grammarPoint: 'l10c5_body', partnerLine: 'My chin is clean.', situation: { ru: 'Скажи, что у него грязная щека.', uk: 'Скажи, що в нього брудна щока.' }, accepted: ['Your cheek is dirty.'] },
    { id: 'l10c5-08', type: 'dialogue', grammarPoint: 'l10c5_where', partnerLine: 'I need the ladder.', situation: { ru: 'Скажи, что лестница стоит у стены.', uk: 'Скажи, що драбина стоїть біля стіни.' }, accepted: ['The ladder is against the wall.'] },
    { id: 'l10c5-09', type: 'dialogue', grammarPoint: 'l10c5_still', partnerLine: 'We usually eat outdoors.', situation: { ru: 'Сегодня холодно. Скажи, что вы едите в доме.', uk: 'Сьогодні холодно. Скажи, що ви їсте в будинку.' }, accepted: ['We are eating indoors.', 'We are eating indoors today.'] },
    { id: 'l10c5-10', type: 'dialogue', grammarPoint: 'l10c5_body', partnerLine: 'My thumb is dirty.', situation: { ru: 'Скажи, что твой большой палец чистый.', uk: 'Скажи, що твій великий палець чистий.' }, accepted: ['My thumb is clean.'] },
    { id: 'l10c5-11', type: 'dialogue', grammarPoint: 'l10c5_ask', partnerLine: 'The bag is ready.', situation: { ru: 'Ты идёшь в магазин. Спроси друга, нужно ли ему что-нибудь.', uk: 'Ти йдеш у магазин. Запитай друга, чи потрібно йому щось.' }, accepted: ['Do you need anything?'] },
    { id: 'l10c5-12', type: 'dialogue', grammarPoint: 'l10c5_still', partnerLine: 'The children are playing.', situation: { ru: 'Скажи, что он всё ещё спит.', uk: 'Скажи, що він досі спить.' }, accepted: ['He is still sleeping.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c5-13', type: 'fix', grammarPoint: 'l10c5_body', wrong: 'My lips is dry.', accepted: ['My lips are dry.'] },
    { id: 'l10c5-14', type: 'fix', grammarPoint: 'l10c5_where', wrong: 'The keys are underneath of the chair.', accepted: ['The keys are underneath the chair.'] },
    { id: 'l10c5-15', type: 'fix', grammarPoint: 'l10c5_still', wrong: 'It still is raining.', accepted: ['It is still raining.'] },
    { id: 'l10c5-16', type: 'fix', grammarPoint: 'l10c5_ask', wrong: 'Is anyone sit here?', accepted: ['Is anyone sitting here?'] },
  ],
};
