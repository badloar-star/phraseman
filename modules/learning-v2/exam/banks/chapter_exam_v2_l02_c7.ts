// chapter_exam_v2_l02_c7.ts — банк экзамена v2: урок 2, глава 7 (эпизоды 49–56, последняя глава урока).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 7 урока 2 — одежда, вещи и цена, почерк, тренировка,
// выступление, собака, аэропорт (49–56) средствами урока: сказать, сказать с not, спросить «да / нет» и who.
// Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C7: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l02c7_statement', label: { ru: 'сказать и сказать с not', uk: 'сказати й сказати з not' }, episodeOrdinals: [49, 51, 52] },
    { id: 'l02c7_yes_no_question', label: { ru: 'вопрос: Is it / Is she …?', uk: 'питання: Is it / Is she …?' }, episodeOrdinals: [50, 53, 55] },
    { id: 'l02c7_wh_question', label: { ru: 'вопрос: Who …?', uk: 'питання: Who …?' }, episodeOrdinals: [54, 55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c7-01', type: 'situation', grammarPoint: 'l02c7_statement', situation: { ru: 'Рубашка сутки пролежала в чемодане. Скажи, что она мятая.', uk: 'Сорочка добу пролежала у валізі. Скажи, що вона зім’ята.' }, accepted: ['It is wrinkled.', "It's wrinkled."] },
    { id: 'l02c7-02', type: 'situation', grammarPoint: 'l02c7_yes_no_question', situation: { ru: 'В витрине лежит новый телефон без ценника. Спроси продавца, дорогой ли он.', uk: 'У вітрині лежить новий телефон без цінника. Запитай продавця, чи він дорогий.' }, accepted: ['Is it pricey?'] },
    { id: 'l02c7-03', type: 'situation', grammarPoint: 'l02c7_wh_question', situation: { ru: 'Хозяйка питомника хвалит своих собак. Спроси, кто из них послушный.', uk: 'Господиня розплідника хвалить своїх собак. Запитай, хто з них слухняний.' }, accepted: ['Who is obedient?'] },
    { id: 'l02c7-04', type: 'situation', grammarPoint: 'l02c7_statement', situation: { ru: 'Аптекарь не может разобрать рецепт врача. Скажи, что почерк неразборчивый.', uk: 'Аптекар не може розібрати рецепт лікаря. Скажи, що почерк нерозбірливий.' }, accepted: ['It is not legible.', "It's not legible."] },
    { id: 'l02c7-05', type: 'situation', grammarPoint: 'l02c7_yes_no_question', situation: { ru: 'Ты впервые пришёл на тренировку. Спроси тренера, тяжело ли будет.', uk: 'Ти вперше прийшов на тренування. Запитай тренера, чи буде важко.' }, accepted: ['Is it tough?'] },
    { id: 'l02c7-06', type: 'situation', grammarPoint: 'l02c7_statement', situation: { ru: 'В аэропорту толпы, объявления, все бегут. Напиши другу, что тут суматоха.', uk: 'В аеропорту натовпи, оголошення, усі біжать. Напиши другові, що тут метушня.' }, accepted: ['It is hectic.', "It's hectic.", 'It is crowded.', "It's crowded."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c7-07', type: 'dialogue', grammarPoint: 'l02c7_wh_question', partnerLine: 'They are restless.', situation: { ru: 'Стюардесса жалуется на детей в салоне. Спроси, кто именно не может усидеть.', uk: 'Стюардеса скаржиться на дітей у салоні. Запитай, хто саме не може всидіти.' }, accepted: ['Who is restless?'] },
    { id: 'l02c7-08', type: 'dialogue', grammarPoint: 'l02c7_yes_no_question', partnerLine: 'It is stylish.', situation: { ru: 'Продавец хвалит свитер. Спроси, тянется ли он.', uk: 'Продавець хвалить светр. Запитай, чи він тягнеться.' }, accepted: ['Is it stretchy?'] },
    { id: 'l02c7-09', type: 'dialogue', grammarPoint: 'l02c7_statement', partnerLine: 'It is clean.', situation: { ru: 'Возрази: на скатерти пятно от вина.', uk: 'Заперечи: на скатертині пляма від вина.' }, accepted: ['It is stained.', "It's stained.", 'It is not clean.', "It's not clean."] },
    { id: 'l02c7-10', type: 'dialogue', grammarPoint: 'l02c7_wh_question', partnerLine: 'He is talented.', situation: { ru: 'Подруга в восторге от пианиста, которого ты не знаешь. Спроси, кто он.', uk: 'Подруга в захваті від піаніста, якого ти не знаєш. Запитай, хто він.' }, accepted: ['Who is he?'] },
    { id: 'l02c7-11', type: 'dialogue', grammarPoint: 'l02c7_yes_no_question', partnerLine: 'She is calm.', situation: { ru: 'Хозяин рассказывает про свою собаку. Спроси, пугливая ли она.', uk: 'Господар розповідає про свою собаку. Запитай, чи вона полохлива.' }, accepted: ['Is she timid?'] },
    { id: 'l02c7-12', type: 'dialogue', grammarPoint: 'l02c7_statement', partnerLine: 'It is fancy.', situation: { ru: 'Возрази: платье совсем простое, без украшений.', uk: 'Заперечи: сукня зовсім проста, без прикрас.' }, accepted: ['It is plain.', "It's plain.", 'It is not fancy.', "It's not fancy."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c7-13', type: 'fix', grammarPoint: 'l02c7_wh_question', wrong: 'Who talented is?', accepted: ['Who is talented?'] },
    { id: 'l02c7-14', type: 'fix', grammarPoint: 'l02c7_yes_no_question', wrong: 'Are it legible?', accepted: ['Is it legible?'] },
    { id: 'l02c7-15', type: 'fix', grammarPoint: 'l02c7_statement', wrong: 'They not are smelly.', accepted: ['They are not smelly.', "They're not smelly."] },
    { id: 'l02c7-16', type: 'fix', grammarPoint: 'l02c7_yes_no_question', wrong: 'Is they fancy?', accepted: ['Are they fancy?'] },
  ],
};
