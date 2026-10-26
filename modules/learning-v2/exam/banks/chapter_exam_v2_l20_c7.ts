// chapter_exam_v2_l20_c7.ts — банк экзамена v2: урок 20, глава 7 (эпизоды 49–56).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–56 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 7 — mustn't (эпизоды 49–50), ought to (51, 52, 55), should (53).
// Запасной ответ к mustn't — «must not»: сокращение mustn't сторож после нормализации не раскрывает.
// Вежливые просьбы Can I / Could I …? — отдельная тема (эпизоды 54, 56).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C7: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l20c7_mustnt', label: { ru: "нельзя — mustn't", uk: "не можна — mustn't" }, episodeOrdinals: [49, 50] },
    { id: 'l20c7_ought', label: { ru: 'ought to — сообщить, поблагодарить, по шагам', uk: 'ought to — повідомити, подякувати, крок за кроком' }, episodeOrdinals: [51, 52, 55] },
    { id: 'l20c7_should', label: { ru: 'should — полагаться, понимать', uk: 'should — покладатися, розуміти' }, episodeOrdinals: [53] },
    { id: 'l20c7_polite', label: { ru: 'вежливая просьба — Can I …? Could we …?', uk: 'ввічливе прохання — Can I …? Could we …?' }, episodeOrdinals: [54, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c7-01', type: 'situation', grammarPoint: 'l20c7_mustnt', situation: { ru: 'Вы с другом ведёте викторину. Напомни ему, что ответ раскрывать нельзя.', uk: 'Ви з другом ведете вікторину. Нагадай йому, що відповідь розкривати не можна.' }, accepted: ["We mustn't reveal the answer.", 'We must not reveal the answer.'] },
    { id: 'l20c7-02', type: 'situation', grammarPoint: 'l20c7_mustnt', situation: { ru: 'Дети на ферме гоняются за курами. Скажи им, что обижать животных нельзя.', uk: 'Діти на фермі ганяються за курми. Скажи їм, що кривдити тварин не можна.' }, accepted: ["You mustn't harm the animals.", 'You must not harm the animals.'] },
    { id: 'l20c7-03', type: 'situation', grammarPoint: 'l20c7_ought', situation: { ru: 'У прохожего на твоих глазах вырвали сумку. Скажи другу, что стоит сообщить о преступлении.', uk: 'У перехожого на твоїх очах вирвали сумку. Скажи другові, що варто повідомити про злочин.' }, accepted: ['We ought to report the crime.', 'We should report the crime.', 'We must report the crime.'] },
    { id: 'l20c7-04', type: 'situation', grammarPoint: 'l20c7_ought', situation: { ru: 'Соседи помогли вам с переездом. Скажи мужу, что их стоит поблагодарить.', uk: 'Сусіди допомогли вам із переїздом. Скажи чоловікові, що їм варто подякувати.' }, accepted: ['We ought to express our gratitude.', 'We should express our gratitude.'] },
    { id: 'l20c7-05', type: 'situation', grammarPoint: 'l20c7_should', situation: { ru: 'Сестра гадает, когда придёт автобус. Посоветуй ей полагаться на расписание.', uk: 'Сестра гадає, коли прийде автобус. Порадь їй покладатися на розклад.' }, accepted: ['You should rely on the timetable.', 'You ought to rely on the timetable.'] },
    { id: 'l20c7-06', type: 'situation', grammarPoint: 'l20c7_polite', situation: { ru: 'Тебе нужно сдать документ, а приехать в офис ты не можешь. Спроси, можно ли отправить его по почте.', uk: 'Тобі треба здати документ, а приїхати в офіс ти не можеш. Спитай, чи можна надіслати його поштою.' }, accepted: ['Can I send it by post?', 'Could I send it by post?', 'Could we send it by post?', 'Can we send it by post?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c7-07', type: 'dialogue', grammarPoint: 'l20c7_mustnt', partnerLine: 'I can ignore the rules.', situation: { ru: 'Игрок на турнире собирается нарушить правила. Скажи, что так нельзя.', uk: 'Гравець на турнірі збирається порушити правила. Скажи, що так не можна.' }, accepted: ["You mustn't ignore the rules.", 'You must not ignore the rules.'] },
    { id: 'l20c7-08', type: 'dialogue', grammarPoint: 'l20c7_ought', partnerLine: 'I will speak to the owner.', situation: { ru: 'Друг собирается судиться с хозяином квартиры. Посоветуй сначала почитать про этот закон.', uk: 'Друг збирається судитися з власником квартири. Порадь спершу почитати про цей закон.' }, accepted: ['You ought to read about this law.', 'You should read about this law.'] },
    { id: 'l20c7-09', type: 'dialogue', grammarPoint: 'l20c7_ought', partnerLine: 'I want to do it all at once.', situation: { ru: 'Коллега хочет сделать большой проект за один вечер. Предложи двигаться по шагам.', uk: 'Колега хоче зробити великий проєкт за один вечір. Запропонуй рухатися крок за кроком.' }, accepted: ['We ought to work step by step.', 'We should work step by step.', 'You ought to work step by step.', 'You should work step by step.'] },
    { id: 'l20c7-10', type: 'dialogue', grammarPoint: 'l20c7_should', partnerLine: 'I can pay fifty pounds.', situation: { ru: 'Вы считаете бюджет поездки. Предложи заложить в расчёт цену в пятьдесят фунтов.', uk: 'Ви рахуєте бюджет поїздки. Запропонуй закласти в розрахунок ціну в пʼятдесят фунтів.' }, accepted: ['We should assume a price of fifty pounds.'] },
    { id: 'l20c7-11', type: 'dialogue', grammarPoint: 'l20c7_should', partnerLine: 'I will work without rest.', situation: { ru: 'Друг собирается работать без отдыха. Посоветуй ему понять, как важен отдых.', uk: 'Друг збирається працювати без відпочинку. Порадь йому зрозуміти, який важливий відпочинок.' }, accepted: ['You should realise the importance of rest.', 'You should realize the importance of rest.', 'You should get some rest.'] },
    { id: 'l20c7-12', type: 'dialogue', grammarPoint: 'l20c7_polite', partnerLine: 'We can change the date.', situation: { ru: 'Турагент готов перенести поездку. Спроси, можно ли сделать это без доплаты.', uk: 'Турагент готовий перенести поїздку. Спитай, чи можна зробити це без доплати.' }, accepted: ['Can I change the date at no extra cost?', 'Could I change the date at no extra cost?', 'Could we change the date at no extra cost?', 'Can we change the date at no extra cost?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c7-13', type: 'fix', grammarPoint: 'l20c7_mustnt', wrong: "You mustn't to insult other players.", accepted: ["You mustn't insult other players.", 'You must not insult other players.'] },
    { id: 'l20c7-14', type: 'fix', grammarPoint: 'l20c7_mustnt', wrong: 'We not must mislead our guests.', accepted: ["We mustn't mislead our guests.", 'We must not mislead our guests.'] },
    { id: 'l20c7-15', type: 'fix', grammarPoint: 'l20c7_ought', wrong: 'She ought to take pride on her work.', accepted: ['She ought to take pride in her work.'] },
    { id: 'l20c7-16', type: 'fix', grammarPoint: 'l20c7_polite', wrong: 'I can have another helping of soup?', accepted: ['Can I have another helping of soup?', 'Could I have another helping of soup?'] },
  ],
};
