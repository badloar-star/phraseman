// chapter_exam_v2_l10_c1.ts — банк экзамена v2: урок 10, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–8 — нужно I need, хочу / предпочитаю I would like / I prefer, мнение I agree / I disagree / I do not mind; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C1: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l10c1_need', label: { ru: 'нужно — I need …', uk: 'потрібно — I need …' }, episodeOrdinals: [1, 2, 4] },
    { id: 'l10c1_like', label: { ru: 'хочу и предпочитаю — I would like, I prefer', uk: 'хочу й віддаю перевагу — I would like, I prefer' }, episodeOrdinals: [4, 6, 7] },
    { id: 'l10c1_opinion', label: { ru: 'мнение — I agree, I disagree, I do not mind', uk: 'думка — I agree, I disagree, I do not mind' }, episodeOrdinals: [8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c1-01', type: 'situation', grammarPoint: 'l10c1_need', situation: { ru: 'Ты едешь туда и обратно. Скажи в кассе, что тебе нужен билет туда и обратно.', uk: 'Ти їдеш туди й назад. Скажи в касі, що тобі потрібен квиток туди й назад.' }, accepted: ['I need a return ticket.'] },
    { id: 'l10c1-02', type: 'situation', grammarPoint: 'l10c1_need', situation: { ru: 'Ты не хочешь пересадок. Скажи, что тебе нужен прямой поезд.', uk: 'Ти не хочеш пересадок. Скажи, що тобі потрібен прямий потяг.' }, accepted: ['I need a direct train.'] },
    { id: 'l10c1-03', type: 'situation', grammarPoint: 'l10c1_like', situation: { ru: 'В кафе попроси воды из-под крана.', uk: 'У кафе попроси води з-під крана.' }, accepted: ['I would like some tap water.', 'I would like tap water.'] },
    { id: 'l10c1-04', type: 'situation', grammarPoint: 'l10c1_like', situation: { ru: 'Хозяйка предлагает чай или кофе, а ты больше любишь чай. Скажи, что предпочитаешь чай.', uk: 'Господиня пропонує чай або каву, а ти більше любиш чай. Скажи, що віддаєш перевагу чаю.' }, accepted: ['I prefer tea.'] },
    { id: 'l10c1-05', type: 'situation', grammarPoint: 'l10c1_opinion', situation: { ru: 'Друг предлагает перенести встречу — тебе всё равно. Скажи, что ты не против.', uk: 'Друг пропонує перенести зустріч — тобі все одно. Скажи, що ти не проти.' }, accepted: ['I do not mind.', "I don't mind."] },
    { id: 'l10c1-06', type: 'situation', grammarPoint: 'l10c1_need', situation: { ru: 'В спальне перегорела лампочка. Скажи, что нужна лампочка.', uk: 'У спальні перегоріла лампочка. Скажи, що потрібна лампочка.' }, accepted: ['I need a light bulb.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c1-07', type: 'dialogue', grammarPoint: 'l10c1_opinion', partnerLine: 'This hotel is quiet.', situation: { ru: 'Скажи, что согласен с ним.', uk: 'Скажи, що погоджуєшся з ним.' }, accepted: ['I agree with you.', 'I agree.'] },
    { id: 'l10c1-08', type: 'dialogue', grammarPoint: 'l10c1_like', partnerLine: 'I usually drink decaf coffee.', situation: { ru: 'Скажи, что ты бы хотел газированной воды.', uk: 'Скажи, що ти хотів би газованої води.' }, accepted: ['I would like some sparkling water.', 'I would like sparkling water.'] },
    { id: 'l10c1-09', type: 'dialogue', grammarPoint: 'l10c1_need', partnerLine: 'I need a teaspoon.', situation: { ru: 'Скажи, что тебе тоже нужна чайная ложка.', uk: 'Скажи, що тобі теж потрібна чайна ложка.' }, accepted: ['I need a teaspoon.'] },
    { id: 'l10c1-10', type: 'dialogue', grammarPoint: 'l10c1_opinion', partnerLine: 'The hotel is noisy.', situation: { ru: 'В отеле тихо, а друг жалуется. Скажи, что ты не согласен.', uk: 'У готелі тихо, а друг скаржиться. Скажи, що ти не згоден.' }, accepted: ['I disagree.'] },
    { id: 'l10c1-11', type: 'dialogue', grammarPoint: 'l10c1_like', partnerLine: 'I like the countryside.', situation: { ru: 'Скажи, что ты предпочитаешь море.', uk: 'Скажи, що ти віддаєш перевагу морю.' }, accepted: ['I prefer the seaside.'] },
    { id: 'l10c1-12', type: 'dialogue', grammarPoint: 'l10c1_opinion', partnerLine: 'This is not my bag.', situation: { ru: 'Друг по ошибке взял не ту сумку и смущается. Скажи, что это неважно.', uk: 'Друг помилково взяв не ту сумку й ніяковіє. Скажи, що це неважливо.' }, accepted: ['It does not matter.', "It doesn't matter."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c1-13', type: 'fix', grammarPoint: 'l10c1_need', wrong: 'I needs a return ticket.', accepted: ['I need a return ticket.'] },
    { id: 'l10c1-14', type: 'fix', grammarPoint: 'l10c1_like', wrong: 'I would likes some tap water.', accepted: ['I would like some tap water.'] },
    { id: 'l10c1-15', type: 'fix', grammarPoint: 'l10c1_opinion', wrong: 'I am agree with you.', accepted: ['I agree with you.'] },
    { id: 'l10c1-16', type: 'fix', grammarPoint: 'l10c1_like', wrong: 'I prefers tea.', accepted: ['I prefer tea.'] },
  ],
};
