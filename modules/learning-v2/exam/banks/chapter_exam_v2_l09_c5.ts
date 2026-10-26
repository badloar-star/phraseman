// chapter_exam_v2_l09_c5.ts — банк экзамена v2: урок 9, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–40 — что я делаю сейчас I am + -ing (my …), чего не делаю I am not + -ing, просьба Please don't + действие; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C5: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l09c5_my', label: { ru: 'я сейчас — I am + -ing', uk: 'я зараз — I am + -ing' }, episodeOrdinals: [33, 34, 37] },
    { id: 'l09c5_not', label: { ru: 'я не — I am not + -ing', uk: 'я не — I am not + -ing' }, episodeOrdinals: [33, 36, 40] },
    { id: 'l09c5_please', label: { ru: "просьба — Please don't + действие", uk: "прохання — Please don't + дія" }, episodeOrdinals: [34, 36, 37] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c5-01', type: 'situation', grammarPoint: 'l09c5_my', situation: { ru: 'Друг зовёт тебя, а ты остановился посреди улицы. Скажи, что завязываешь шнурок.', uk: 'Друг кличе тебе, а ти зупинився посеред вулиці. Скажи, що зав’язуєш шнурок.' }, accepted: ['I am tying my shoelace.', "I'm tying my shoelace."] },
    { id: 'l09c5-02', type: 'situation', grammarPoint: 'l09c5_my', situation: { ru: 'Конкурс скоро закроется, ты загружаешь работу. Скажи, что отправляешь свою заявку.', uk: 'Конкурс скоро закриється, ти завантажуєш роботу. Скажи, що надсилаєш свою заявку.' }, accepted: ['I am submitting my entry.', 'I am submitting my work.', "I'm submitting my entry."] },
    { id: 'l09c5-03', type: 'situation', grammarPoint: 'l09c5_please', situation: { ru: 'Мастер просит не тереть замшу. Передай его просьбу.', uk: 'Майстер просить не терти замшу. Передай його прохання.' }, accepted: ["Please don't rub the suede."] },
    { id: 'l09c5-04', type: 'situation', grammarPoint: 'l09c5_not', situation: { ru: 'Учитель думает, что звенит твой ксилофон. Скажи, что ты на нём не играешь.', uk: 'Учитель думає, що дзвенить твій ксилофон. Скажи, що ти на ньому не граєш.' }, accepted: ['I am not playing the xylophone.', "I'm not playing the xylophone."] },
    { id: 'l09c5-05', type: 'situation', grammarPoint: 'l09c5_my', situation: { ru: 'В игре ты неправильно посчитал очки. Скажи, что признаёшь свою ошибку.', uk: 'У грі ти неправильно порахував очки. Скажи, що визнаєш свою помилку.' }, accepted: ['I am admitting my mistake.', "I'm admitting my mistake.", 'I am admitting the error.'] },
    { id: 'l09c5-06', type: 'situation', grammarPoint: 'l09c5_please', situation: { ru: 'Идёт запись, а друг тянется к маракасу. Попроси его не трясти.', uk: 'Іде запис, а друг тягнеться до маракаса. Попроси його не трусити.' }, accepted: ["Please don't shake the maraca."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c5-07', type: 'dialogue', grammarPoint: 'l09c5_not', partnerLine: 'The brass is clean.', situation: { ru: 'Скажи, что медь ты сейчас не трёшь.', uk: 'Скажи, що мідь ти зараз не тереш.' }, accepted: ['I am not rubbing the copper.', "I'm not rubbing the copper."] },
    { id: 'l09c5-08', type: 'dialogue', grammarPoint: 'l09c5_my', partnerLine: 'Please refer to the manual.', situation: { ru: 'Скажи, что ты как раз сверяешься с инструкцией.', uk: 'Скажи, що ти якраз звіряєшся з інструкцією.' }, accepted: ['I am referring to the manual.', "I'm referring to the manual."] },
    { id: 'l09c5-09', type: 'dialogue', grammarPoint: 'l09c5_please', partnerLine: 'The courier is here.', situation: { ru: 'Курьер ни в чём не виноват. Попроси его не обвинять.', uk: 'Кур’єр ні в чому не винен. Попроси його не звинувачувати.' }, accepted: ["Please don't blame the courier."] },
    { id: 'l09c5-10', type: 'dialogue', grammarPoint: 'l09c5_not', partnerLine: "Please don't submit the portfolio.", situation: { ru: 'Скажи, что ты и не отправляешь свою заявку.', uk: 'Скажи, що ти й не надсилаєш свою заявку.' }, accepted: ['I am not submitting my entry.', "I'm not submitting my entry."] },
    { id: 'l09c5-11', type: 'dialogue', grammarPoint: 'l09c5_my', partnerLine: 'The knot is small.', situation: { ru: 'Скажи, что ты завязываешь бант.', uk: 'Скажи, що ти зав’язуєш бант.' }, accepted: ['I am tying a bow.'] },
    { id: 'l09c5-12', type: 'dialogue', grammarPoint: 'l09c5_please', partnerLine: 'There is a power outage.', situation: { ru: 'Попроси не закрывать программу.', uk: 'Попроси не закривати програму.' }, accepted: ["Please don't close the program."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c5-13', type: 'fix', grammarPoint: 'l09c5_my', wrong: 'I am tie my shoelace.', accepted: ['I am tying my shoelace.', "I'm tying my shoelace."] },
    { id: 'l09c5-14', type: 'fix', grammarPoint: 'l09c5_not', wrong: 'I not am playing the xylophone.', accepted: ['I am not playing the xylophone.', "I'm not playing the xylophone."] },
    { id: 'l09c5-15', type: 'fix', grammarPoint: 'l09c5_please', wrong: "Please don't to pull the loop.", accepted: ["Please don't pull the loop."] },
    { id: 'l09c5-16', type: 'fix', grammarPoint: 'l09c5_my', wrong: 'I submitting my entry.', accepted: ['I am submitting my entry.', "I'm submitting my entry."] },
  ],
};
