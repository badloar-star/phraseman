// chapter_exam_v2_l11_c7.ts — банк экзамена v2: урок 11, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–56 — раньше и теперь was last year / is now, оценка That was a silly idea / The rules were fair, вежливо Take your time / After you / That's all; вопросы Was / Were…? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C7: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l11c7_then', label: { ru: 'раньше и теперь — was last year, is now', uk: 'раніше й тепер — was last year, is now' }, episodeOrdinals: [50, 51] },
    { id: 'l11c7_opinion', label: { ru: 'оценка — That was a silly idea, The rules were fair', uk: 'оцінка — That was a silly idea, The rules were fair' }, episodeOrdinals: [53] },
    { id: 'l11c7_polite', label: { ru: "вежливо — Take your time, After you, That's all", uk: "ввічливо — Take your time, After you, That's all" }, episodeOrdinals: [56] },
    { id: 'l11c7_ask', label: { ru: 'спросить о прошлом — Was / Were…?', uk: 'запитати про минуле — Was / Were…?' }, episodeOrdinals: [51, 53] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c7-01', type: 'situation', grammarPoint: 'l11c7_then', situation: { ru: 'Ты рассказываешь новости семьи. Скажи, что сестра в прошлом году была беременна.', uk: 'Ти розповідаєш новини родини. Скажи, що сестра минулого року була вагітна.' }, accepted: ['My sister was pregnant last year.'] },
    { id: 'l11c7-02', type: 'situation', grammarPoint: 'l11c7_opinion', situation: { ru: 'Друг предложил купаться в реке в ноябре. Скажи, что это была глупая идея.', uk: 'Друг запропонував купатися в річці в листопаді. Скажи, що це була дурна ідея.' }, accepted: ['That was a silly idea.'] },
    { id: 'l11c7-03', type: 'situation', grammarPoint: 'l11c7_polite', situation: { ru: 'Гость долго выбирает блюдо и извиняется. Скажи ему, чтобы не спешил.', uk: 'Гість довго обирає страву й перепрошує. Скажи йому, щоб не поспішав.' }, accepted: ['Take your time.'] },
    { id: 'l11c7-04', type: 'situation', grammarPoint: 'l11c7_then', situation: { ru: 'Ты рассказываешь о брате. Скажи, что в прошлом году он был без работы.', uk: 'Ти розповідаєш про брата. Скажи, що минулого року він був без роботи.' }, accepted: ['My brother was unemployed last year.'] },
    { id: 'l11c7-05', type: 'situation', grammarPoint: 'l11c7_ask', situation: { ru: 'Команда спорит после игры. Спроси, было ли правило честным.', uk: 'Команда сперечається після гри. Запитай, чи було правило чесним.' }, accepted: ['Was the rule fair?'] },
    { id: 'l11c7-06', type: 'situation', grammarPoint: 'l11c7_polite', situation: { ru: 'Вы с соседкой одновременно подошли к двери. Пропусти её вперёд.', uk: 'Ви із сусідкою одночасно підійшли до дверей. Пропусти її вперед.' }, accepted: ['After you.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c7-07', type: 'dialogue', grammarPoint: 'l11c7_then', partnerLine: 'My father was retired.', situation: { ru: 'Скажи, что твои родители на пенсии.', uk: 'Скажи, що твої батьки на пенсії.' }, accepted: ['My parents are retired.'] },
    { id: 'l11c7-08', type: 'dialogue', grammarPoint: 'l11c7_opinion', partnerLine: 'We are talking about the plan.', situation: { ru: 'Скажи, что это была разумная идея.', uk: 'Скажи, що це була розумна ідея.' }, accepted: ['That was a sensible idea.'] },
    { id: 'l11c7-09', type: 'dialogue', grammarPoint: 'l11c7_polite', partnerLine: 'Here is your coffee.', situation: { ru: 'Официант принёс кофе. Скажи, что больше ничего не нужно, спасибо.', uk: 'Офіціант приніс каву. Скажи, що більше нічого не треба, дякую.' }, accepted: ["That's all, thank you.", "That's all."] },
    { id: 'l11c7-10', type: 'dialogue', grammarPoint: 'l11c7_then', partnerLine: 'I work part-time.', situation: { ru: 'Скажи, что сестра работает полный день.', uk: 'Скажи, що сестра працює повний день.' }, accepted: ['My sister works full-time.'] },
    { id: 'l11c7-11', type: 'dialogue', grammarPoint: 'l11c7_ask', partnerLine: 'The rules were fair.', situation: { ru: 'Подруга пришла с работы уставшей. Спроси, была ли дневная смена длинной.', uk: 'Подруга прийшла з роботи втомленою. Запитай, чи була денна зміна довгою.' }, accepted: ['Was the day shift long?'] },
    { id: 'l11c7-12', type: 'dialogue', grammarPoint: 'l11c7_polite', partnerLine: 'The room is hot.', situation: { ru: 'Сосед хочет открыть окно. Скажи, что ты не против.', uk: 'Сусід хоче відчинити вікно. Скажи, що ти не проти.' }, accepted: ["I don't mind.", 'I do not mind.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c7-13', type: 'fix', grammarPoint: 'l11c7_then', wrong: 'My sister were pregnant last year.', accepted: ['My sister was pregnant last year.'] },
    { id: 'l11c7-14', type: 'fix', grammarPoint: 'l11c7_opinion', wrong: 'That were a silly idea.', accepted: ['That was a silly idea.'] },
    { id: 'l11c7-15', type: 'fix', grammarPoint: 'l11c7_polite', wrong: 'Take you time.', accepted: ['Take your time.'] },
    { id: 'l11c7-16', type: 'fix', grammarPoint: 'l11c7_ask', wrong: 'Was the rules unfair?', accepted: ['Were the rules unfair?'] },
  ],
};
