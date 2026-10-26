// chapter_exam_v2_l22_c1.ts — банк экзамена v2: урок 22, глава 1 (эпизоды 1–8).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–8 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 1 — после глагола him, her, them, you, it (эпизоды 1–8). Вопросы «Could I…» из эпизодов 5–7 здесь — утверждением с I can.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C1: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l22c1_him_her', label: { ru: 'его / её — him, her', uk: 'його / її — him, her' }, episodeOrdinals: [1, 3, 4] },
    { id: 'l22c1_them_you', label: { ru: 'их / тебя — them, you', uk: 'їх / тебе — them, you' }, episodeOrdinals: [1, 2, 4] },
    { id: 'l22c1_it_them', label: { ru: 'это / их — it, them', uk: 'це / їх — it, them' }, episodeOrdinals: [5, 6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c1-01', type: 'situation', grammarPoint: 'l22c1_him_her', situation: { ru: 'У подруги сегодня день рождения. Скажи, что хочешь её поздравить.', uk: 'У подруги сьогодні день народження. Скажи, що хочеш її привітати.' }, accepted: ['I want to congratulate her.'] },
    { id: 'l22c1-02', type: 'situation', grammarPoint: 'l22c1_him_her', situation: { ru: 'Брат не знает, какую работу выбрать. Скажи, что можешь дать ему совет.', uk: 'Брат не знає, яку роботу обрати. Скажи, що можеш дати йому пораду.' }, accepted: ['I can advise him.'] },
    { id: 'l22c1-03', type: 'situation', grammarPoint: 'l22c1_them_you', situation: { ru: 'Друзья устали от шумной вечеринки. Скажи, что не хочешь их раздражать.', uk: 'Друзі втомилися від галасливої вечірки. Скажи, що не хочеш їх дратувати.' }, accepted: ['I do not want to annoy them.'] },
    { id: 'l22c1-04', type: 'situation', grammarPoint: 'l22c1_them_you', situation: { ru: 'Ты рассказываешь другу о родителях. Скажи, что восхищаешься ими.', uk: 'Ти розповідаєш другові про батьків. Скажи, що захоплюєшся ними.' }, accepted: ['I admire them.', 'I appreciate them.'] },
    { id: 'l22c1-05', type: 'situation', grammarPoint: 'l22c1_it_them', situation: { ru: 'Шнурки на ботинке ребёнка запутались. Скажи, что можешь их распутать.', uk: 'Шнурки на черевику дитини заплуталися. Скажи, що можеш їх розплутати.' }, accepted: ['I can untangle them.'] },
    { id: 'l22c1-06', type: 'situation', grammarPoint: 'l22c1_it_them', situation: { ru: 'Вы купили продукты, и сосед не знает итог. Скажи, что можешь всё посчитать.', uk: 'Ви купили продукти, і сусід не знає підсумку. Скажи, що можеш усе порахувати.' }, accepted: ['I can add them up.', 'I can add up these prices.', 'I can calculate it.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c1-07', type: 'dialogue', grammarPoint: 'l22c1_him_her', partnerLine: 'She is upset.', situation: { ru: 'Подруга расстроена после ссоры. Скажи, что хочешь её утешить.', uk: 'Подруга засмучена після сварки. Скажи, що хочеш її втішити.' }, accepted: ['I want to comfort her.', 'I want to support her.'] },
    { id: 'l22c1-08', type: 'dialogue', grammarPoint: 'l22c1_him_her', partnerLine: 'This is his story.', situation: { ru: 'Соседка показывает рассказ, который написал её сын. Скажи, что хочешь его похвалить.', uk: 'Сусідка показує оповідання, яке написав її син. Скажи, що хочеш його похвалити.' }, accepted: ['I want to praise him.'] },
    { id: 'l22c1-09', type: 'dialogue', grammarPoint: 'l22c1_them_you', partnerLine: 'I want to support you.', situation: { ru: 'Друг обещает поддержать тебя перед трудным разговором. Скажи, что ценишь его.', uk: 'Друг обіцяє підтримати тебе перед важкою розмовою. Скажи, що цінуєш його.' }, accepted: ['I appreciate you.'] },
    { id: 'l22c1-10', type: 'dialogue', grammarPoint: 'l22c1_them_you', partnerLine: 'This story can amuse them.', situation: { ru: 'Коллега хочет развеселить детей. Согласись: эта история может их развеселить.', uk: 'Колега хоче розвеселити дітей. Погодься: ця історія може їх розвеселити.' }, accepted: ['This story can amuse them.', 'That story can amuse them.'] },
    { id: 'l22c1-11', type: 'dialogue', grammarPoint: 'l22c1_it_them', partnerLine: 'This number is not round.', situation: { ru: 'Сумма в счёте неровная. Скажи, что можешь округлить её вниз.', uk: 'Сума в рахунку неокругла. Скажи, що можеш округлити її вниз.' }, accepted: ['I can round it down.', 'I can round down this number.'] },
    { id: 'l22c1-12', type: 'dialogue', grammarPoint: 'l22c1_it_them', partnerLine: 'I can drain the potatoes.', situation: { ru: 'Друг предлагает слить воду с картошки. Скажи, что это можешь сделать ты.', uk: 'Друг пропонує злити воду з картоплі. Скажи, що це можеш зробити ти.' }, accepted: ['I can drain them.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c1-13', type: 'fix', grammarPoint: 'l22c1_him_her', wrong: 'I want to congratulate she.', accepted: ['I want to congratulate her.'] },
    { id: 'l22c1-14', type: 'fix', grammarPoint: 'l22c1_him_her', wrong: 'I can advise he.', accepted: ['I can advise him.'] },
    { id: 'l22c1-15', type: 'fix', grammarPoint: 'l22c1_them_you', wrong: 'I admire they.', accepted: ['I admire them.'] },
    { id: 'l22c1-16', type: 'fix', grammarPoint: 'l22c1_it_them', wrong: 'I can estimate.', accepted: ['I can estimate it.'] },
  ],
};
