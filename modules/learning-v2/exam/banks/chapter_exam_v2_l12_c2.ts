// chapter_exam_v2_l12_c2.ts — банк экзамена v2: урок 12, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–16 урока 12
// (неправильные глаголы глав 1–2: chose, went, saw, had, grew, hid, rose, shook, stole, threw; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C2: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l12c2_chose', label: { ru: 'выбрал, вырастил — chose, grew', uk: 'вибрав, виростив — chose, grew' }, episodeOrdinals: [9, 10, 16] },
    { id: 'l12c2_had', label: { ru: 'ел, пил, было — had', uk: 'їв, пив, мав — had' }, episodeOrdinals: [12, 13, 14] },
    { id: 'l12c2_hid', label: { ru: 'спрятал, бросил, украли — hid, threw, stole', uk: 'сховав, кинув, вкрали — hid, threw, stole' }, episodeOrdinals: [11, 14, 15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c2-01', type: 'situation', grammarPoint: 'l12c2_chose', situation: { ru: 'У подруги день рождения. Напиши сестре, что ты выбрал открытку.', uk: 'У подруги день народження. Напиши сестрі, що ти вибрав листівку.' }, accepted: ['I chose a birthday card.'] },
    { id: 'l12c2-02', type: 'situation', grammarPoint: 'l12c2_had', situation: { ru: 'Коллега спрашивает, что ты ел на завтрак. Скажи: варёное яйцо.', uk: 'Колега питає, що ти їв на сніданок. Скажи: варене яйце.' }, accepted: ['I had a boiled egg.', 'I had a boiled egg for breakfast.'] },
    { id: 'l12c2-03', type: 'situation', grammarPoint: 'l12c2_hid', situation: { ru: 'Сестра ищет плюшевого мишку, а это ты спрятал его под кровать. Признайся.', uk: 'Сестра шукає плюшевого ведмедика, а це ти сховав його під ліжко. Зізнайся.' }, accepted: ['I hid the teddy bear under the bed.', 'I hid the teddy bear.'] },
    { id: 'l12c2-04', type: 'situation', grammarPoint: 'l12c2_hid', situation: { ru: 'В автобусе у тебя пропал кошелёк для монет. Скажи водителю, что его украли.', uk: 'В автобусі в тебе зник гаманець для монет. Скажи водієві, що його вкрали.' }, accepted: ['Someone stole my coin purse.'] },
    { id: 'l12c2-05', type: 'situation', grammarPoint: 'l12c2_chose', situation: { ru: 'Прошлым летом вы с семьёй выращивали помидоры. Расскажи об этом.', uk: 'Минулого літа ви з родиною вирощували помідори. Розкажи про це.' }, accepted: ['We grew tomatoes last summer.'] },
    { id: 'l12c2-06', type: 'situation', grammarPoint: 'l12c2_had', situation: { ru: 'Друг спрашивает про проездной. Скажи, что в прошлом месяце он у тебя был.', uk: 'Друг питає про проїзний. Скажи, що минулого місяця він у тебе був.' }, accepted: ['I had a bus pass last month.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c2-07', type: 'dialogue', grammarPoint: 'l12c2_had', partnerLine: 'We had lunch at one.', situation: { ru: 'Скажи, что после обеда ты выпил молочный коктейль.', uk: 'Скажи, що після обіду ти випив молочний коктейль.' }, accepted: ['I had a milkshake after lunch.', 'I had a milkshake.'] },
    { id: 'l12c2-08', type: 'dialogue', grammarPoint: 'l12c2_chose', partnerLine: 'I chose a bunch of flowers.', situation: { ru: 'Скажи, что вы выбрали коробку конфет.', uk: 'Скажи, що ви вибрали коробку цукерок.' }, accepted: ['We chose a box of chocolates.'] },
    { id: 'l12c2-09', type: 'dialogue', grammarPoint: 'l12c2_hid', partnerLine: 'She threw the paper plane.', situation: { ru: 'Скажи, что ты бросил теннисный мяч.', uk: 'Скажи, що ти кинув тенісний м’яч.' }, accepted: ['I threw the tennis ball.'] },
    { id: 'l12c2-10', type: 'dialogue', grammarPoint: 'l12c2_had', partnerLine: 'The grape juice was cold yesterday.', situation: { ru: 'Скажи, что ты вчера пил виноградный сок.', uk: 'Скажи, що ти вчора пив виноградний сік.' }, accepted: ['I had grape juice yesterday.', 'I had grape juice.'] },
    { id: 'l12c2-11', type: 'dialogue', grammarPoint: 'l12c2_hid', partnerLine: 'My car keys were on the table.', situation: { ru: 'Это сестра пошутила. Скажи, что ключи спрятала она.', uk: 'Це сестра пожартувала. Скажи, що ключі сховала вона.' }, accepted: ['She hid the car keys.'] },
    { id: 'l12c2-12', type: 'dialogue', grammarPoint: 'l12c2_chose', partnerLine: 'We played dominoes.', situation: { ru: 'Скажи, что ты выбрал игральные карты.', uk: 'Скажи, що ти вибрав гральні карти.' }, accepted: ['I chose playing cards.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c2-13', type: 'fix', grammarPoint: 'l12c2_chose', wrong: 'We grow tomatoes last summer.', accepted: ['We grew tomatoes last summer.'] },
    { id: 'l12c2-14', type: 'fix', grammarPoint: 'l12c2_had', wrong: 'We have breakfast at seven yesterday.', accepted: ['We had breakfast at seven yesterday.'] },
    { id: 'l12c2-15', type: 'fix', grammarPoint: 'l12c2_hid', wrong: 'Someone steal my wallet.', accepted: ['Someone stole my wallet.'] },
    { id: 'l12c2-16', type: 'fix', grammarPoint: 'l12c2_hid', wrong: 'She throw the ball to me.', accepted: ['She threw the ball to me.'] },
  ],
};
