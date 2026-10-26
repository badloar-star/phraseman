// chapter_exam_v2_l12_c5.ts — банк экзамена v2: урок 12, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–40 урока 12
// (прошедшее время о делах дня: visited, crossed, checked, used, parked, helped, thanked, waited; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C5: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l12c5_visited', label: { ru: 'побывал, навестил, перешёл — visited, crossed', uk: 'побував, провідав, перейшов — visited, crossed' }, episodeOrdinals: [34, 35, 36] },
    { id: 'l12c5_checked', label: { ru: 'проверил, воспользовался — checked, used, parked', uk: 'перевірив, скористався — checked, used, parked' }, episodeOrdinals: [33, 38, 39] },
    { id: 'l12c5_helped', label: { ru: 'помог, поблагодарил, подождал — helped, thanked, waited', uk: 'допоміг, подякував, зачекав — helped, thanked, waited' }, episodeOrdinals: [33, 35, 37] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c5-01', type: 'situation', grammarPoint: 'l12c5_visited', situation: { ru: 'Коллега спрашивает про выходные. Скажи, что ты ездил к прабабушке.', uk: 'Колега питає про вихідні. Скажи, що ти їздив до прабабусі.' }, accepted: ['I visited my great-grandmother.'] },
    { id: 'l12c5-02', type: 'situation', grammarPoint: 'l12c5_checked', situation: { ru: 'Перед выходом ты посмотрел расписание автобусов. Скажи об этом другу.', uk: 'Перед виходом ти подивився розклад автобусів. Скажи про це другові.' }, accepted: ['I checked the bus timetable.'] },
    { id: 'l12c5-03', type: 'situation', grammarPoint: 'l12c5_helped', situation: { ru: 'Друг долго искал билеты, а ты стоял у входа в музей. Скажи, что ждал у входа.', uk: 'Друг довго шукав квитки, а ти стояв біля входу до музею. Скажи, що чекав біля входу.' }, accepted: ['I waited near the entrance.'] },
    { id: 'l12c5-04', type: 'situation', grammarPoint: 'l12c5_visited', situation: { ru: 'Напиши подруге, что вчера вы были в музее.', uk: 'Напиши подрузі, що вчора ви були в музеї.' }, accepted: ['We visited the museum yesterday.'] },
    { id: 'l12c5-05', type: 'situation', grammarPoint: 'l12c5_checked', situation: { ru: 'В музее ты слушал записанный рассказ в наушниках. Скажи, что пользовался аудиогидом.', uk: 'У музеї ти слухав записану розповідь у навушниках. Скажи, що користувався аудіогідом.' }, accepted: ['I used an audio guide.', 'I used an audio guide in the museum.'] },
    { id: 'l12c5-06', type: 'situation', grammarPoint: 'l12c5_helped', situation: { ru: 'Тесть помог тебе с ремонтом. Скажи, что ты поблагодарил его.', uk: 'Тесть допоміг тобі з ремонтом. Скажи, що ти подякував йому.' }, accepted: ['I thanked my father-in-law.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c5-07', type: 'dialogue', grammarPoint: 'l12c5_checked', partnerLine: 'The main road was busy yesterday.', situation: { ru: 'Скажи, что ты припарковался на тихой боковой улице.', uk: 'Скажи, що ти припаркувався на тихій бічній вулиці.' }, accepted: ['I parked in a quiet side street.', 'I parked in a side street.'] },
    { id: 'l12c5-08', type: 'dialogue', grammarPoint: 'l12c5_visited', partnerLine: 'She visited her grandma yesterday.', situation: { ru: 'Скажи, что ты навестил свекровь.', uk: 'Скажи, що ти провідав свекруху.' }, accepted: ['I visited my mother-in-law.'] },
    { id: 'l12c5-09', type: 'dialogue', grammarPoint: 'l12c5_helped', partnerLine: 'My great-grandfather was in the garden yesterday.', situation: { ru: 'Скажи, что ты помогал ему там.', uk: 'Скажи, що ти допомагав йому там.' }, accepted: ['I helped my great-grandfather in the garden.', 'I helped my great-grandfather.'] },
    { id: 'l12c5-10', type: 'dialogue', grammarPoint: 'l12c5_checked', partnerLine: 'The bus fare was low yesterday.', situation: { ru: 'Скажи, что ты проверил автобусный маршрут.', uk: 'Скажи, що ти перевірив автобусний маршрут.' }, accepted: ['I checked the bus route.'] },
    { id: 'l12c5-11', type: 'dialogue', grammarPoint: 'l12c5_helped', partnerLine: 'The tour guide was near the entrance yesterday.', situation: { ru: 'Скажи, что вы поблагодарили экскурсовода.', uk: 'Скажи, що ви подякували екскурсоводові.' }, accepted: ['We thanked the tour guide.'] },
    { id: 'l12c5-12', type: 'dialogue', grammarPoint: 'l12c5_visited', partnerLine: 'We used the zebra crossing.', situation: { ru: 'Скажи, что ты перешёл главную дорогу.', uk: 'Скажи, що ти перейшов головну дорогу.' }, accepted: ['I crossed the main road.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c5-13', type: 'fix', grammarPoint: 'l12c5_visited', wrong: 'We visit the museum yesterday.', accepted: ['We visited the museum yesterday.'] },
    { id: 'l12c5-14', type: 'fix', grammarPoint: 'l12c5_checked', wrong: 'I check the bus route yesterday.', accepted: ['I checked the bus route yesterday.'] },
    { id: 'l12c5-15', type: 'fix', grammarPoint: 'l12c5_helped', wrong: 'I help my great-grandfather yesterday.', accepted: ['I helped my great-grandfather yesterday.'] },
    { id: 'l12c5-16', type: 'fix', grammarPoint: 'l12c5_checked', wrong: 'The bus fare were low yesterday.', accepted: ['The bus fare was low yesterday.'] },
  ],
};
