// chapter_exam_v2_l08_c3.ts — банк экзамена v2: урок 8, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: глава учит просьбам «Can you…?», поэтому главная тема — просьба со знаком «?» (запрет «?» с 92b29de96 только для урока 1); рядом
// предложение помощи «I can + действие», «I can't» и «often» из тех же эпизодов (lend, pass, reserve, explain, read, adjust).
// Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C3: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l08c3_offer', label: { ru: 'предложить помощь — I can + действие', uk: 'запропонувати допомогу — I can + дія' }, episodeOrdinals: [22, 23, 24] },
    { id: 'l08c3_cant', label: { ru: 'не получается — I can\'t', uk: 'не виходить — I can\'t' }, episodeOrdinals: [17, 18] },
    { id: 'l08c3_often', label: { ru: 'часто — I often + действие', uk: 'часто — I often + дія' }, episodeOrdinals: [19, 20, 21] },
    { id: 'l08c3_request', label: { ru: 'попросить — Can you…?', uk: 'попросити — Can you…?' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c3-01', type: 'situation', grammarPoint: 'l08c3_request', situation: { ru: 'Хочешь написать пожелание в гостевой книге, а ручки нет. Попроси соседа одолжить тебе ручку.', uk: 'Хочеш написати побажання в гостьовій книзі, а ручки немає. Попроси сусіда позичити тобі ручку.' }, accepted: ['Can you lend me a pen?'] },
    { id: 'l08c3-02', type: 'situation', grammarPoint: 'l08c3_request', situation: { ru: 'Ключ лежит на другом краю стола. Попроси передать тебе ключ.', uk: 'Ключ лежить на іншому краю столу. Попроси передати тобі ключ.' }, accepted: ['Can you pass me the key?'] },
    { id: 'l08c3-03', type: 'situation', grammarPoint: 'l08c3_request', situation: { ru: 'Друг звонит в ресторан. Попроси его заказать столик.', uk: 'Друг телефонує в ресторан. Попроси його замовити столик.' }, accepted: ['Can you reserve a table?'] },
    { id: 'l08c3-04', type: 'situation', grammarPoint: 'l08c3_offer', situation: { ru: 'Экскурсанты запутались, куда идти дальше. Скажи, что можешь объяснить маршрут.', uk: 'Екскурсанти заплуталися, куди йти далі. Скажи, що можеш пояснити маршрут.' }, accepted: ['I can explain the itinerary.', 'I can explain it.'] },
    { id: 'l08c3-05', type: 'situation', grammarPoint: 'l08c3_often', situation: { ru: 'Новый знакомый спрашивает, чем ты занят вечерами, — ты много рисуешь. Скажи, что часто рисуешь.', uk: 'Новий знайомий питає, чим ти зайнятий вечорами, — ти багато малюєш. Скажи, що часто малюєш.' }, accepted: ['I often draw.'] },
    { id: 'l08c3-06', type: 'situation', grammarPoint: 'l08c3_cant', situation: { ru: 'Бутылку с пробкой никак не открыть. Скажи, что не можешь её открыть.', uk: 'Пляшку з корком ніяк не відкрити. Скажи, що не можеш її відкрити.' }, accepted: ["I can't open it."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c3-07', type: 'dialogue', grammarPoint: 'l08c3_offer', partnerLine: "I can't open it.", situation: { ru: 'Подруга мучается с банкой. Скажи, что ты можешь открыть.', uk: 'Подруга мучиться з банкою. Скажи, що ти можеш відкрити.' }, accepted: ['I can open it.'] },
    { id: 'l08c3-08', type: 'dialogue', grammarPoint: 'l08c3_often', partnerLine: 'I often write.', situation: { ru: 'Скажи, что ты часто готовишь.', uk: 'Скажи, що ти часто готуєш.' }, accepted: ['I often cook.'] },
    { id: 'l08c3-09', type: 'dialogue', grammarPoint: 'l08c3_request', partnerLine: 'I can explain.', situation: { ru: 'Новое правило игры тебе непонятно. Попроси друга объяснить его.', uk: 'Нове правило гри тобі незрозуміле. Попроси друга пояснити його.' }, accepted: ['Can you explain it?'] },
    { id: 'l08c3-10', type: 'dialogue', grammarPoint: 'l08c3_cant', partnerLine: 'I can drive.', situation: { ru: 'Вы решаете, кто повезёт гостей. Скажи, что ты водить не умеешь.', uk: 'Ви вирішуєте, хто повезе гостей. Скажи, що ти водити не вмієш.' }, accepted: ["I can't drive."] },
    { id: 'l08c3-11', type: 'dialogue', grammarPoint: 'l08c3_offer', partnerLine: "I can't adjust the lamp.", situation: { ru: 'Свет падает мимо. Скажи, что ты можешь поправить лампу.', uk: 'Світло падає повз. Скажи, що ти можеш поправити лампу.' }, accepted: ['I can adjust the lamp.', 'I can adjust it.'] },
    { id: 'l08c3-12', type: 'dialogue', grammarPoint: 'l08c3_often', partnerLine: 'I often cook.', situation: { ru: 'Скажи, что ты часто пишешь.', uk: 'Скажи, що ти часто пишеш.' }, accepted: ['I often write.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c3-13', type: 'fix', grammarPoint: 'l08c3_offer', wrong: 'I can explains it.', accepted: ['I can explain it.'] },
    { id: 'l08c3-14', type: 'fix', grammarPoint: 'l08c3_cant', wrong: "I can't to open it.", accepted: ["I can't open it."] },
    { id: 'l08c3-15', type: 'fix', grammarPoint: 'l08c3_often', wrong: 'I draw often.', accepted: ['I often draw.'] },
    { id: 'l08c3-16', type: 'fix', grammarPoint: 'l08c3_request', wrong: 'Can you to hold this?', accepted: ['Can you hold this?'] },
  ],
};
