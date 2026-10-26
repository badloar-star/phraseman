// chapter_exam_v2_l11_c5.ts — банк экзамена v2: урок 11, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–40 — там было there was / there were, каким было was wet / was off / was not empty, где было on the ground floor / in my bag; вопросы Was / Were…? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C5: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l11c5_there', label: { ru: 'там было — there was, there were', uk: 'там було — there was, there were' }, episodeOrdinals: [33, 35, 37] },
    { id: 'l11c5_state', label: { ru: 'каким было — was wet, was off, was not empty', uk: 'яким було — was wet, was off, was not empty' }, episodeOrdinals: [33, 34, 36] },
    { id: 'l11c5_where', label: { ru: 'где было — on the ground floor, in my bag', uk: 'де було — on the ground floor, in my bag' }, episodeOrdinals: [38, 39, 40] },
    { id: 'l11c5_ask', label: { ru: 'спросить о прошлом — Was / Were…?', uk: 'запитати про минуле — Was / Were…?' }, episodeOrdinals: [34, 36, 37] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c5-01', type: 'situation', grammarPoint: 'l11c5_there', situation: { ru: 'Гость спрашивает про полотенце. Скажи, что у умывальника было маленькое полотенце.', uk: 'Гість питає про рушник. Скажи, що біля умивальника був маленький рушник.' }, accepted: ['There was a hand towel next to the washbasin.'] },
    { id: 'l11c5-02', type: 'situation', grammarPoint: 'l11c5_state', situation: { ru: 'Утром банное полотенце не высохло. Скажи, что оно было мокрым.', uk: 'Уранці банний рушник не висох. Скажи, що він був мокрим.' }, accepted: ['The bath towel was wet.'] },
    { id: 'l11c5-03', type: 'situation', grammarPoint: 'l11c5_where', situation: { ru: 'Тебя спрашивают о квартире, где ты жил. Скажи, что ванная была на первом этаже.', uk: 'Тебе питають про квартиру, де ти жив. Скажи, що ванна була на першому поверсі.' }, accepted: ['The bathroom was on the ground floor.'] },
    { id: 'l11c5-04', type: 'situation', grammarPoint: 'l11c5_there', situation: { ru: 'После гостей ты убирал со стола. Скажи, что на нём стояли две кофейные чашки.', uk: 'Після гостей ти прибирав зі столу. Скажи, що на ньому стояли дві кавові чашки.' }, accepted: ['There were two coffee cups on the table.'] },
    { id: 'l11c5-05', type: 'situation', grammarPoint: 'l11c5_ask', situation: { ru: 'Утром в комнате было светло. Спроси, был ли включён потолочный свет.', uk: 'Уранці в кімнаті було світло. Запитай, чи було ввімкнене стельове світло.' }, accepted: ['Was the ceiling light on?'] },
    { id: 'l11c5-06', type: 'situation', grammarPoint: 'l11c5_where', situation: { ru: 'Ты не нашёл карту в сумке. Скажи, что её не было в сумке.', uk: 'Ти не знайшов картку в сумці. Скажи, що її не було в сумці.' }, accepted: ['My bank card was not in my bag.', "My bank card wasn't in my bag."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c5-07', type: 'dialogue', grammarPoint: 'l11c5_there', partnerLine: 'The single bed was near the window.', situation: { ru: 'Скажи, что рядом с кроватью был будильник.', uk: 'Скажи, що біля ліжка був будильник.' }, accepted: ['There was an alarm clock next to the bed.'] },
    { id: 'l11c5-08', type: 'dialogue', grammarPoint: 'l11c5_state', partnerLine: 'The shower curtain was wet.', situation: { ru: 'Скажи, что сейчас она сухая.', uk: 'Скажи, що зараз вона суха.' }, accepted: ['The shower curtain is dry now.'] },
    { id: 'l11c5-09', type: 'dialogue', grammarPoint: 'l11c5_where', partnerLine: 'The front door was open.', situation: { ru: 'Скажи, что задняя дверь не была закрыта.', uk: 'Скажи, що задні двері не були зачинені.' }, accepted: ['The back door was not closed.', "The back door wasn't closed."] },
    { id: 'l11c5-10', type: 'dialogue', grammarPoint: 'l11c5_there', partnerLine: 'The tea bag was on the plate.', situation: { ru: 'Скажи, что в чашке был чайный пакетик.', uk: 'Скажи, що в чашці був чайний пакетик.' }, accepted: ['There was a tea bag in the cup.'] },
    { id: 'l11c5-11', type: 'dialogue', grammarPoint: 'l11c5_ask', partnerLine: 'The sugar bowl was near the window.', situation: { ru: 'Спроси, была ли сахарница полной.', uk: 'Запитай, чи була цукорниця повною.' }, accepted: ['Was the sugar bowl full?'] },
    { id: 'l11c5-12', type: 'dialogue', grammarPoint: 'l11c5_where', partnerLine: 'The chicken soup was not cold.', situation: { ru: 'Скажи, что куриный суп был на кухне.', uk: 'Скажи, що курячий суп був на кухні.' }, accepted: ['The chicken soup was in the kitchen.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c5-13', type: 'fix', grammarPoint: 'l11c5_there', wrong: 'There were a tea bag in the cup.', accepted: ['There was a tea bag in the cup.'] },
    { id: 'l11c5-14', type: 'fix', grammarPoint: 'l11c5_state', wrong: 'The bath towel were wet.', accepted: ['The bath towel was wet.'] },
    { id: 'l11c5-15', type: 'fix', grammarPoint: 'l11c5_where', wrong: 'The bathroom was in the ground floor.', accepted: ['The bathroom was on the ground floor.'] },
    { id: 'l11c5-16', type: 'fix', grammarPoint: 'l11c5_ask', wrong: 'Were the shower curtain dry?', accepted: ['Was the shower curtain dry?'] },
  ],
};
