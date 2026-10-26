// chapter_exam_v2_l27_c1.ts — банк экзамена v2: урок 27, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): урок 27 — «бы»: would + глагол и if + прошедшая форма
// (I would drive you home if I had a car), плюс «уже сделал» — have + третья форма (1–8). Обе части условия засчитываются в любом
// порядке. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L27_C1: ChapterExamV2Bank = {
  lessonOrdinal: 27,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l27c1_would', label: { ru: 'я бы … — would + глагол', uk: 'я б … — would + дієслово' }, episodeOrdinals: [1, 2, 4] },
    { id: 'l27c1_if_past', label: { ru: 'если бы … — if + had / прошедшая форма', uk: 'якби … — if + had / минула форма' }, episodeOrdinals: [3, 5, 8] },
    { id: 'l27c1_have_done', label: { ru: 'уже сделал — have + done', uk: 'уже зробив — have + done' }, episodeOrdinals: [2, 4, 6] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l27c1-01', type: 'situation', grammarPoint: 'l27c1_would', situation: { ru: 'Сада у тебя нет, но мечтаешь о грядках. Скажи, что выращивал бы овощи, если бы у тебя был сад.', uk: 'Саду в тебе немає, але мрієш про грядки. Скажи, що вирощував би овочі, якби в тебе був сад.' }, accepted: ['I would grow vegetables if I had a garden.', 'If I had a garden, I would grow vegetables.'] },
    { id: 'l27c1-02', type: 'situation', grammarPoint: 'l27c1_if_past', situation: { ru: 'Уже поздно, а машины у тебя нет. Скажи другу, что отвёз бы его домой, если бы у тебя была машина.', uk: 'Уже пізно, а машини в тебе немає. Скажи другові, що відвіз би його додому, якби в тебе була машина.' }, accepted: ['I would drive you home if I had a car.', 'If I had a car, I would drive you home.'] },
    { id: 'l27c1-03', type: 'situation', grammarPoint: 'l27c1_have_done', situation: { ru: 'Соседка пришла покормить твою собаку. Скажи, что ты её уже покормил.', uk: 'Сусідка прийшла погодувати твого собаку. Скажи, що ти його вже погодував.' }, accepted: ['I have already fed him.', 'I have already fed the dog.'] },
    { id: 'l27c1-04', type: 'situation', grammarPoint: 'l27c1_would', situation: { ru: 'Брат переехал в другой город. Скажи ему, что навещал бы его каждые выходные.', uk: 'Брат переїхав до іншого міста. Скажи йому, що навідував би його щовихідних.' }, accepted: ['I would visit you every weekend.'] },
    { id: 'l27c1-05', type: 'situation', grammarPoint: 'l27c1_if_past', situation: { ru: 'Гости стоят у стола — стульев мало. Скажи, что все сели бы за стол, если бы у вас было больше стульев.', uk: 'Гості стоять біля столу — стільців мало. Скажи, що всі сіли б за стіл, якби у вас було більше стільців.' }, accepted: ['Everyone would sit at the table if we had more chairs.', 'If we had more chairs, everyone would sit at the table.'] },
    { id: 'l27c1-06', type: 'situation', grammarPoint: 'l27c1_have_done', situation: { ru: 'Друг спрашивает про ремонт, а вам осталось повесить одну полку. Скажи, что вы практически закончили.', uk: 'Друг питає про ремонт, а вам лишилося повісити одну полицю. Скажи, що ви практично закінчили.' }, accepted: ['We have practically finished.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c1-07', type: 'dialogue', grammarPoint: 'l27c1_would', partnerLine: 'Where would you go?', situation: { ru: 'Друг мечтает об отпуске. Ответь, что ты поехал бы на побережье.', uk: 'Друг мріє про відпустку. Відповідай, що ти поїхав би на узбережжя.' }, accepted: ['I would go to the coast.'] },
    { id: 'l27c1-08', type: 'dialogue', grammarPoint: 'l27c1_have_done', partnerLine: 'Have you made dinner?', situation: { ru: 'Ужин ещё варится, но стол ты уже накрыл. Скажи об этом.', uk: 'Вечеря ще вариться, але стіл ти вже накрив. Скажи про це.' }, accepted: ['I have already set the table.'] },
    { id: 'l27c1-09', type: 'dialogue', grammarPoint: 'l27c1_if_past', partnerLine: 'Could you help me with this box?', situation: { ru: 'Ты на работе до вечера. Скажи, что помог бы, если бы закончил работу раньше.', uk: 'Ти на роботі до вечора. Скажи, що допоміг би, якби закінчив роботу раніше.' }, accepted: ['I would help you if I finished work earlier.', 'If I finished work earlier, I would help you.'] },
    { id: 'l27c1-10', type: 'dialogue', grammarPoint: 'l27c1_would', partnerLine: 'This drink is too sugary for me.', situation: { ru: 'Ты согласен: тебе тоже сладко. Скажи, что ты бы предпочёл воды.', uk: 'Ти згоден: тобі теж солодко. Скажи, що ти б волів води.' }, accepted: ['I would prefer some water.'] },
    { id: 'l27c1-11', type: 'dialogue', grammarPoint: 'l27c1_have_done', partnerLine: 'The headboard is loose.', situation: { ru: 'Ты ещё утром сообщил о поломке. Скажи, что уже позвонил в магазин.', uk: 'Ти ще зранку повідомив про поломку. Скажи, що вже зателефонував до магазину.' }, accepted: ['I have already called the shop.'] },
    { id: 'l27c1-12', type: 'dialogue', grammarPoint: 'l27c1_if_past', partnerLine: 'We can meet at the park.', situation: { ru: 'Парк далеко, а собака старая. Скажи, что взял бы её в парк, если бы у тебя была машина.', uk: 'Парк далеко, а собака стара. Скажи, що взяв би її до парку, якби в тебе була машина.' }, accepted: ['I would take him to the park if I had a car.', 'I would take the dog to the park if I had a car.', 'If I had a car, I would take him to the park.', 'If I had a car, I would take the dog to the park.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c1-13', type: 'fix', grammarPoint: 'l27c1_would', wrong: 'I would to go to the coast.', accepted: ['I would go to the coast.'] },
    { id: 'l27c1-14', type: 'fix', grammarPoint: 'l27c1_if_past', wrong: 'If I have a car, I would drive there.', accepted: ['If I had a car, I would drive there.', 'I would drive there if I had a car.'] },
    { id: 'l27c1-15', type: 'fix', grammarPoint: 'l27c1_have_done', wrong: 'We have buy some extra towels.', accepted: ['We have bought some extra towels.'] },
    { id: 'l27c1-16', type: 'fix', grammarPoint: 'l27c1_if_past', wrong: 'We would grow vegetables if we have a garden.', accepted: ['We would grow vegetables if we had a garden.', 'If we had a garden, we would grow vegetables.'] },
  ],
};
