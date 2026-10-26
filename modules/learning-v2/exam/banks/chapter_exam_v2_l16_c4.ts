// chapter_exam_v2_l16_c4.ts — банк экзамена v2: урок 16, глава 4 (эпизоды 25–32). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 4 — «I'll + глагол»: предложить помощь на кухне, при сборке и упаковке, в офисе и с вещами. Только слова и формы эпизодов 1–32 урока 16; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L16_C4: ChapterExamV2Bank = {
  lessonOrdinal: 16,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l16c4_kitchen', label: { ru: "на кухне: I'll top up / heat up / pour out …", uk: "на кухні: I'll top up / heat up / pour out …" }, episodeOrdinals: [25, 26] },
    { id: 'l16c4_build_pack', label: { ru: "собрать и упаковать: I'll take apart / wrap up / set up …", uk: "зібрати й запакувати: I'll take apart / wrap up / set up …" }, episodeOrdinals: [27, 28, 29] },
    { id: 'l16c4_office_turn', label: { ru: "подвинуться, исправить, перевернуть: I'll move over / use … / turn …", uk: "посунутись, виправити, перевернути: I'll move over / use … / turn …" }, episodeOrdinals: [30, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l16c4-01', type: 'situation', grammarPoint: 'l16c4_kitchen', situation: { ru: 'У гостя опустел бокал. Предложи подлить.', uk: 'У гостя спорожнів келих. Запропонуй долити.' }, accepted: ["I'll top up your glass."] },
    { id: 'l16c4-02', type: 'situation', grammarPoint: 'l16c4_kitchen', situation: { ru: 'Суп слишком горячий, а друг голоден. Спроси, не остудить ли суп.', uk: 'Суп занадто гарячий, а друг голодний. Запитай, чи не остудити суп.' }, accepted: ['Shall I cool down the soup?', "I'll cool down the soup."] },
    { id: 'l16c4-03', type: 'situation', grammarPoint: 'l16c4_build_pack', situation: { ru: 'Стол не проходит в дверь. Предложи разобрать стол.', uk: 'Стіл не проходить у двері. Запропонуй розібрати стіл.' }, accepted: ["I'll take apart the table."] },
    { id: 'l16c4-04', type: 'situation', grammarPoint: 'l16c4_build_pack', situation: { ru: 'Подарок лежит без упаковки. Предложи завернуть подарок.', uk: 'Подарунок лежить без пакування. Запропонуй загорнути подарунок.' }, accepted: ["I'll wrap up the present."] },
    { id: 'l16c4-05', type: 'situation', grammarPoint: 'l16c4_build_pack', situation: { ru: 'Вы приехали на место для ночёвки. Предложи поставить палатку.', uk: 'Ви приїхали на місце для ночівлі. Запропонуй поставити намет.' }, accepted: ["I'll set up the tent."] },
    { id: 'l16c4-06', type: 'situation', grammarPoint: 'l16c4_office_turn', situation: { ru: 'На скамейке тесно, а друг хочет сесть. Скажи, что подвинешься.', uk: 'На лаві тісно, а друг хоче сісти. Скажи, що посунешся.' }, accepted: ["I'll move over."] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l16c4-07', type: 'dialogue', grammarPoint: 'l16c4_kitchen', partnerLine: 'I think the soup will be lukewarm.', situation: { ru: 'Друг думает, что суп будет тёплым, а не горячим. Предложи разогреть суп.', uk: 'Друг думає, що суп буде теплим, а не гарячим. Запропонуй розігріти суп.' }, accepted: ["I'll heat up the soup."] },
    { id: 'l16c4-08', type: 'dialogue', grammarPoint: 'l16c4_kitchen', partnerLine: 'I think the cup will overfill.', situation: { ru: 'Друг думает, что чашка переполнится. Спроси, не вылить ли воду.', uk: 'Друг думає, що чашка переповниться. Запитай, чи не вилити воду.' }, accepted: ['Shall I pour out the water?', "I'll pour out the water."] },
    { id: 'l16c4-09', type: 'dialogue', grammarPoint: 'l16c4_build_pack', partnerLine: "I'll set up the tent.", situation: { ru: 'Друг ставит палатку. Спроси, не закрепить ли её колышками.', uk: 'Друг ставить намет. Запитай, чи не закріпити його кілками.' }, accepted: ['Shall I peg down the tent?', "I'll peg down the tent."] },
    { id: 'l16c4-10', type: 'dialogue', grammarPoint: 'l16c4_build_pack', partnerLine: "I'll box up the books.", situation: { ru: 'Друг складывает книги в коробку. Предложи перевязать посылку.', uk: 'Друг складає книжки в коробку. Запропонуй перев’язати посилку.' }, accepted: ["I'll tie up the parcel."] },
    { id: 'l16c4-11', type: 'dialogue', grammarPoint: 'l16c4_office_turn', partnerLine: 'I think the form will be wrong.', situation: { ru: 'Друг думает, что в анкете будет ошибка. Предложи воспользоваться корректирующей лентой.', uk: 'Друг думає, що в анкеті буде помилка. Запропонуй скористатися коректувальною стрічкою.' }, accepted: ["I'll use the correction tape."] },
    { id: 'l16c4-12', type: 'dialogue', grammarPoint: 'l16c4_office_turn', partnerLine: 'I think the list will be small.', situation: { ru: 'Друг думает, что список будет небольшим. Спроси, не пройтись ли вместе по списку.', uk: 'Друг думає, що список буде невеликим. Запитай, чи не пройтися разом по списку.' }, accepted: ['Shall I go over the list with you?', "I'll go over the list with you."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l16c4-13', type: 'fix', grammarPoint: 'l16c4_kitchen', wrong: 'Shall I to cool down the soup?', accepted: ['Shall I cool down the soup?'] },
    { id: 'l16c4-14', type: 'fix', grammarPoint: 'l16c4_build_pack', wrong: "I'll up set the tent.", accepted: ["I'll set up the tent."] },
    { id: 'l16c4-15', type: 'fix', grammarPoint: 'l16c4_office_turn', wrong: "I'll over move.", accepted: ["I'll move over."] },
    { id: 'l16c4-16', type: 'fix', grammarPoint: 'l16c4_office_turn', wrong: "I'll turn the shirt out inside.", accepted: ["I'll turn the shirt inside out."] },
  ],
};
