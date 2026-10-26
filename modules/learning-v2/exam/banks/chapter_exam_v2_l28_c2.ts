// chapter_exam_v2_l28_c2.ts — банк экзамена v2: урок 28, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 2 урока 28 — что с вещью сделали: was / were +
// третья форма (The wall was painted yesterday, The brushes were washed after use) — и обычный порядок сейчас: is / are + третья
// форма (9–16). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C2: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l28c2_was_done', label: { ru: 'с вещью сделали — was + painted / found', uk: 'з річчю зробили — was + painted / found' }, episodeOrdinals: [9, 10, 12] },
    { id: 'l28c2_were_done', label: { ru: 'с вещами сделали — were + washed / cleaned', uk: 'з речами зробили — were + washed / cleaned' }, episodeOrdinals: [9, 11, 16] },
    { id: 'l28c2_present_done', label: { ru: 'так делают всегда — is / are + kept / sold', uk: 'так роблять завжди — is / are + kept / sold' }, episodeOrdinals: [10, 14, 15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c2-01', type: 'situation', grammarPoint: 'l28c2_was_done', situation: { ru: 'Гость тянется рукой к свежей стене. Предупреди, что её покрасили вчера.', uk: 'Гість тягнеться рукою до свіжої стіни. Попередь, що її пофарбували вчора.' }, accepted: ['The wall was painted yesterday.', 'It was painted yesterday.'] },
    { id: 'l28c2-02', type: 'situation', grammarPoint: 'l28c2_were_done', situation: { ru: 'Хозяйка мастерской спрашивает про кисти. Скажи, что их помыли после работы.', uk: 'Господиня майстерні питає про пензлі. Скажи, що їх помили після роботи.' }, accepted: ['The brushes were washed after use.'] },
    { id: 'l28c2-03', type: 'situation', grammarPoint: 'l28c2_present_done', situation: { ru: 'Новичок в спортзале брезгливо смотрит на гантели. Скажи, что оборудование чистят каждый вечер.', uk: 'Новачок у спортзалі гидливо дивиться на гантелі. Скажи, що обладнання чистять щовечора.' }, accepted: ['The equipment is cleaned every evening.'] },
    { id: 'l28c2-04', type: 'situation', grammarPoint: 'l28c2_was_done', situation: { ru: 'Ты потеряла купальник для танцев, и администратор его вернул. Скажи подруге, что его нашли в танцевальной студии.', uk: 'Ти загубила купальник для танців, і адміністратор його повернув. Скажи подрузі, що його знайшли в танцювальній студії.' }, accepted: ['My leotard was found in the dance studio.'] },
    { id: 'l28c2-05', type: 'situation', grammarPoint: 'l28c2_were_done', situation: { ru: 'Гостья замечает, что шторы стали светлее. Скажи, что их почистили на прошлой неделе.', uk: 'Гостя помічає, що штори стали світлішими. Скажи, що їх почистили минулого тижня.' }, accepted: ['The curtains were cleaned last week.'] },
    { id: 'l28c2-06', type: 'situation', grammarPoint: 'l28c2_present_done', situation: { ru: 'Посетитель почты ищет марки. Скажи, что марки продаются на этой стойке.', uk: 'Відвідувач пошти шукає марки. Скажи, що марки продаються на цій стійці.' }, accepted: ['Stamps are sold at this counter.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c2-07', type: 'dialogue', grammarPoint: 'l28c2_was_done', partnerLine: 'Can we use the table now?', situation: { ru: 'Да, можно. Скажи, что стол отремонтировали на прошлой неделе.', uk: 'Так, можна. Скажи, що стіл відремонтували минулого тижня.' }, accepted: ['The table was repaired last week.', 'It was repaired last week.'] },
    { id: 'l28c2-08', type: 'dialogue', grammarPoint: 'l28c2_were_done', partnerLine: 'Can we sit together?', situation: { ru: 'Садитесь где хотите. Скажи, что столы протёрли перед обедом.', uk: 'Сідайте де хочете. Скажи, що столи протерли перед обідом.' }, accepted: ['The tables were cleaned before lunch.'] },
    { id: 'l28c2-09', type: 'dialogue', grammarPoint: 'l28c2_present_done', partnerLine: 'Is the equipment included in the price?', situation: { ru: 'Да, и жилеты тоже. Скажи, что спасательные жилеты хранятся внутри.', uk: 'Так, і жилети теж. Скажи, що рятувальні жилети зберігаються всередині.' }, accepted: ['The lifejackets are kept inside.'] },
    { id: 'l28c2-10', type: 'dialogue', grammarPoint: 'l28c2_was_done', partnerLine: 'I would like to send this parcel.', situation: { ru: 'Ты работник почты, посылку уже оформили. Скажи, что её взвесили сегодня утром.', uk: 'Ти працівник пошти, посилку вже оформили. Скажи, що її зважили сьогодні вранці.' }, accepted: ['The parcel was weighed this morning.'] },
    { id: 'l28c2-11', type: 'dialogue', grammarPoint: 'l28c2_were_done', partnerLine: 'How does this dehumidifier work?', situation: { ru: 'Подскажи покупателю: инструкцию положили внутрь коробки.', uk: 'Підкажи покупцеві: інструкцію поклали всередину коробки.' }, accepted: ['The instructions were put inside the box.'] },
    { id: 'l28c2-12', type: 'dialogue', grammarPoint: 'l28c2_present_done', partnerLine: 'Is this soup vegan?', situation: { ru: 'Покажи гостю на меню: состав там указан.', uk: 'Покажи гостеві на меню: склад там зазначено.' }, accepted: ['The ingredients are listed on the menu.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c2-13', type: 'fix', grammarPoint: 'l28c2_was_done', wrong: 'The window were repaired yesterday.', accepted: ['The window was repaired yesterday.'] },
    { id: 'l28c2-14', type: 'fix', grammarPoint: 'l28c2_were_done', wrong: 'The brushes was washed after use.', accepted: ['The brushes were washed after use.'] },
    { id: 'l28c2-15', type: 'fix', grammarPoint: 'l28c2_present_done', wrong: 'The tank are emptied every morning.', accepted: ['The tank is emptied every morning.'] },
    { id: 'l28c2-16', type: 'fix', grammarPoint: 'l28c2_was_done', wrong: 'The film shown yesterday.', accepted: ['The film was shown yesterday.'] },
  ],
};
