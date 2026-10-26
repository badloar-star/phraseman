// chapter_exam_v2_l16_c3.ts — банк экзамена v2: урок 16, глава 3 (эпизоды 17–24). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 3 — «I'll + глагол»: обещание — быть рядом, сдать и разобрать дела, хранить тайну и помогать. Только слова и формы эпизодов 1–24 урока 16; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L16_C3: ChapterExamV2Bank = {
  lessonOrdinal: 16,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l16c3_contact', label: { ru: "быть рядом и на связи: I'll check in on / keep in touch …", uk: "бути поруч і на зв’язку: I'll check in on / keep in touch …" }, episodeOrdinals: [17, 18] },
    { id: 'l16c3_tasks', label: { ru: "дела и бумаги: I'll hand in / set aside / sort out …", uk: "справи й папери: I'll hand in / set aside / sort out …" }, episodeOrdinals: [19, 23] },
    { id: 'l16c3_favours', label: { ru: "помощь и слово: I'll keep a secret / give a lift / keep an eye on …", uk: "допомога й слово: I'll keep a secret / give a lift / keep an eye on …" }, episodeOrdinals: [20, 21, 22, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l16c3-01', type: 'situation', grammarPoint: 'l16c3_contact', situation: { ru: 'Мама подруги неважно себя чувствует. Пообещай заглянуть к её маме.', uk: 'Мама подруги неважно почувається. Пообіцяй зазирнути до її мами.' }, accepted: ["I'll check in on your mother."] },
    { id: 'l16c3-02', type: 'situation', grammarPoint: 'l16c3_contact', situation: { ru: 'Друг уезжает надолго. Пообещай, что будешь на связи.', uk: 'Друг їде надовго. Пообіцяй, що будеш на зв’язку.' }, accepted: ["I'll keep in touch."] },
    { id: 'l16c3-03', type: 'situation', grammarPoint: 'l16c3_tasks', situation: { ru: 'Завтра последний день, когда можно сдать анкету. Пообещай сдать её завтра.', uk: 'Завтра останній день, коли можна здати анкету. Пообіцяй здати її завтра.' }, accepted: ["I'll hand in the form tomorrow."] },
    { id: 'l16c3-04', type: 'situation', grammarPoint: 'l16c3_tasks', situation: { ru: 'Ты готовишь вечеринку, а гости ещё не получили приглашений. Пообещай раздать приглашения.', uk: 'Ти готуєш вечірку, а гості ще не отримали запрошень. Пообіцяй роздати запрошення.' }, accepted: ["I'll hand out the invitations."] },
    { id: 'l16c3-05', type: 'situation', grammarPoint: 'l16c3_favours', situation: { ru: 'Подруга просит никому не рассказывать её тайну. Пообещай хранить её.', uk: 'Подруга просить нікому не розповідати її таємницю. Пообіцяй зберегти її.' }, accepted: ["I'll keep a secret for you."] },
    { id: 'l16c3-06', type: 'situation', grammarPoint: 'l16c3_favours', situation: { ru: 'Друг собирается на прогулку, а тебе хочется составить ему компанию. Скажи, что пойдёшь с ним.', uk: 'Друг збирається на прогулянку, а тобі хочеться скласти йому компанію. Скажи, що підеш із ним.' }, accepted: ["I'll tag along with you."] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l16c3-07', type: 'dialogue', grammarPoint: 'l16c3_contact', partnerLine: 'I think my brother will oversleep tomorrow.', situation: { ru: 'Друг думает, что его брат завтра проспит. Пообещай заглянуть завтра.', uk: 'Друг думає, що його брат завтра проспить. Пообіцяй зазирнути завтра.' }, accepted: ["I'll drop by tomorrow."] },
    { id: 'l16c3-08', type: 'dialogue', grammarPoint: 'l16c3_contact', partnerLine: 'I think the hotel will be fully booked.', situation: { ru: 'Друг думает, что отель будет полностью занят. Пообещай, что вечером вернёшься к нему с ответом.', uk: 'Друг думає, що готель буде повністю зайнятий. Пообіцяй, що ввечері повернешся до нього з відповіддю.' }, accepted: ["I'll get back to you tonight."] },
    { id: 'l16c3-09', type: 'dialogue', grammarPoint: 'l16c3_tasks', partnerLine: 'I think we will overspend on holiday.', situation: { ru: 'Друг боится, что на отпуске вы потратите лишнего. Пообещай отложить немного денег на поездку.', uk: 'Друг боїться, що у відпустці ви витратите зайвого. Пообіцяй відкласти трохи грошей на поїздку.' }, accepted: ["I'll set aside some money for the trip."] },
    { id: 'l16c3-10', type: 'dialogue', grammarPoint: 'l16c3_tasks', partnerLine: 'I think the tickets will be sold out by Friday.', situation: { ru: 'Друг думает, что билеты разойдутся к пятнице. Пообещай всё уладить с билетами.', uk: 'Друг думає, що квитки розійдуться до п’ятниці. Пообіцяй усе залагодити з квитками.' }, accepted: ["I'll sort out the tickets."] },
    { id: 'l16c3-11', type: 'dialogue', grammarPoint: 'l16c3_favours', partnerLine: 'I think my sister will arrive at dusk.', situation: { ru: 'Друг говорит, что его сестра приедет к сумеркам. Пообещай подвезти её.', uk: 'Друг каже, що його сестра приїде надвечір. Пообіцяй підвезти її.' }, accepted: ["I'll give a lift to your sister."] },
    { id: 'l16c3-12', type: 'dialogue', grammarPoint: 'l16c3_favours', partnerLine: 'I think the beach will be overcrowded.', situation: { ru: 'Друг думает, что на пляже будет тесно. Пообещай присмотреть за его сумкой.', uk: 'Друг думає, що на пляжі буде тісно. Пообіцяй наглядати за його сумкою.' }, accepted: ["I'll keep an eye on your bag."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l16c3-13', type: 'fix', grammarPoint: 'l16c3_contact', wrong: "I'll keep touch.", accepted: ["I'll keep in touch."] },
    { id: 'l16c3-14', type: 'fix', grammarPoint: 'l16c3_tasks', wrong: "I'll back send the wrong shoes.", accepted: ["I'll send back the wrong shoes."] },
    { id: 'l16c3-15', type: 'fix', grammarPoint: 'l16c3_favours', wrong: "I'll make time you.", accepted: ["I'll make time for you."] },
    { id: 'l16c3-16', type: 'fix', grammarPoint: 'l16c3_favours', wrong: "I'll lend hand tomorrow.", accepted: ["I'll lend a hand tomorrow."] },
  ],
};
