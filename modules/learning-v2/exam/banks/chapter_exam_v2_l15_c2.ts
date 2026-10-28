// chapter_exam_v2_l15_c2.ts — банк экзамена v2: урок 15, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–16 урока 15
// (going to для того, что вот-вот случится по видимым признакам: It is going to…, They are going to…, There is going to be…); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C2: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l15c2_is', label: { ru: 'вот-вот случится — is going to', uk: 'ось-ось станеться — is going to' }, episodeOrdinals: [9, 10, 11] },
    { id: 'l15c2_are', label: { ru: 'с несколькими предметами — are going to', uk: 'з кількома предметами — are going to' }, episodeOrdinals: [9, 10, 12] },
    { id: 'l15c2_there', label: { ru: 'будет — There is going to be', uk: 'буде — There is going to be' }, episodeOrdinals: [13, 14] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c2-01', type: 'situation', grammarPoint: 'l15c2_is', situation: { ru: 'Вода в раковине уже у самого края. Предупреди, что она сейчас перельётся.', uk: 'Вода в раковині вже біля самого краю. Попередь, що вона зараз переллється.' }, accepted: ['The sink is going to overflow.'] },
    { id: 'l15c2-02', type: 'situation', grammarPoint: 'l15c2_are', situation: { ru: 'Шарики надуты слишком сильно. Предупреди, что они лопнут.', uk: 'Кульки надуті занадто сильно. Попередь, що вони луснуть.' }, accepted: ['The balloons are going to burst.'] },
    { id: 'l15c2-03', type: 'situation', grammarPoint: 'l15c2_there', situation: { ru: 'Небо почернело. Скажи, что сейчас будет ливень.', uk: 'Небо почорніло. Скажи, що зараз буде злива.' }, accepted: ['There is going to be a downpour.'] },
    { id: 'l15c2-04', type: 'situation', grammarPoint: 'l15c2_is', situation: { ru: 'Масло лежит на солнце. Скажи, что оно сейчас размякнет.', uk: 'Масло лежить на сонці. Скажи, що воно зараз розм’якне.' }, accepted: ['The butter is going to soften.', 'The butter is going to melt.'] },
    { id: 'l15c2-05', type: 'situation', grammarPoint: 'l15c2_are', situation: { ru: 'Полки прогнулись под книгами. Предупреди, что они провиснут.', uk: 'Полиці прогнулися під книжками. Попередь, що вони провиснуть.' }, accepted: ['The shelves are going to sag.'] },
    { id: 'l15c2-06', type: 'situation', grammarPoint: 'l15c2_there', situation: { ru: 'После дождя выглянуло солнце. Скажи, что будет радуга.', uk: 'Після дощу визирнуло сонце. Скажи, що буде веселка.' }, accepted: ['There is going to be a rainbow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c2-07', type: 'dialogue', grammarPoint: 'l15c2_is', partnerLine: 'The chair is going to break.', situation: { ru: 'Скажи, что стол тоже вот-вот зашатается.', uk: 'Скажи, що стіл теж ось-ось захитається.' }, accepted: ['The table is going to wobble too.', 'The table is going to wobble.'] },
    { id: 'l15c2-08', type: 'dialogue', grammarPoint: 'l15c2_are', partnerLine: 'The jumper is going to shrink.', situation: { ru: 'Скажи, что носки тоже сядут.', uk: 'Скажи, що шкарпетки теж сядуть.' }, accepted: ['The socks are going to shrink too.', 'The socks are going to shrink.'] },
    { id: 'l15c2-09', type: 'dialogue', grammarPoint: 'l15c2_there', partnerLine: 'The snow is going to melt.', situation: { ru: 'Скажи, что на дороге будет слякоть.', uk: 'Скажи, що на дорозі буде сльота.' }, accepted: ['There is going to be slush on the road.'] },
    { id: 'l15c2-10', type: 'dialogue', grammarPoint: 'l15c2_is', partnerLine: 'He is going to fall.', situation: { ru: 'Посмотри на сестру: глаза закрываются. Скажи, что она сейчас задремлет.', uk: 'Подивися на сестру: очі заплющуються. Скажи, що вона зараз задрімає.' }, accepted: ['She is going to doze.', 'She is going to sleep.'] },
    { id: 'l15c2-11', type: 'dialogue', grammarPoint: 'l15c2_are', partnerLine: 'The fish is going to thaw.', situation: { ru: 'Скажи, что ягоды тоже разморозятся.', uk: 'Скажи, що ягоди теж розморозяться.' }, accepted: ['The berries are going to thaw too.', 'The berries are going to thaw.'] },
    { id: 'l15c2-12', type: 'dialogue', grammarPoint: 'l15c2_there', partnerLine: 'The wind is going to get stronger.', situation: { ru: 'Скажи, что будет штормовой ветер.', uk: 'Скажи, що буде штормовий вітер.' }, accepted: ['There is going to be a gale.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c2-13', type: 'fix', grammarPoint: 'l15c2_is', wrong: 'The sink going to overflow.', accepted: ['The sink is going to overflow.'] },
    { id: 'l15c2-14', type: 'fix', grammarPoint: 'l15c2_are', wrong: 'The biscuits is going to crumble.', accepted: ['The biscuits are going to crumble.'] },
    { id: 'l15c2-15', type: 'fix', grammarPoint: 'l15c2_there', wrong: 'There are going to be a rainbow.', accepted: ['There is going to be a rainbow.'] },
    { id: 'l15c2-16', type: 'fix', grammarPoint: 'l15c2_is', wrong: 'The glass is going fall.', accepted: ['The glass is going to fall.'] },
  ],
};
