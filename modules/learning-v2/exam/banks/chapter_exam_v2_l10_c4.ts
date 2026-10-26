// chapter_exam_v2_l10_c4.ts — банк экзамена v2: урок 10, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–32 — когда и как часто at lunchtime / before bedtime / daily, месяцы in January …, дорога Follow me / Go straight ahead / Please enter; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C4: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l10c4_time', label: { ru: 'когда и как часто — at lunchtime, before bedtime, daily', uk: 'коли й як часто — at lunchtime, before bedtime, daily' }, episodeOrdinals: [25, 28] },
    { id: 'l10c4_months', label: { ru: 'месяцы — in January, in July …', uk: 'місяці — in January, in July …' }, episodeOrdinals: [30, 31] },
    { id: 'l10c4_way', label: { ru: 'дорога — Follow me, Go straight ahead, Please enter', uk: 'дорога — Follow me, Go straight ahead, Please enter' }, episodeOrdinals: [27, 29] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c4-01', type: 'situation', grammarPoint: 'l10c4_time', situation: { ru: 'Коллега спрашивает, когда ты гуляешь. Скажи, что в обеденный перерыв.', uk: 'Колега питає, коли ти гуляєш. Скажи, що в обідню перерву.' }, accepted: ['I walk at lunchtime.'] },
    { id: 'l10c4-02', type: 'situation', grammarPoint: 'l10c4_months', situation: { ru: 'Друг спрашивает, когда ты обычно путешествуешь. Скажи, что в июле.', uk: 'Друг питає, коли ти зазвичай подорожуєш. Скажи, що в липні.' }, accepted: ['I travel in July.'] },
    { id: 'l10c4-03', type: 'situation', grammarPoint: 'l10c4_way', situation: { ru: 'Ты ведёшь гостя по зданию. Попроси идти за тобой.', uk: 'Ти ведеш гостя будівлею. Попроси йти за тобою.' }, accepted: ['Follow me.', 'Please follow me.', 'Follow me, please.'] },
    { id: 'l10c4-04', type: 'situation', grammarPoint: 'l10c4_time', situation: { ru: 'Ты каждый вечер читаешь перед сном. Скажи это.', uk: 'Ти щовечора читаєш перед сном. Скажи це.' }, accepted: ['I read before bedtime.'] },
    { id: 'l10c4-05', type: 'situation', grammarPoint: 'l10c4_months', situation: { ru: 'Каждый август ты ездишь к друзьям. Скажи, что навещаешь друзей в августе.', uk: 'Щороку в серпні ти їздиш до друзів. Скажи, що відвідуєш друзів у серпні.' }, accepted: ['I visit my friends in August.', 'We visit our friends in August.'] },
    { id: 'l10c4-06', type: 'situation', grammarPoint: 'l10c4_way', situation: { ru: 'Турист спрашивает дорогу к станции. Скажи ему идти прямо.', uk: 'Турист питає дорогу до станції. Скажи йому йти прямо.' }, accepted: ['Go straight ahead.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c4-07', type: 'dialogue', grammarPoint: 'l10c4_time', partnerLine: 'I work in the daytime.', situation: { ru: 'Скажи, что ты в полночь уже спишь.', uk: 'Скажи, що ти опівночі вже спиш.' }, accepted: ['I am asleep at midnight.'] },
    { id: 'l10c4-08', type: 'dialogue', grammarPoint: 'l10c4_months', partnerLine: 'We meet in February.', situation: { ru: 'Скажи, что вы встречаетесь в январе.', uk: 'Скажи, що ви зустрічаєтеся в січні.' }, accepted: ['We meet in January.'] },
    { id: 'l10c4-09', type: 'dialogue', grammarPoint: 'l10c4_way', partnerLine: 'This is the station.', situation: { ru: 'Скажи, что вы доберётесь до станции в девять.', uk: 'Скажи, що ви дістанетеся станції о дев’ятій.' }, accepted: ['We reach the station at nine.'] },
    { id: 'l10c4-10', type: 'dialogue', grammarPoint: 'l10c4_time', partnerLine: 'I am working tonight.', situation: { ru: 'Скажи, что ты гуляешь каждый день.', uk: 'Скажи, що ти гуляєш щодня.' }, accepted: ['I walk daily.'] },
    { id: 'l10c4-11', type: 'dialogue', grammarPoint: 'l10c4_months', partnerLine: 'I usually stay home in October.', situation: { ru: 'Скажи, что ты плаваешь в июне.', uk: 'Скажи, що ти плаваєш у червні.' }, accepted: ['I swim in June.'] },
    { id: 'l10c4-12', type: 'dialogue', grammarPoint: 'l10c4_way', partnerLine: 'I am here.', situation: { ru: 'Гость стоит у двери. Пригласи его войти.', uk: 'Гість стоїть біля дверей. Запроси його ввійти.' }, accepted: ['Please enter.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c4-13', type: 'fix', grammarPoint: 'l10c4_time', wrong: 'I walk in lunchtime.', accepted: ['I walk at lunchtime.'] },
    { id: 'l10c4-14', type: 'fix', grammarPoint: 'l10c4_months', wrong: 'I travel on July.', accepted: ['I travel in July.'] },
    { id: 'l10c4-15', type: 'fix', grammarPoint: 'l10c4_way', wrong: 'Follows me.', accepted: ['Follow me.'] },
    { id: 'l10c4-16', type: 'fix', grammarPoint: 'l10c4_time', wrong: 'I am asleep in midnight.', accepted: ['I am asleep at midnight.'] },
  ],
};
