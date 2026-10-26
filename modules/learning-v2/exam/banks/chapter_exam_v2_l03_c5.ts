// chapter_exam_v2_l03_c5.ts — банк экзамена v2: урок 3, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 5 урока 3 — these (несколько рядом) и those (несколько
// далеко), выбор this / that / these / those по числу и расстоянию (33–40). Ситуация всегда говорит, сколько вещей и где они.
// Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C5: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l03c5_these', label: { ru: 'несколько рядом — These … are', uk: 'кілька поруч — These … are' }, episodeOrdinals: [33, 35, 38] },
    { id: 'l03c5_those', label: { ru: 'несколько далеко — Those … are', uk: 'кілька далеко — Those … are' }, episodeOrdinals: [34, 36, 39] },
    { id: 'l03c5_this_or_these', label: { ru: 'один или несколько: this / these, that / those', uk: 'один чи кілька: this / these, that / those' }, episodeOrdinals: [35, 37, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c5-01', type: 'situation', grammarPoint: 'l03c5_these', situation: { ru: 'Ты показываешь подруге туфли, которые держишь в руках. Скажи, что эти туфли новые.', uk: 'Ти показуєш подрузі туфлі, які тримаєш у руках. Скажи, що ці туфлі нові.' }, accepted: ['These shoes are new.'] },
    { id: 'l03c5-02', type: 'situation', grammarPoint: 'l03c5_those', situation: { ru: 'В дальнем конце магазина лежат пушистые одеяла. Скажи, что те одеяла мягкие.', uk: 'У дальньому кінці магазину лежать пухнасті ковдри. Скажи, що ті ковдри м’які.' }, accepted: ['Those blankets are soft.'] },
    { id: 'l03c5-03', type: 'situation', grammarPoint: 'l03c5_this_or_these', situation: { ru: 'У тебя в руке одна пожелтевшая фотография. Скажи, что это фото старое.', uk: 'У тебе в руці одна пожовкла фотографія. Скажи, що це фото старе.' }, accepted: ['This photo is old.'] },
    { id: 'l03c5-04', type: 'situation', grammarPoint: 'l03c5_these', situation: { ru: 'На рынке ты взял в руки несколько груш. Скажи продавцу, что эти груши мягкие.', uk: 'На ринку ти взяв у руки кілька груш. Скажи продавцеві, що ці груші м’які.' }, accepted: ['These pears are soft.'] },
    { id: 'l03c5-05', type: 'situation', grammarPoint: 'l03c5_those', situation: { ru: 'Сын тянет тебя к игрушкам в дальней витрине. Скажи, что те игрушки новые.', uk: 'Син тягне тебе до іграшок у дальній вітрині. Скажи, що ті іграшки нові.' }, accepted: ['Those toys are new.'] },
    { id: 'l03c5-06', type: 'situation', grammarPoint: 'l03c5_this_or_these', situation: { ru: 'В конце коридора один выход. Спроси охранника, открыт ли тот выход.', uk: 'У кінці коридору один вихід. Запитай охоронця, чи відчинений той вихід.' }, accepted: ['Is that exit open?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c5-07', type: 'dialogue', grammarPoint: 'l03c5_these', partnerLine: 'Are these shirts old?', situation: { ru: 'Рубашки у тебя в руках только что из магазина. Скажи, что эти рубашки новые.', uk: 'Сорочки в тебе в руках щойно з магазину. Скажи, що ці сорочки нові.' }, accepted: ['These shirts are new.'] },
    { id: 'l03c5-08', type: 'dialogue', grammarPoint: 'l03c5_those', partnerLine: 'Those apples are expensive.', situation: { ru: 'Возрази: те яблоки на дальнем прилавке дешёвые.', uk: 'Заперечи: ті яблука на дальньому прилавку дешеві.' }, accepted: ['Those apples are cheap.'] },
    { id: 'l03c5-09', type: 'dialogue', grammarPoint: 'l03c5_this_or_these', partnerLine: 'These frames are old.', situation: { ru: 'Возрази про одну рамку у тебя в руке: эта рамка новая.', uk: 'Заперечи про одну рамку в тебе в руці: ця рамка нова.' }, accepted: ['This frame is new.'] },
    { id: 'l03c5-10', type: 'dialogue', grammarPoint: 'l03c5_these', partnerLine: 'These lemons are expensive.', situation: { ru: 'Возрази: лимоны у тебя в корзине дешёвые.', uk: 'Заперечи: лимони в тебе в кошику дешеві.' }, accepted: ['These lemons are cheap.'] },
    { id: 'l03c5-11', type: 'dialogue', grammarPoint: 'l03c5_those', partnerLine: 'Are those flowers old?', situation: { ru: 'Цветы в дальней вазе срезали утром. Скажи, что те цветы свежие.', uk: 'Квіти в дальній вазі зрізали вранці. Скажи, що ті квіти свіжі.' }, accepted: ['Those flowers are fresh.'] },
    { id: 'l03c5-12', type: 'dialogue', grammarPoint: 'l03c5_this_or_these', partnerLine: 'Those trees are big.', situation: { ru: 'Возрази про одно дерево вдали: то дерево маленькое.', uk: 'Заперечи про одне дерево вдалині: те дерево маленьке.' }, accepted: ['That tree is small.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c5-13', type: 'fix', grammarPoint: 'l03c5_these', wrong: 'These shoe are new.', accepted: ['These shoes are new.'] },
    { id: 'l03c5-14', type: 'fix', grammarPoint: 'l03c5_those', wrong: 'Those blanket is soft.', accepted: ['Those blankets are soft.', 'That blanket is soft.'] },
    { id: 'l03c5-15', type: 'fix', grammarPoint: 'l03c5_this_or_these', wrong: 'This photos are old.', accepted: ['These photos are old.', 'This photo is old.'] },
    { id: 'l03c5-16', type: 'fix', grammarPoint: 'l03c5_this_or_these', wrong: 'That bicycle are cheap.', accepted: ['That bicycle is cheap.', 'Those bicycles are cheap.'] },
  ],
};
