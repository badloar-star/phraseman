// chapter_exam_v2_l13_c5.ts — банк экзамена v2: урок 13, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–40 урока 13
// (порядок событий в прошлом: First of all…, Then…, In the end…); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C5: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l13c5_first', label: { ru: 'сначала — First of all / First', uk: 'спочатку — First of all / First' }, episodeOrdinals: [33, 35, 37] },
    { id: 'l13c5_then', label: { ru: 'потом — Then', uk: 'потім — Then' }, episodeOrdinals: [35, 37, 38] },
    { id: 'l13c5_end', label: { ru: 'в итоге — In the end', uk: 'зрештою — In the end' }, episodeOrdinals: [33, 36, 39] },
    { id: 'l13c5_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [34, 35, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c5-01', type: 'situation', grammarPoint: 'l13c5_first', situation: { ru: 'Ты рассказываешь, как искал дом. Первым делом ты проверил адрес.', uk: 'Ти розповідаєш, як шукав будинок. Насамперед ти перевірив адресу.' }, accepted: ['First of all, I checked the address.', 'First, I checked the address.', 'First I checked the address.'] },
    { id: 'l13c5-02', type: 'situation', grammarPoint: 'l13c5_then', situation: { ru: 'Продолжи рассказ: потом ты спросил соседа.', uk: 'Продовж розповідь: потім ти запитав сусіда.' }, accepted: ['Then I asked a neighbour.'] },
    { id: 'l13c5-03', type: 'situation', grammarPoint: 'l13c5_end', situation: { ru: 'Закончи рассказ: в итоге вы поехали на автобусе.', uk: 'Закінчи розповідь: зрештою ви поїхали автобусом.' }, accepted: ['In the end, we took the bus.'] },
    { id: 'l13c5-04', type: 'situation', grammarPoint: 'l13c5_first', situation: { ru: 'Расскажи, что первым делом она осмотрела магазин.', uk: 'Розкажи, що насамперед вона оглянула магазин.' }, accepted: ['First of all, she looked around the shop.'] },
    { id: 'l13c5-05', type: 'situation', grammarPoint: 'l13c5_ask', situation: { ru: 'Друг ездил за город. Спроси, рано ли он отправился в путь.', uk: 'Друг їздив за місто. Запитай, чи рано він вирушив у дорогу.' }, accepted: ['Did you set off early?'] },
    { id: 'l13c5-06', type: 'situation', grammarPoint: 'l13c5_ask', situation: { ru: 'Спроси друга, вырос ли он здесь.', uk: 'Запитай друга, чи виріс він тут.' }, accepted: ['Did you grow up here?'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c5-07', type: 'dialogue', grammarPoint: 'l13c5_first', partnerLine: 'Did you come in first?', situation: { ru: 'Скажи, что сначала ты открыл дверь.', uk: 'Скажи, що спочатку ти відчинив двері.' }, accepted: ['First I opened the door.', 'First of all, I opened the door.'] },
    { id: 'l13c5-08', type: 'dialogue', grammarPoint: 'l13c5_then', partnerLine: 'First we had lunch.', situation: { ru: 'Скажи, что потом она вышла.', uk: 'Скажи, що потім вона вийшла.' }, accepted: ['Then she came out.'] },
    { id: 'l13c5-09', type: 'dialogue', grammarPoint: 'l13c5_end', partnerLine: 'Then we moved to another town.', situation: { ru: 'Скажи, что в итоге вы хорошо ладили.', uk: 'Скажи, що зрештою ви добре ладнали.' }, accepted: ['In the end, we got along well.'] },
    { id: 'l13c5-10', type: 'dialogue', grammarPoint: 'l13c5_first', partnerLine: 'Then she joined in the game.', situation: { ru: 'Скажи, что сначала вы встретились в кафе.', uk: 'Скажи, що спочатку ви зустрілися в кафе.' }, accepted: ['First we met up at the café.'] },
    { id: 'l13c5-11', type: 'dialogue', grammarPoint: 'l13c5_then', partnerLine: 'First of all, she looked around the shop.', situation: { ru: 'Скажи, что потом ты направился к вокзалу.', uk: 'Скажи, що потім ти попрямував до вокзалу.' }, accepted: ['Then I headed for the station.'] },
    { id: 'l13c5-12', type: 'dialogue', grammarPoint: 'l13c5_end', partnerLine: 'Then I went back to the shop.', situation: { ru: 'Скажи, что в итоге ты ничего не купил.', uk: 'Скажи, що зрештою ти нічого не купив.' }, accepted: ['I didn’t buy anything in the end.', 'In the end, I didn’t buy anything.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c5-13', type: 'fix', grammarPoint: 'l13c5_ask', wrong: 'Did you looked around the shop?', accepted: ['Did you look around the shop?'] },
    { id: 'l13c5-14', type: 'fix', grammarPoint: 'l13c5_then', wrong: 'Then I go back to the shop.', accepted: ['Then I went back to the shop.'] },
    { id: 'l13c5-15', type: 'fix', grammarPoint: 'l13c5_end', wrong: 'In the end, we take the bus.', accepted: ['In the end, we took the bus.'] },
    { id: 'l13c5-16', type: 'fix', grammarPoint: 'l13c5_then', wrong: 'Then we catch up.', accepted: ['Then we caught up.'] },
  ],
};
