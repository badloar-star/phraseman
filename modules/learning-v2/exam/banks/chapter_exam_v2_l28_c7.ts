// chapter_exam_v2_l28_c7.ts — банк экзамена v2: урок 28, глава 7 (эпизоды 49–56, последняя глава урока).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 7 урока 28 повторяет весь урок — что и кем сделано
// (was / were + … by), что сделают (will be + третья форма) и правила (are sold in pairs, is shared, cannot be returned) — на ремонте,
// шторах, обуви, косметике, маникюре и съёме жилья (49–56). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C7: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l28c7_was_by', label: { ru: 'что и кем сделано — was / were (+ by)', uk: 'що й ким зроблено — was / were (+ by)' }, episodeOrdinals: [49, 50, 51] },
    { id: 'l28c7_will_be', label: { ru: 'что сделают — will be + finished / delivered', uk: 'що зроблять — will be + finished / delivered' }, episodeOrdinals: [49, 50, 52] },
    { id: 'l28c7_rules', label: { ru: 'правила — is / are sold, cannot be', uk: 'правила — is / are sold, cannot be' }, episodeOrdinals: [50, 52, 53] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c7-01', type: 'situation', grammarPoint: 'l28c7_was_by', situation: { ru: 'Гость хвалит плитку в ванной. Скажи, что её положил твой брат.', uk: 'Гість хвалить плитку у ванній. Скажи, що її поклав твій брат.' }, accepted: ['The tiles were laid by my brother.'] },
    { id: 'l28c7-02', type: 'situation', grammarPoint: 'l28c7_will_be', situation: { ru: 'Хозяйка квартиры спрашивает про ремонт пола. Скажи, что работу закончат завтра.', uk: 'Господиня квартири питає про ремонт підлоги. Скажи, що роботу закінчать завтра.' }, accepted: ['The work will be finished tomorrow.'] },
    { id: 'l28c7-03', type: 'situation', grammarPoint: 'l28c7_rules', situation: { ru: 'Покупательница хочет купить одну штору. Скажи, что эти шторы продаются парой.', uk: 'Покупниця хоче купити одну штору. Скажи, що ці штори продаються парою.' }, accepted: ['These curtains are sold in pairs.'] },
    { id: 'l28c7-04', type: 'situation', grammarPoint: 'l28c7_was_by', situation: { ru: 'Коллега хвалит твой маникюр. Скажи, что ногти тебе накрасила сестра.', uk: 'Колега хвалить твій манікюр. Скажи, що нігті тобі нафарбувала сестра.' }, accepted: ['My nails were painted by my sister.'] },
    { id: 'l28c7-05', type: 'situation', grammarPoint: 'l28c7_will_be', situation: { ru: 'Будущий жилец смотрит на пыль в квартире. Скажи, что квартиру уберут завтра.', uk: 'Майбутній мешканець дивиться на пил у квартирі. Скажи, що квартиру приберуть завтра.' }, accepted: ['The flat will be cleaned tomorrow.'] },
    { id: 'l28c7-06', type: 'situation', grammarPoint: 'l28c7_rules', situation: { ru: 'Ты сдаёшь комнату. Предупреди, что ванная общая ещё с одним жильцом.', uk: 'Ти здаєш кімнату. Попередь, що ванна спільна ще з одним мешканцем.' }, accepted: ['The bathroom is shared with one other tenant.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c7-07', type: 'dialogue', grammarPoint: 'l28c7_was_by', partnerLine: 'Can I take a sample home?', situation: { ru: 'Покупательница любуется шторами у тебя в гостиной. Скажи, что их сшила твоя тётя.', uk: 'Покупниця милується шторами у тебе у вітальні. Скажи, що їх пошила твоя тітка.' }, accepted: ['The curtains were made by my aunt.'] },
    { id: 'l28c7-08', type: 'dialogue', grammarPoint: 'l28c7_will_be', partnerLine: 'Could I keep the box?', situation: { ru: 'Покупатель заказал туфли. Скажи, что туфли доставят в четверг.', uk: 'Покупець замовив туфлі. Скажи, що туфлі доставлять у четвер.' }, accepted: ['Your shoes will be delivered on Thursday.'] },
    { id: 'l28c7-09', type: 'dialogue', grammarPoint: 'l28c7_rules', partnerLine: 'This concealer is too dark.', situation: { ru: 'Тюбик уже открыт. Скажи, что этот товар вернуть нельзя.', uk: 'Тюбик уже відкритий. Скажи, що цей товар повернути не можна.' }, accepted: ['This product cannot be returned.'] },
    { id: 'l28c7-10', type: 'dialogue', grammarPoint: 'l28c7_was_by', partnerLine: 'Can I walk around in these?', situation: { ru: 'Друг хвалит твои сапоги. Скажи, что их починил местный сапожник.', uk: 'Друг хвалить твої чоботи. Скажи, що їх полагодив місцевий швець.' }, accepted: ['My boots were repaired by a local shoemaker.'] },
    { id: 'l28c7-11', type: 'dialogue', grammarPoint: 'l28c7_will_be', partnerLine: 'This slat is broken.', situation: { ru: 'Ты мастер. Скажи, что жалюзи починят в пятницу.', uk: 'Ти майстер. Скажи, що жалюзі полагодять у п’ятницю.' }, accepted: ['The blinds will be repaired on Friday.'] },
    { id: 'l28c7-12', type: 'dialogue', grammarPoint: 'l28c7_rules', partnerLine: 'How much is this bronzer?', situation: { ru: 'Покупательница думает, что кисть в комплекте. Скажи, что кисть продаётся отдельно.', uk: 'Покупниця думає, що пензлик у комплекті. Скажи, що пензлик продається окремо.' }, accepted: ['The brush is sold separately.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c7-13', type: 'fix', grammarPoint: 'l28c7_was_by', wrong: 'The kitchen was painted from the owner.', accepted: ['The kitchen was painted by the owner.'] },
    { id: 'l28c7-14', type: 'fix', grammarPoint: 'l28c7_will_be', wrong: 'The materials will delivered on Monday.', accepted: ['The materials will be delivered on Monday.'] },
    { id: 'l28c7-15', type: 'fix', grammarPoint: 'l28c7_rules', wrong: 'These shoes is sold in pairs.', accepted: ['These shoes are sold in pairs.'] },
    { id: 'l28c7-16', type: 'fix', grammarPoint: 'l28c7_was_by', wrong: 'The windows was replaced last year.', accepted: ['The windows were replaced last year.'] },
  ],
};
