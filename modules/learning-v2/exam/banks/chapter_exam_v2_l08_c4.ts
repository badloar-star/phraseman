// chapter_exam_v2_l08_c4.ts — банк экзамена v2: урок 8, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–32 — короткое указание глаголом в начале, смягчение Please, Check the …;
// вопросы из эпизодов — со знаком «?» (запрет «?» только для урока 1). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C4: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l08c4_do', label: { ru: 'указание — действие в начале', uk: 'вказівка — дія на початку' }, episodeOrdinals: [26, 29, 31] },
    { id: 'l08c4_please', label: { ru: 'мягче — Please + указание', uk: 'м’якше — Please + вказівка' }, episodeOrdinals: [25] },
    { id: 'l08c4_check', label: { ru: 'проверить — Check the …', uk: 'перевірити — Check the …' }, episodeOrdinals: [27, 28, 30] },
    { id: 'l08c4_ask', label: { ru: 'попросить и спросить — Can you…? / Where is…?', uk: 'попросити й запитати — Can you…? / Where is…?' }, episodeOrdinals: [26, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c4-01', type: 'situation', grammarPoint: 'l08c4_do', situation: { ru: 'В спальне сухой воздух. Попроси соседа включить увлажнитель в розетку.', uk: 'У спальні сухе повітря. Попроси сусіда ввімкнути зволожувач у розетку.' }, accepted: ['Plug in the humidifier.', 'Please plug in the humidifier.'] },
    { id: 'l08c4-02', type: 'situation', grammarPoint: 'l08c4_please', situation: { ru: 'Ты пишешь мужу список покупок — нужно обезжиренное молоко. Вежливо попроси его купить.', uk: 'Ти пишеш чоловікові список покупок — потрібне знежирене молоко. Ввічливо попроси його купити.' }, accepted: ['Please buy skimmed milk.', 'Buy skimmed milk, please.'] },
    { id: 'l08c4-03', type: 'situation', grammarPoint: 'l08c4_do', situation: { ru: 'Вы выбираете стол в маленькую комнату. Попроси друга измерить ширину.', uk: 'Ви обираєте стіл у маленьку кімнату. Попроси друга виміряти ширину.' }, accepted: ['Measure the width.', 'Please measure the width.'] },
    { id: 'l08c4-04', type: 'situation', grammarPoint: 'l08c4_check', situation: { ru: 'Перед отправкой посылки попроси проверить город назначения.', uk: 'Перед відправленням посилки попроси перевірити місто призначення.' }, accepted: ['Check the destination.', 'Please check the destination.'] },
    { id: 'l08c4-05', type: 'situation', grammarPoint: 'l08c4_ask', situation: { ru: 'Удлинитель лежит у коллеги. Попроси передать его тебе.', uk: 'Подовжувач лежить у колеги. Попроси передати його тобі.' }, accepted: ['Can you pass me the extension lead?'] },
    { id: 'l08c4-06', type: 'situation', grammarPoint: 'l08c4_check', situation: { ru: 'Перед репетицией попроси проверить индикатор заряда на колонке.', uk: 'Перед репетицією попроси перевірити індикатор заряду на колонці.' }, accepted: ['Check the indicator.', 'Please check the indicator.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c4-07', type: 'dialogue', grammarPoint: 'l08c4_do', partnerLine: 'The power bank is here.', situation: { ru: 'Впереди ночной поезд. Попроси зарядить пауэрбанк.', uk: 'Попереду нічний потяг. Попроси зарядити павербанк.' }, accepted: ['Charge the power bank.', 'Charge it.', 'Please charge the power bank.'] },
    { id: 'l08c4-08', type: 'dialogue', grammarPoint: 'l08c4_please', partnerLine: 'I can buy yoghurt.', situation: { ru: 'Вежливо попроси купить нежирный йогурт.', uk: 'Ввічливо попроси купити нежирний йогурт.' }, accepted: ['Please buy low-fat yoghurt.', 'Buy low-fat yoghurt, please.'] },
    { id: 'l08c4-09', type: 'dialogue', grammarPoint: 'l08c4_check', partnerLine: 'I can label it.', situation: { ru: 'Перед тем как подписать коробку, попроси проверить, что в ней.', uk: 'Перед тим як підписати коробку, попроси перевірити, що в ній.' }, accepted: ['Check the contents.', 'Please check the contents.'] },
    { id: 'l08c4-10', type: 'dialogue', grammarPoint: 'l08c4_ask', partnerLine: 'Where is the laminator?', situation: { ru: 'Ламинатор стоит рядом с тобой. Скажи, что он здесь.', uk: 'Ламінатор стоїть поруч із тобою. Скажи, що він тут.' }, accepted: ['The laminator is here.'] },
    { id: 'l08c4-11', type: 'dialogue', grammarPoint: 'l08c4_check', partnerLine: 'I can charge your phone.', situation: { ru: 'Попроси сначала проверить процент заряда батареи.', uk: 'Попроси спершу перевірити відсоток заряду батареї.' }, accepted: ['Check the battery percentage.', 'Please check the battery percentage.'] },
    { id: 'l08c4-12', type: 'dialogue', grammarPoint: 'l08c4_please', partnerLine: 'I can turn on the shredder.', situation: { ru: 'Вежливо попроси включить его.', uk: 'Ввічливо попроси ввімкнути його.' }, accepted: ['Please turn on the shredder.', 'Turn on the shredder, please.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c4-13', type: 'fix', grammarPoint: 'l08c4_do', wrong: 'Plugs it in.', accepted: ['Plug it in.'] },
    { id: 'l08c4-14', type: 'fix', grammarPoint: 'l08c4_please', wrong: 'Buy please skimmed milk.', accepted: ['Please buy skimmed milk.', 'Buy skimmed milk, please.'] },
    { id: 'l08c4-15', type: 'fix', grammarPoint: 'l08c4_check', wrong: 'Checks the postage.', accepted: ['Check the postage.'] },
    { id: 'l08c4-16', type: 'fix', grammarPoint: 'l08c4_ask', wrong: 'Where the laminator is?', accepted: ['Where is the laminator?'] },
  ],
};
