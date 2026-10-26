// chapter_exam_v2_l08_c7.ts — банк экзамена v2: урок 8, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–56 — предложить помощь I can / we can, сам справляется (get dressed, brush, comb),
// предел возможностей I can't; вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C7: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l08c7_help', label: { ru: 'предложить помощь — I can / we can', uk: 'запропонувати допомогу — I can / we can' }, episodeOrdinals: [50, 51, 52] },
    { id: 'l08c7_self', label: { ru: 'сам справляется — get dressed, brush, comb', uk: 'сам дає раду — get dressed, brush, comb' }, episodeOrdinals: [53] },
    { id: 'l08c7_limit', label: { ru: 'не справляюсь — I can\'t', uk: 'не даю ради — I can\'t' }, episodeOrdinals: [52, 54] },
    { id: 'l08c7_ask', label: { ru: 'попросить — Can you…?', uk: 'попросити — Can you…?' }, episodeOrdinals: [51, 52, 54, 55] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c7-01', type: 'situation', grammarPoint: 'l08c7_help', situation: { ru: 'Спорят, когда построили старый мост. Скажи, что можешь это выяснить.', uk: 'Сперечаються, коли збудували старий міст. Скажи, що можеш це з’ясувати.' }, accepted: ['I can research it.', 'I can verify the date.'] },
    { id: 'l08c7-02', type: 'situation', grammarPoint: 'l08c7_help', situation: { ru: 'Команда не может выбрать чемодан. Скажи, что вы можете выбрать критерий.', uk: 'Команда не може вибрати валізу. Скажи, що ви можете вибрати критерій.' }, accepted: ['We can choose a criterion.'] },
    { id: 'l08c7-03', type: 'situation', grammarPoint: 'l08c7_self', situation: { ru: 'Сын впервые хочет одеться сам. Скажи ему, что он может одеться.', uk: 'Син уперше хоче одягнутися сам. Скажи йому, що він може одягнутися.' }, accepted: ['You can get dressed.'] },
    { id: 'l08c7-04', type: 'situation', grammarPoint: 'l08c7_limit', situation: { ru: 'Задач стало слишком много. Скажи, что ты не справляешься с нагрузкой.', uk: 'Завдань стало забагато. Скажи, що ти не даєш ради з навантаженням.' }, accepted: ["I can't manage the workload.", 'I cannot manage the workload.'] },
    { id: 'l08c7-05', type: 'situation', grammarPoint: 'l08c7_ask', situation: { ru: 'Ты не уверен в своём тексте. Попроси наставника дать тебе отзыв.', uk: 'Ти не впевнений у своєму тексті. Попроси наставника дати тобі відгук.' }, accepted: ['Can you give me feedback?'] },
    { id: 'l08c7-06', type: 'situation', grammarPoint: 'l08c7_self', situation: { ru: 'Дочка хвастается, что умеет причёсываться сама. Скажи это за неё по-английски.', uk: 'Донька хвалиться, що вміє зачісуватися сама. Скажи це за неї англійською.' }, accepted: ['I can comb my hair.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c7-07', type: 'dialogue', grammarPoint: 'l08c7_limit', partnerLine: 'Can you solve the riddle?', situation: { ru: 'Загадка у костра. Скажи, что ты её разгадать не можешь.', uk: 'Загадка біля багаття. Скажи, що ти її розгадати не можеш.' }, accepted: ["I can't solve the riddle.", "I can't solve it.", 'I cannot solve the riddle.'] },
    { id: 'l08c7-08', type: 'dialogue', grammarPoint: 'l08c7_ask', partnerLine: 'He is reluctant.', situation: { ru: 'Сосед упрямится. Спроси подругу, может ли она его успокоить.', uk: 'Сусід упирається. Запитай подругу, чи може вона його заспокоїти.' }, accepted: ['Can you reassure him?'] },
    { id: 'l08c7-09', type: 'dialogue', grammarPoint: 'l08c7_self', partnerLine: 'I can get dressed.', situation: { ru: 'Сын уже оделся. Скажи, что он может и почистить зубы.', uk: 'Син уже одягнувся. Скажи, що він може й почистити зуби.' }, accepted: ['You can brush your teeth.'] },
    { id: 'l08c7-10', type: 'dialogue', grammarPoint: 'l08c7_help', partnerLine: 'He is reluctant.', situation: { ru: 'Сосед не хочет возвращать стакан. Скажи, что можешь его уговорить.', uk: 'Сусід не хоче повертати склянку. Скажи, що можеш його вмовити.' }, accepted: ['I can persuade him.', 'I can reassure him.'] },
    { id: 'l08c7-11', type: 'dialogue', grammarPoint: 'l08c7_limit', partnerLine: 'We can clear the backlog.', situation: { ru: 'Скажи, что ты сам со списком не справишься.', uk: 'Скажи, що ти сам зі списком не впораєшся.' }, accepted: ["I can't manage the list.", 'I cannot manage the list.'] },
    { id: 'l08c7-12', type: 'dialogue', grammarPoint: 'l08c7_self', partnerLine: 'I can wash my face.', situation: { ru: 'Скажи, что Том тоже умеет сам одеваться.', uk: 'Скажи, що Том теж уміє сам одягатися.' }, accepted: ['Tom can get dressed.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c7-13', type: 'fix', grammarPoint: 'l08c7_help', wrong: 'I can improves it.', accepted: ['I can improve it.'] },
    { id: 'l08c7-14', type: 'fix', grammarPoint: 'l08c7_self', wrong: 'You can brushes your teeth.', accepted: ['You can brush your teeth.'] },
    { id: 'l08c7-15', type: 'fix', grammarPoint: 'l08c7_limit', wrong: "I can't to solve it.", accepted: ["I can't solve it.", 'I cannot solve it.'] },
    { id: 'l08c7-16', type: 'fix', grammarPoint: 'l08c7_ask', wrong: 'Can you solves it?', accepted: ['Can you solve it?'] },
  ],
};
