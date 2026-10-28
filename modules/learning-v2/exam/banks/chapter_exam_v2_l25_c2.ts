// chapter_exam_v2_l25_c2.ts — банк экзамена v2: урок 25, глава 2 (эпизоды 9–16). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–16 урока 25 — would для того, что делали тогда (In those days we would…), и used to be для
// того, каким было (с would так не говорят). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C2: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l25c2_would', label: { ru: 'что делали тогда — we would play', uk: 'що робили тоді — we would play' }, episodeOrdinals: [9, 10, 11] },
    { id: 'l25c2_used_be', label: { ru: 'каким было тогда — used to be, used to have', uk: 'яким було тоді — used to be, used to have' }, episodeOrdinals: [10, 12, 14] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c2-01', type: 'situation', grammarPoint: 'l25c2_would', situation: { ru: 'Ты вспоминаешь каникулы у озера. Скажи, что тогда вы рано утром наблюдали за дикими животными.', uk: 'Ти згадуєш канікули біля озера. Скажи, що тоді ви рано вранці спостерігали за дикими тваринами.' }, accepted: ['In those days we would watch wildlife early in the morning.', 'Back then we would watch wildlife early in the morning.'] },
    { id: 'l25c2-02', type: 'situation', grammarPoint: 'l25c2_would', situation: { ru: 'Расскажи про летние каникулы: каждый вечер вы играли в карты.', uk: 'Розкажи про літні канікули: щовечора ви грали в карти.' }, accepted: ['In those days we would play cards every evening.', 'During those holidays we would play cards every evening.', 'Back then we would play cards every evening.'] },
    { id: 'l25c2-03', type: 'situation', grammarPoint: 'l25c2_would', situation: { ru: 'Ты рассказываешь о школе: вы с ребятами делали бумажные ракеты.', uk: 'Ти розповідаєш про школу: ви з дітьми робили паперові ракети.' }, accepted: ['At school we would build paper rockets.', 'In those days we would build paper rockets.'] },
    { id: 'l25c2-04', type: 'situation', grammarPoint: 'l25c2_used_be', situation: { ru: 'Друг удивляется, что ты спишь без ночника. Скажи, что раньше боялся темноты.', uk: 'Друг дивується, що ти спиш без нічника. Скажи, що раніше боявся темряви.' }, accepted: ['I used to be afraid of the dark.'] },
    { id: 'l25c2-05', type: 'situation', grammarPoint: 'l25c2_would', situation: { ru: 'Вспомни детство: ночью ты на цыпочках спускался по лестнице.', uk: 'Згадай дитинство: уночі ти навшпиньки спускався сходами.' }, accepted: ['In those days I would tiptoe downstairs at night.', 'Back then I would tiptoe downstairs at night.'] },
    { id: 'l25c2-06', type: 'situation', grammarPoint: 'l25c2_would', situation: { ru: 'Расскажи, как по воскресеньям дедушка рассказывал вам истории за ужином.', uk: 'Розкажи, як щонеділі дідусь розповідав вам історії за вечерею.' }, accepted: ['On Sundays our grandfather would tell us stories at dinner.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c2-07', type: 'dialogue', grammarPoint: 'l25c2_used_be', partnerLine: 'You played well today.', situation: { ru: 'Скажи, что раньше ты был медленнее.', uk: 'Скажи, що раніше ти був повільнішим.' }, accepted: ['I used to be slower.'] },
    { id: 'l25c2-08', type: 'dialogue', grammarPoint: 'l25c2_would', partnerLine: 'Our team plays in a local league.', situation: { ru: 'Скажи, что в школе вы тоже играли в местной лиге.', uk: 'Скажи, що в школі ви теж грали в місцевій лізі.' }, accepted: ['At school we would play in a local league too.', 'At school we would play in a local league.'] },
    { id: 'l25c2-09', type: 'dialogue', grammarPoint: 'l25c2_used_be', partnerLine: 'I like your new hairstyle.', situation: { ru: 'Скажи, что раньше у тебя были тёмные волосы.', uk: 'Скажи, що раніше в тебе було темне волосся.' }, accepted: ['I used to have dark hair.'] },
    { id: 'l25c2-10', type: 'dialogue', grammarPoint: 'l25c2_would', partnerLine: 'Please do not slurp your soup.', situation: { ru: 'Признайся: в детстве ты хлюпал супом.', uk: 'Зізнайся: у дитинстві ти сьорбав суп.' }, accepted: ['As a child I would slurp my soup.'] },
    { id: 'l25c2-11', type: 'dialogue', grammarPoint: 'l25c2_would', partnerLine: 'Do not peek!', situation: { ru: 'Признайся: в детстве вы подглядывали из-за штор.', uk: 'Зізнайся: у дитинстві ви підглядали з-за штор.' }, accepted: ['As children we would peek through the curtains.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c2-12', type: 'fix', grammarPoint: 'l25c2_would', wrong: 'In those days we would to watch wildlife.', accepted: ['In those days we would watch wildlife.'] },
    { id: 'l25c2-13', type: 'fix', grammarPoint: 'l25c2_used_be', wrong: 'I use to be slower.', accepted: ['I used to be slower.'] },
    { id: 'l25c2-14', type: 'fix', grammarPoint: 'l25c2_would', wrong: 'As children we would dressed our dolls.', accepted: ['As children we would dress our dolls.'] },
    { id: 'l25c2-15', type: 'fix', grammarPoint: 'l25c2_used_be', wrong: 'I used to was afraid of the dark.', accepted: ['I used to be afraid of the dark.'] },
  ],
};
