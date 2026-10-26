// chapter_exam_v2_l03_c4.ts — банк экзамена v2: урок 3, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 4 урока 3 вводит this (вещь рядом) и that (вещь
// далеко) — This is a … / That is a … / Is this a …? / This is not a … (25–32). Ситуация всегда говорит, близко вещь или далеко.
// Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C4: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l03c4_this', label: { ru: 'рядом — This is a …', uk: 'поруч — This is a …' }, episodeOrdinals: [25, 28, 30] },
    { id: 'l03c4_that', label: { ru: 'далеко — That is a …', uk: 'далеко — That is a …' }, episodeOrdinals: [26, 28, 31] },
    { id: 'l03c4_question_not', label: { ru: 'Is this / that a …? и not', uk: 'Is this / that a …? і not' }, episodeOrdinals: [27, 29, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c4-01', type: 'situation', grammarPoint: 'l03c4_this', situation: { ru: 'Гость ищет, чем зарядить телефон. Протяни ему зарядку и скажи, что это зарядка.', uk: 'Гість шукає, чим зарядити телефон. Простягни йому зарядний і скажи, що це зарядний пристрій.' }, accepted: ['This is a charger.'] },
    { id: 'l03c4-02', type: 'situation', grammarPoint: 'l03c4_that', situation: { ru: 'На дальней стене зала висит большой белый прямоугольник. Покажи на него: то — экран.', uk: 'На дальній стіні зали висить великий білий прямокутник. Покажи на нього: то — екран.' }, accepted: ['That is a screen.'] },
    { id: 'l03c4-03', type: 'situation', grammarPoint: 'l03c4_question_not', situation: { ru: 'В тёмной комнате на дальней стене белеет квадратик. Спроси, выключатель ли то.', uk: 'У темній кімнаті на дальній стіні біліє квадратик. Запитай, чи то вимикач.' }, accepted: ['Is that a switch?'] },
    { id: 'l03c4-04', type: 'situation', grammarPoint: 'l03c4_this', situation: { ru: 'В магазине ты снял с вешалки вязаную вещь. Покажи подруге: это свитер.', uk: 'У магазині ти зняв із вішака в’язану річ. Покажи подрузі: це светр.' }, accepted: ['This is a sweater.'] },
    { id: 'l03c4-05', type: 'situation', grammarPoint: 'l03c4_that', situation: { ru: 'Друг спрашивает, куда бросить письмо. Покажи на синий ящик у дальнего подъезда: то — почтовый ящик.', uk: 'Друг питає, куди кинути лист. Покажи на синю скриньку біля дальнього під’їзду: то — поштова скринька.' }, accepted: ['That is a mailbox.'] },
    { id: 'l03c4-06', type: 'situation', grammarPoint: 'l03c4_question_not', situation: { ru: 'Ты держишь в руке чёрную коробочку с кнопками. Спроси, пульт ли это.', uk: 'Ти тримаєш у руці чорну коробочку з кнопками. Запитай, чи це пульт.' }, accepted: ['Is this a remote?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c4-07', type: 'dialogue', grammarPoint: 'l03c4_this', partnerLine: 'Is that a backpack?', situation: { ru: 'Нет, рядом с тобой стоит чемодан на колёсах. Скажи, что это чемодан.', uk: 'Ні, поруч із тобою стоїть валіза на колесах. Скажи, що це валіза.' }, accepted: ['This is a suitcase.'] },
    { id: 'l03c4-08', type: 'dialogue', grammarPoint: 'l03c4_that', partnerLine: 'This is a speaker.', situation: { ru: 'Покажи на аппарат в конце зала: а то — проектор.', uk: 'Покажи на апарат у кінці зали: а то — проектор.' }, accepted: ['That is a projector.'] },
    { id: 'l03c4-09', type: 'dialogue', grammarPoint: 'l03c4_question_not', partnerLine: 'That is not a scarf.', situation: { ru: 'На дальней полке лежит что-то шерстяное с пальцами. Спроси, перчатка ли то.', uk: 'На дальній полиці лежить щось вовняне з пальцями. Запитай, чи то рукавичка.' }, accepted: ['Is that a glove?'] },
    { id: 'l03c4-10', type: 'dialogue', grammarPoint: 'l03c4_this', partnerLine: 'That is a cable.', situation: { ru: 'Возрази: у тебя в руке не провод, а переходник.', uk: 'Заперечи: у тебе в руці не дріт, а перехідник.' }, accepted: ['This is an adapter.', 'This is not a cable.'] },
    { id: 'l03c4-11', type: 'dialogue', grammarPoint: 'l03c4_that', partnerLine: 'This is a hat.', situation: { ru: 'Покажи на дальнюю полку: а то — ремень.', uk: 'Покажи на дальню полицю: а то — ремінь.' }, accepted: ['That is a belt.'] },
    { id: 'l03c4-12', type: 'dialogue', grammarPoint: 'l03c4_question_not', partnerLine: 'This is a parcel.', situation: { ru: 'У тебя в руке тонкий конверт. Возрази: это не посылка.', uk: 'У тебе в руці тонкий конверт. Заперечи: це не посилка.' }, accepted: ['This is not a parcel.', 'This is a letter.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c4-13', type: 'fix', grammarPoint: 'l03c4_this', wrong: 'This are a lamp.', accepted: ['This is a lamp.'] },
    { id: 'l03c4-14', type: 'fix', grammarPoint: 'l03c4_that', wrong: 'That is a umbrella.', accepted: ['That is an umbrella.'] },
    { id: 'l03c4-15', type: 'fix', grammarPoint: 'l03c4_question_not', wrong: 'This is a button?', accepted: ['Is this a button?'] },
    { id: 'l03c4-16', type: 'fix', grammarPoint: 'l03c4_question_not', wrong: 'This not is a magnet.', accepted: ['This is not a magnet.'] },
  ],
};
