// chapter_exam_v2_l12_c1.ts — банк экзамена v2: урок 12, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–8 урока 12
// (урок 12 вводит прошедшее время: глагол + ed, у глаголов на -e — только d, и was / were; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C1: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l12c1_ed', label: { ru: 'сделал — глагол + ed', uk: 'зробив — дієслово + ed' }, episodeOrdinals: [2, 4, 8] },
    { id: 'l12c1_e_d', label: { ru: 'на -e — только d (used, moved)', uk: 'на -e — лише d (used, moved)' }, episodeOrdinals: [3, 5, 7] },
    { id: 'l12c1_was_were', label: { ru: 'было — was / were', uk: 'було — was / were' }, episodeOrdinals: [5, 6, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c1-01', type: 'situation', grammarPoint: 'l12c1_ed', situation: { ru: 'Сосед удивляется, какая яркая у тебя калитка. Скажи, что ты покрасил её вчера.', uk: 'Сусід дивується, яка яскрава в тебе хвіртка. Скажи, що ти пофарбував її вчора.' }, accepted: ['I painted the garden gate yesterday.', 'I painted the garden gate.'] },
    { id: 'l12c1-02', type: 'situation', grammarPoint: 'l12c1_e_d', situation: { ru: 'Друг спрашивает, где вчера стояла твоя машина. Скажи, что ты припарковался у банка.', uk: 'Друг питає, де вчора стояла твоя машина. Скажи, що ти припаркувався біля банку.' }, accepted: ['I parked near the bank yesterday.', 'I parked near the bank.'] },
    { id: 'l12c1-03', type: 'situation', grammarPoint: 'l12c1_ed', situation: { ru: 'Ты опоздал на работу. Объясни коллеге, что стоял в пробке.', uk: 'Ти запізнився на роботу. Поясни колезі, що стояв у заторі.' }, accepted: ['I waited in a traffic jam.'] },
    { id: 'l12c1-04', type: 'situation', grammarPoint: 'l12c1_e_d', situation: { ru: 'Обычный ключ потерялся, но дверь ты открыл. Скажи, что воспользовался запасным ключом.', uk: 'Звичайний ключ загубився, але двері ти відчинив. Скажи, що скористався запасним ключем.' }, accepted: ['I used the spare key.', 'I used the spare key yesterday.'] },
    { id: 'l12c1-05', type: 'situation', grammarPoint: 'l12c1_was_were', situation: { ru: 'Друг видит, что ты чистил резиновые сапоги. Объясни: вчера они были мокрые.', uk: 'Друг бачить, що ти чистив гумові чоботи. Поясни: учора вони були мокрі.' }, accepted: ['The rain boots were wet yesterday.', 'The rain boots were wet.'] },
    { id: 'l12c1-06', type: 'situation', grammarPoint: 'l12c1_was_were', situation: { ru: 'Ты мыл лобовое стекло машины. Объясни, что вчера оно было грязное.', uk: 'Ти мив лобове скло машини. Поясни, що вчора воно було брудне.' }, accepted: ['The windscreen was dirty yesterday.', 'The windscreen was dirty.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c1-07', type: 'dialogue', grammarPoint: 'l12c1_ed', partnerLine: 'The steering wheel was dirty.', situation: { ru: 'Скажи, что ты уже почистил руль вчера.', uk: 'Скажи, що ти вже почистив кермо вчора.' }, accepted: ['I cleaned the steering wheel yesterday.', 'I cleaned the steering wheel.'] },
    { id: 'l12c1-08', type: 'dialogue', grammarPoint: 'l12c1_e_d', partnerLine: 'The folding chair was near the window yesterday.', situation: { ru: 'Скажи, что вы его передвинули.', uk: 'Скажи, що ви його пересунули.' }, accepted: ['We moved the folding chair.', 'We moved the chair.'] },
    { id: 'l12c1-09', type: 'dialogue', grammarPoint: 'l12c1_ed', partnerLine: 'Please untie your shoes.', situation: { ru: 'Ты уже это сделал. Скажи, что развязал шнурки.', uk: 'Ти вже це зробив. Скажи, що розв’язав шнурки.' }, accepted: ['I untied my shoes.'] },
    { id: 'l12c1-10', type: 'dialogue', grammarPoint: 'l12c1_was_were', partnerLine: 'I washed the car yesterday.', situation: { ru: 'Скажи, что машина вчера была грязная.', uk: 'Скажи, що машина вчора була брудна.' }, accepted: ['The car was dirty yesterday.', 'The car was dirty.'] },
    { id: 'l12c1-11', type: 'dialogue', grammarPoint: 'l12c1_e_d', partnerLine: 'We cycled along the cycle path yesterday.', situation: { ru: 'Скажи, что ты тоже вчера катался по велодорожке.', uk: 'Скажи, що ти теж учора катався велодоріжкою.' }, accepted: ['I cycled along the cycle path yesterday.', 'I cycled along the cycle path.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c1-12', type: 'fix', grammarPoint: 'l12c1_ed', wrong: 'I wash the windscreen yesterday.', accepted: ['I washed the windscreen yesterday.'] },
    { id: 'l12c1-13', type: 'fix', grammarPoint: 'l12c1_e_d', wrong: 'I use the spare key yesterday.', accepted: ['I used the spare key yesterday.'] },
    { id: 'l12c1-14', type: 'fix', grammarPoint: 'l12c1_was_were', wrong: 'The rain boots was wet yesterday.', accepted: ['The rain boots were wet yesterday.'] },
    { id: 'l12c1-15', type: 'fix', grammarPoint: 'l12c1_was_were', wrong: 'The windscreen were dirty yesterday.', accepted: ['The windscreen was dirty yesterday.'] },
  ],
};
