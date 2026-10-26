// chapter_exam_v2_l22_c3.ts — банк экзамена v2: урок 22, глава 3 (эпизоды 17–24).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–24 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 3 — yourself, myself, ourselves (эпизоды 17–20), просьбы эпизодов 21–23 (утверждением I want to — «?» сторож не пускает)
// и «чтобы» — I leave early to catch a train (эпизод 24).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C3: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l22c3_yourself', label: { ru: 'себя — you … yourself', uk: 'себе — you … yourself' }, episodeOrdinals: [17, 18, 19, 20] },
    { id: 'l22c3_myself', label: { ru: 'себя — I … myself, we … ourselves', uk: 'себе — I … myself, we … ourselves' }, episodeOrdinals: [18, 19, 20] },
    { id: 'l22c3_want_to', label: { ru: 'просьба — I want to go for a walk', uk: 'прохання — I want to go for a walk' }, episodeOrdinals: [21, 22, 23] },
    { id: 'l22c3_purpose', label: { ru: 'чтобы — to catch a train', uk: 'щоб — to catch a train' }, episodeOrdinals: [24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c3-01', type: 'situation', grammarPoint: 'l22c3_yourself', situation: { ru: 'Друг впервые пришёл на встречу клуба и молчит. Скажи, что он может представиться.', uk: 'Друг уперше прийшов на зустріч клубу й мовчить. Скажи, що він може представитися.' }, accepted: ['You can introduce yourself.'] },
    { id: 'l22c3-02', type: 'situation', grammarPoint: 'l22c3_myself', situation: { ru: 'Тебе предлагают подсказать текст перед выступлением. Скажи, что подготовишься сам.', uk: 'Тобі пропонують підказати текст перед виступом. Скажи, що підготуєшся сам.' }, accepted: ['I can prepare myself.', 'I need to prepare myself.'] },
    { id: 'l22c3-03', type: 'situation', grammarPoint: 'l22c3_want_to', situation: { ru: 'Ты два часа сидишь в душном зале. Скажи коллеге, что хочешь подышать свежим воздухом.', uk: 'Ти дві години сидиш у задушливій залі. Скажи колезі, що хочеш подихати свіжим повітрям.' }, accepted: ['I want to get some fresh air.'] },
    { id: 'l22c3-04', type: 'situation', grammarPoint: 'l22c3_want_to', situation: { ru: 'В автобусе тебя укачивает. Скажи соседу, что хочешь сесть у окна.', uk: 'В автобусі тебе заколисує. Скажи сусідові, що хочеш сісти біля вікна.' }, accepted: ['I want to sit by the window.', 'I want to change seats.'] },
    { id: 'l22c3-05', type: 'situation', grammarPoint: 'l22c3_purpose', situation: { ru: 'Друг удивлён, что ты выходишь из дома так рано. Объясни: чтобы успеть на поезд.', uk: 'Друг здивований, що ти виходиш з дому так рано. Поясни: щоб встигнути на потяг.' }, accepted: ['I leave early to catch a train.', 'I leave early to catch the train.'] },
    { id: 'l22c3-06', type: 'situation', grammarPoint: 'l22c3_purpose', situation: { ru: 'Ты идёшь не по главной дороге, а через парк. Объясни: эта тропинка — короткий путь.', uk: 'Ти йдеш не головною дорогою, а через парк. Поясни: ця стежка — короткий шлях.' }, accepted: ['I use this path to take a shortcut.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c3-07', type: 'dialogue', grammarPoint: 'l22c3_yourself', partnerLine: 'I blame myself.', situation: { ru: 'Подруга корит себя за ошибку. Скажи, что ей не нужно себя винить.', uk: 'Подруга картає себе за помилку. Скажи, що їй не треба себе звинувачувати.' }, accepted: ['You should not blame yourself.', 'You can forgive yourself.'] },
    { id: 'l22c3-08', type: 'dialogue', grammarPoint: 'l22c3_yourself', partnerLine: 'I do not want to speak.', situation: { ru: 'Коллега боится говорить на собрании. Подбодри: он может выразить себя.', uk: 'Колега боїться говорити на зборах. Підбадьор: він може висловитися.' }, accepted: ['You can express yourself.', 'You can speak for yourself.'] },
    { id: 'l22c3-09', type: 'dialogue', grammarPoint: 'l22c3_myself', partnerLine: 'I can speak for you.', situation: { ru: 'Друг хочет ответить за тебя. Скажи, что ты можешь сказать сам за себя.', uk: 'Друг хоче відповісти за тебе. Скажи, що ти можеш сказати сам за себе.' }, accepted: ['I can speak for myself.'] },
    { id: 'l22c3-10', type: 'dialogue', grammarPoint: 'l22c3_myself', partnerLine: 'You can teach yourselves.', situation: { ru: 'Учитель уезжает на месяц. Согласись: вы научитесь сами.', uk: 'Учитель їде на місяць. Погодься: ви навчитеся самі.' }, accepted: ['We can teach ourselves.'] },
    { id: 'l22c3-11', type: 'dialogue', grammarPoint: 'l22c3_want_to', partnerLine: 'I want to take a nap.', situation: { ru: 'Коллега хочет вздремнуть в перерыве, а тебе хочется подвигаться. Скажи, что хочешь прогуляться.', uk: 'Колега хоче подрімати на перерві, а тобі хочеться порухатися. Скажи, що хочеш прогулятися.' }, accepted: ['I want to go for a walk.', 'I want to stretch my legs.'] },
    { id: 'l22c3-12', type: 'dialogue', grammarPoint: 'l22c3_purpose', partnerLine: 'I need to get a taxi.', situation: { ru: 'Друг не знает, как вызвать такси. Скажи, что ты вызываешь такси через телефон.', uk: 'Друг не знає, як викликати таксі. Скажи, що ти викликаєш таксі через телефон.' }, accepted: ['I use my phone to get a taxi.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c3-13', type: 'fix', grammarPoint: 'l22c3_yourself', wrong: 'You can believe in you.', accepted: ['You can believe in yourself.'] },
    { id: 'l22c3-14', type: 'fix', grammarPoint: 'l22c3_myself', wrong: 'I can treat me.', accepted: ['I can treat myself.'] },
    { id: 'l22c3-15', type: 'fix', grammarPoint: 'l22c3_purpose', wrong: 'I use this crossing for cross the road.', accepted: ['I use this crossing to cross the road.'] },
    { id: 'l22c3-16', type: 'fix', grammarPoint: 'l22c3_want_to', wrong: 'I want go for a swim.', accepted: ['I want to go for a swim.'] },
  ],
};
