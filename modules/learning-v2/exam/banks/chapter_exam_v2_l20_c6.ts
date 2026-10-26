// chapter_exam_v2_l20_c6.ts — банк экзамена v2: урок 20, глава 6 (эпизоды 41–48).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–48 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 6 — don't / doesn't have to (эпизоды 41–43, 45, 47).
// Запасные ответы сторож разбирает после нормализации: doesn't → «does not», а «does» в эпизодах отдельно не было — поэтому
// у he / she только эталон с doesn't; у I / we запасной — «do not».
// Вежливые просьбы Can I / Could I …? — отдельная тема (эпизоды 44, 46, 48).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C6: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l20c6_dont', label: { ru: "мне / нам не нужно — don't have to", uk: "мені / нам не треба — don't have to" }, episodeOrdinals: [41, 42, 43, 45] },
    { id: 'l20c6_doesnt', label: { ru: "ему / ей не нужно — doesn't have to", uk: "йому / їй не треба — doesn't have to" }, episodeOrdinals: [41, 42, 45, 47] },
    { id: 'l20c6_polite', label: { ru: 'вежливая просьба — Can I …? Could we …?', uk: 'ввічливе прохання — Can I …? Could we …?' }, episodeOrdinals: [44, 46, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c6-01', type: 'situation', grammarPoint: 'l20c6_dont', situation: { ru: 'Бумагу и ручки на курсах выдают. Скажи подруге, что тебе не нужно покупать материалы.', uk: 'Папір і ручки на курсах видають. Скажи подрузі, що тобі не треба купувати матеріали.' }, accepted: ["I don't have to buy supplies."] },
    { id: 'l20c6-02', type: 'situation', grammarPoint: 'l20c6_doesnt', situation: { ru: 'Копию паспорта сделают прямо в офисе. Скажи маме, что сестре не нужно её приносить.', uk: 'Копію паспорта зроблять просто в офісі. Скажи мамі, що сестрі не треба її приносити.' }, accepted: ["She doesn't have to bring a photocopy."] },
    { id: 'l20c6-03', type: 'situation', grammarPoint: 'l20c6_doesnt', situation: { ru: 'Брат собирается проводить тебя до вокзала. Скажи маме, что ему не нужно тебя провожать.', uk: 'Брат збирається провести тебе до вокзалу. Скажи мамі, що йому не треба тебе проводжати.' }, accepted: ["He doesn't have to accompany me."] },
    { id: 'l20c6-04', type: 'situation', grammarPoint: 'l20c6_dont', situation: { ru: 'На вечеринке угощения хватает. Скажи мужу, что вам не нужно брать с собой еду.', uk: 'На вечірці частування вистачає. Скажи чоловікові, що вам не треба брати з собою їжу.' }, accepted: ["We don't have to bring along any food.", 'We do not have to bring any food.'] },
    { id: 'l20c6-05', type: 'situation', grammarPoint: 'l20c6_polite', situation: { ru: 'Ты бронируешь номер по телефону. Спроси, можно ли заплатить по приезде.', uk: 'Ти бронюєш номер телефоном. Спитай, чи можна заплатити після приїзду.' }, accepted: ['Can I pay on arrival?', 'Could I pay on arrival?', 'Could we pay on arrival?', 'Can we pay on arrival?'] },
    { id: 'l20c6-06', type: 'situation', grammarPoint: 'l20c6_polite', situation: { ru: 'Ты не уложился во время на пробном экзамене. Спроси, можно ли попробовать ещё раз.', uk: 'Ти не вклався в час на пробному іспиті. Спитай, чи можна спробувати ще раз.' }, accepted: ['Can I try once more?', 'Could I try once more?', 'Can I try again?', 'Could I try again?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c6-07', type: 'dialogue', grammarPoint: 'l20c6_dont', partnerLine: 'We have to quote the whole text.', situation: { ru: 'Однокурсник уверен, что в эссе надо переписать весь текст. Возрази: цитировать весь текст не нужно.', uk: 'Одногрупник певен, що в есе треба переписати весь текст. Заперечи: цитувати весь текст не треба.' }, accepted: ["We don't have to quote the whole text.", 'You do not have to quote the whole text.'] },
    { id: 'l20c6-08', type: 'dialogue', grammarPoint: 'l20c6_doesnt', partnerLine: 'She has to stay behind.', situation: { ru: 'Коллега думает, что Анне придётся остаться после собрания. Возрази: ей не нужно оставаться.', uk: 'Колега думає, що Анні доведеться залишитися після зборів. Заперечи: їй не треба залишатися.' }, accepted: ["She doesn't have to stay behind."] },
    { id: 'l20c6-09', type: 'dialogue', grammarPoint: 'l20c6_doesnt', partnerLine: 'He has to do it all at once.', situation: { ru: 'Мама переживает, что папа должен закончить весь ремонт за день. Успокой её: ему не нужно делать всё сразу.', uk: 'Мама хвилюється, що тато має закінчити весь ремонт за день. Заспокой її: йому не треба робити все одразу.' }, accepted: ["He doesn't have to do it all at once."] },
    { id: 'l20c6-10', type: 'dialogue', grammarPoint: 'l20c6_dont', partnerLine: 'We have to head back now.', situation: { ru: 'Сестра торопит домой с прогулки, хотя ещё светло. Скажи, что возвращаться пока не нужно.', uk: 'Сестра квапить додому з прогулянки, хоча ще світло. Скажи, що повертатися поки не треба.' }, accepted: ["We don't have to head back yet."] },
    { id: 'l20c6-11', type: 'dialogue', grammarPoint: 'l20c6_polite', partnerLine: 'You have to pay now.', situation: { ru: 'Продавец дивана просит всю сумму сразу. Спроси, можно ли платить частями.', uk: 'Продавець дивана просить усю суму одразу. Спитай, чи можна платити частинами.' }, accepted: ['Can I pay in instalments?', 'Could I pay in instalments?', 'Could we pay in instalments?', 'Can we pay in instalments?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c6-12', type: 'fix', grammarPoint: 'l20c6_doesnt', wrong: "She don't have to bring a photocopy.", accepted: ["She doesn't have to bring a photocopy."] },
    { id: 'l20c6-13', type: 'fix', grammarPoint: 'l20c6_dont', wrong: "I doesn't have to buy supplies.", accepted: ["I don't have to buy supplies."] },
    { id: 'l20c6-14', type: 'fix', grammarPoint: 'l20c6_doesnt', wrong: "He doesn't has to accompany me.", accepted: ["He doesn't have to accompany me."] },
    { id: 'l20c6-15', type: 'fix', grammarPoint: 'l20c6_dont', wrong: "We don't have pay at all.", accepted: ["We don't have to pay at all."] },
    { id: 'l20c6-16', type: 'fix', grammarPoint: 'l20c6_polite', wrong: 'I can leave it here for now?', accepted: ['Can I leave it here for now?', 'Could I leave it here for now?'] },
  ],
};
