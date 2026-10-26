// chapter_exam_v2_l23_c1.ts — банк экзамена v2: урок 23, глава 1 (эпизоды 1–8).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–8 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 1 — have / has + третья форма о том, что уже сделано (эпизоды 1–8). «Not», «already», «yet» и вопросы ещё не проходили.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C1: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l23c1_i_we_have', label: { ru: 'я / мы — I have, we have', uk: 'я / ми — I have, we have' }, episodeOrdinals: [1, 2, 3] },
    { id: 'l23c1_she_he_has', label: { ru: 'он / она — he has, she has', uk: 'він / вона — he has, she has' }, episodeOrdinals: [1, 4, 5] },
    { id: 'l23c1_things_have', label: { ru: 'вещи и люди — The bride has, my keys have', uk: 'речі й люди — The bride has, my keys have' }, episodeOrdinals: [6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c1-01', type: 'situation', grammarPoint: 'l23c1_i_we_have', situation: { ru: 'Ты пересчитал билеты на концерт и понял, что ошибся. Признайся в этом.', uk: 'Ти перерахував квитки на концерт і зрозумів, що помилився. Зізнайся в цьому.' }, accepted: ['I have miscounted the tickets.'] },
    { id: 'l23c1-02', type: 'situation', grammarPoint: 'l23c1_i_we_have', situation: { ru: 'Вы с мужем закончили ремонт спальни. Похвастайся подруге.', uk: 'Ви з чоловіком закінчили ремонт спальні. Похвалися подрузі.' }, accepted: ['We have redecorated the bedroom.', 'We have redecorated our bedroom.'] },
    { id: 'l23c1-03', type: 'situation', grammarPoint: 'l23c1_she_he_has', situation: { ru: 'Подруга набрала не тот номер и попала к незнакомцу. Объясни коллеге, что случилось.', uk: 'Подруга набрала не той номер і потрапила до незнайомця. Поясни колезі, що сталося.' }, accepted: ['She has misdialled the number.', 'She has misdialed the number.'] },
    { id: 'l23c1-04', type: 'situation', grammarPoint: 'l23c1_she_he_has', situation: { ru: 'Брат перенёс свой рейс на другой день. Скажи об этом маме.', uk: 'Брат переніс свій рейс на інший день. Скажи про це мамі.' }, accepted: ['He has rebooked the flight.', 'He has rebooked his flight.'] },
    { id: 'l23c1-05', type: 'situation', grammarPoint: 'l23c1_things_have', situation: { ru: 'Ты стоишь у двери и не можешь найти ключи. Скажи соседу, что они пропали.', uk: 'Ти стоїш біля дверей і не можеш знайти ключі. Скажи сусідові, що вони зникли.' }, accepted: ['My keys have disappeared.', 'The keys have disappeared.'] },
    { id: 'l23c1-06', type: 'situation', grammarPoint: 'l23c1_things_have', situation: { ru: 'Гости ждут невесту у входа, и ты видишь её машину. Скажи, что невеста приехала.', uk: 'Гості чекають наречену біля входу, і ти бачиш її машину. Скажи, що наречена приїхала.' }, accepted: ['The bride has arrived.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c1-07', type: 'dialogue', grammarPoint: 'l23c1_i_we_have', partnerLine: 'We need products.', situation: { ru: 'Мама говорит, что дома нечего есть. Скажи, что ты уже заполнил холодильник.', uk: 'Мама каже, що вдома нічого їсти. Скажи, що ти вже заповнив холодильник.' }, accepted: ['I have restocked the fridge.', 'We have restocked the fridge.'] },
    { id: 'l23c1-08', type: 'dialogue', grammarPoint: 'l23c1_i_we_have', partnerLine: 'You are tired.', situation: { ru: 'Ты весь день работал без перерыва. Объясни, что перетрудился.', uk: 'Ти весь день працював без перерви. Поясни, що перепрацював.' }, accepted: ['I have overworked.'] },
    { id: 'l23c1-09', type: 'dialogue', grammarPoint: 'l23c1_she_he_has', partnerLine: 'The flowers are outside.', situation: { ru: 'Соседка удивляется, где цветы. Объясни, что их пересадила твоя сестра.', uk: 'Сусідка дивується, де квіти. Поясни, що їх пересадила твоя сестра.' }, accepted: ['She has replanted the flowers.'] },
    { id: 'l23c1-10', type: 'dialogue', grammarPoint: 'l23c1_she_he_has', partnerLine: 'The cost is a problem.', situation: { ru: 'Коллега пересказывает слова начальника о цене. Скажи, что начальник преувеличил проблему.', uk: 'Колега переказує слова начальника про ціну. Скажи, що начальник перебільшив проблему.' }, accepted: ['He has exaggerated the problem.', 'He has exaggerated it.'] },
    { id: 'l23c1-11', type: 'dialogue', grammarPoint: 'l23c1_things_have', partnerLine: 'The weather is perfect.', situation: { ru: 'Друг зовёт на пляж, а ты смотришь в окно и видишь тучи. Возрази ему.', uk: 'Друг кличе на пляж, а ти дивишся у вікно і бачиш хмари. Заперечи йому.' }, accepted: ['Clouds have appeared.', 'The weather has worsened.'] },
    { id: 'l23c1-12', type: 'dialogue', grammarPoint: 'l23c1_things_have', partnerLine: 'I need to check your cut.', situation: { ru: 'Врач хочет осмотреть старый порез. Скажи, что он уже зажил.', uk: 'Лікар хоче оглянути старий поріз. Скажи, що він уже загоївся.' }, accepted: ['The cut has healed.', 'It has healed.', 'The wound has healed.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c1-13', type: 'fix', grammarPoint: 'l23c1_i_we_have', wrong: 'I has repacked the bag.', accepted: ['I have repacked the bag.'] },
    { id: 'l23c1-14', type: 'fix', grammarPoint: 'l23c1_she_he_has', wrong: 'She have disinfected the table.', accepted: ['She has disinfected the table.'] },
    { id: 'l23c1-15', type: 'fix', grammarPoint: 'l23c1_things_have', wrong: 'The groom have changed his jacket.', accepted: ['The groom has changed his jacket.'] },
    { id: 'l23c1-16', type: 'fix', grammarPoint: 'l23c1_i_we_have', wrong: 'We have book our honeymoon.', accepted: ['We have booked our honeymoon.'] },
  ],
};
