// chapter_exam_v2_l21_c7.ts — банк экзамена v2: урок 21, глава 7 (эпизоды 49–56).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–56 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 7 — I need to / I want to (эпизоды 49–52, 55), mustn't на табличках (53), so / such (54). «Mustn't» — эталоном, как в эпизоде; «must not» тоже засчитывается.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C7: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l21c7_need_want', label: { ru: 'нужно, хочу — I need to, I want to …', uk: 'треба, хочу — I need to, I want to …' }, episodeOrdinals: [49, 50, 51, 52, 55] },
    { id: 'l21c7_mustnt', label: { ru: "нельзя — you mustn't …", uk: "не можна — you mustn't …" }, episodeOrdinals: [53] },
    { id: 'l21c7_so_such', label: { ru: 'такой, очень — such good value, so worth it', uk: 'такий, дуже — such good value, so worth it' }, episodeOrdinals: [54] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c7-01', type: 'situation', grammarPoint: 'l21c7_need_want', situation: { ru: 'Ты простудился и не пойдёшь на работу. Скажи, что тебе нужно позвонить и отпроситься по болезни.', uk: 'Ти застудився і не підеш на роботу. Скажи, що тобі треба зателефонувати й відпроситися через хворобу.' }, accepted: ['I need to call in sick.'] },
    { id: 'l21c7-02', type: 'situation', grammarPoint: 'l21c7_need_want', situation: { ru: 'Отчёт нужно сдать сегодня вечером. Скажи коллеге, что тебе нужно уложиться в срок.', uk: 'Звіт треба здати сьогодні ввечері. Скажи колезі, що тобі треба вкластися в строк.' }, accepted: ['I need to meet a deadline.'] },
    { id: 'l21c7-03', type: 'situation', grammarPoint: 'l21c7_mustnt', situation: { ru: 'Посетители идут к двери с табличкой «Только для персонала». Объясни, что значит эта табличка.', uk: 'Відвідувачі йдуть до дверей із табличкою «Лише для персоналу». Поясни, що означає ця табличка.' }, accepted: ["The staff only sign means visitors mustn't enter.", 'The staff only sign means visitors must not enter.'] },
    { id: 'l21c7-04', type: 'situation', grammarPoint: 'l21c7_mustnt', situation: { ru: 'Друг закуривает рядом с табличкой «Не курить». Объясни, что она значит.', uk: 'Друг закурює біля таблички «Не палити». Поясни, що вона означає.' }, accepted: ["The no smoking sign means you mustn't smoke.", 'The no smoking sign means you must not smoke.'] },
    { id: 'l21c7-05', type: 'situation', grammarPoint: 'l21c7_so_such', situation: { ru: 'Обед в кафе вкусный и недорогой. Скажи, что это очень выгодно.', uk: 'Обід у кафе смачний і недорогий. Скажи, що це дуже вигідно.' }, accepted: ['This meal is such good value.'] },
    { id: 'l21c7-06', type: 'situation', grammarPoint: 'l21c7_so_such', situation: { ru: 'Друг купил дорогую игрушку, и она сразу сломалась. Скажи, что это пустая трата денег.', uk: 'Друг купив дорогу іграшку, і вона одразу зламалася. Скажи, що це марна трата грошей.' }, accepted: ['This toy is such a waste of money.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c7-07', type: 'dialogue', grammarPoint: 'l21c7_need_want', partnerLine: 'You can stay late tonight.', situation: { ru: 'Начальник просит остаться допоздна. Скажи, что не хочешь сегодня работать сверхурочно.', uk: 'Начальник просить залишитися допізна. Скажи, що не хочеш сьогодні працювати понаднормово.' }, accepted: ['I do not want to work overtime tonight.', 'I do not want to work overtime.'] },
    { id: 'l21c7-08', type: 'dialogue', grammarPoint: 'l21c7_mustnt', partnerLine: 'I can park here.', situation: { ru: 'Друг хочет поставить машину под знаком «Стоянка запрещена». Скажи, что здесь парковаться нельзя.', uk: 'Друг хоче поставити машину під знаком «Стоянку заборонено». Скажи, що тут паркуватися не можна.' }, accepted: ["You mustn't park here.", 'You must not park here.'] },
    { id: 'l21c7-09', type: 'dialogue', grammarPoint: 'l21c7_so_such', partnerLine: 'I have good news.', situation: { ru: 'Друга взяли на работу мечты. Скажи, что это такая хорошая новость.', uk: 'Друга взяли на роботу мрії. Скажи, що це така гарна новина.' }, accepted: ['That is such good news.'] },
    { id: 'l21c7-10', type: 'dialogue', grammarPoint: 'l21c7_so_such', partnerLine: 'This trip will cost money.', situation: { ru: 'Подруга сомневается из-за цены поездки. Скажи, что поездка того стоит.', uk: 'Подруга вагається через ціну поїздки. Скажи, що поїздка того варта.' }, accepted: ['The trip is so worth it.', 'This trip is so worth it.'] },
    { id: 'l21c7-11', type: 'dialogue', grammarPoint: 'l21c7_need_want', partnerLine: 'Anna is sleeping.', situation: { ru: 'Ты говоришь громко, а Анна спит. Скажи, что тебе нужно говорить тише.', uk: 'Ти говориш голосно, а Анна спить. Скажи, що тобі треба говорити тихіше.' }, accepted: ['I need to keep my voice down.'] },
    { id: 'l21c7-12', type: 'dialogue', grammarPoint: 'l21c7_need_want', partnerLine: 'I can pay for you.', situation: { ru: 'Друг хочет заплатить за тебя. Скажи, что тебе нужно заплатить свою долю.', uk: 'Друг хоче заплатити за тебе. Скажи, що тобі треба заплатити свою частку.' }, accepted: ['I need to pay my share.', 'I want to pay my share.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c7-13', type: 'fix', grammarPoint: 'l21c7_mustnt', wrong: "You mustn't to enter.", accepted: ["You mustn't enter.", 'You must not enter.'] },
    { id: 'l21c7-14', type: 'fix', grammarPoint: 'l21c7_need_want', wrong: 'I need taking a day off.', accepted: ['I need to take a day off.'] },
    { id: 'l21c7-15', type: 'fix', grammarPoint: 'l21c7_so_such', wrong: 'This meal is so good value.', accepted: ['This meal is such good value.'] },
    { id: 'l21c7-16', type: 'fix', grammarPoint: 'l21c7_need_want', wrong: 'I need button up my coat.', accepted: ['I need to button up my coat.'] },
  ],
};
