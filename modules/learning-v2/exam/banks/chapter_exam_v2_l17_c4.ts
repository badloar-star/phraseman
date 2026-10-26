// chapter_exam_v2_l17_c4.ts — банк экзамена v2: урок 17, глава 4 (эпизоды 25–32). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 4 — «some» в утверждении и «any» в отрицании («We don't have any …», «There aren't any …»); плюс «a few / few / a little / little» из главы 3. Только слова и формы эпизодов 1–32 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C4: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l17c4_some', label: { ru: 'в утверждении: some …', uk: 'у ствердженні: some …' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l17c4_any', label: { ru: 'в отрицании: not … any …', uk: 'у запереченні: not … any …' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l17c4_quantity', label: { ru: 'немного и почти нет: a few / few, a little / little', uk: 'трохи і майже немає: a few / few, a little / little' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c4-01', type: 'situation', grammarPoint: 'l17c4_some', situation: { ru: 'Вы отправили несколько заявок на работу. Скажи об этом.', uk: 'Ви надіслали кілька заявок на роботу. Скажи про це.' }, accepted: ['We sent some job applications.'] },
    { id: 'l17c4-02', type: 'situation', grammarPoint: 'l17c4_some', situation: { ru: 'У тебя болит, и тебе нужно обезболивающее. Скажи об этом.', uk: 'У тебе болить, і тобі потрібне знеболювальне. Скажи про це.' }, accepted: ['I need some pain relief.'] },
    { id: 'l17c4-03', type: 'situation', grammarPoint: 'l17c4_any', situation: { ru: 'За обслуживание платить не нужно. Скажи, что платы за обслуживание нет.', uk: 'За обслуговування платити не потрібно. Скажи, що плати за обслуговування немає.' }, accepted: ["There aren't any service charges."] },
    { id: 'l17c4-04', type: 'situation', grammarPoint: 'l17c4_any', situation: { ru: 'Ты ищешь, где оставить машину. Спроси, есть ли здесь общественная парковка.', uk: 'Ти шукаєш, де залишити машину. Запитай, чи є тут громадська парковка.' }, accepted: ['Is there any public parking here?'] },
    { id: 'l17c4-05', type: 'situation', grammarPoint: 'l17c4_quantity', situation: { ru: 'У тебя есть немного опыта работы. Скажи об этом.', uk: 'У тебе є трохи досвіду роботи. Скажи про це.' }, accepted: ['I have a little work experience.'] },
    { id: 'l17c4-06', type: 'situation', grammarPoint: 'l17c4_quantity', situation: { ru: 'Гренок у вас осталось совсем мало. Скажи об этом.', uk: 'Грінок у вас лишилося зовсім мало. Скажи про це.' }, accepted: ['We have few croutons left.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c4-07', type: 'dialogue', grammarPoint: 'l17c4_some', partnerLine: 'We made some seat reservations.', situation: { ru: 'Друг говорит, что вы забронировали места. Скажи, что вам нужна иностранная валюта.', uk: 'Друг каже, що ви забронювали місця. Скажи, що вам потрібна іноземна валюта.' }, accepted: ['We need some foreign currency.'] },
    { id: 'l17c4-08', type: 'dialogue', grammarPoint: 'l17c4_some', partnerLine: 'I have some store credit.', situation: { ru: 'Друг говорит, что у него есть кредит в магазине. Скажи, что у вас есть скидочные коды.', uk: 'Друг каже, що в нього є кредит у магазині. Скажи, що у вас є знижкові коди.' }, accepted: ['We have some discount codes.'] },
    { id: 'l17c4-09', type: 'dialogue', grammarPoint: 'l17c4_any', partnerLine: 'There are some delivery charges.', situation: { ru: 'Друг говорит, что есть плата за доставку. Скажи, что платы за бронирование нет.', uk: 'Друг каже, що є плата за доставку. Скажи, що плати за бронювання немає.' }, accepted: ["There aren't any booking fees."] },
    { id: 'l17c4-10', type: 'dialogue', grammarPoint: 'l17c4_any', partnerLine: 'We made some bank transfers.', situation: { ru: 'Друг говорит, что вы делали переводы. Спроси, предлагает ли этот банк онлайн-банкинг.', uk: 'Друг каже, що ви робили перекази. Запитай, чи пропонує цей банк онлайн-банкінг.' }, accepted: ['Does this bank offer any online banking?'] },
    { id: 'l17c4-11', type: 'dialogue', grammarPoint: 'l17c4_quantity', partnerLine: 'I have a few job offers.', situation: { ru: 'Друг говорит, что у него несколько предложений работы. Скажи, что собеседований в этом месяце у тебя почти нет.', uk: 'Друг каже, що в нього кілька пропозицій роботи. Скажи, що співбесід цього місяця в тебе майже немає.' }, accepted: ['I have few job interviews this month.'] },
    { id: 'l17c4-12', type: 'dialogue', grammarPoint: 'l17c4_quantity', partnerLine: 'We have a little quinoa.', situation: { ru: 'Друг говорит, что у вас есть немного киноа. Скажи, что гречки у вас осталось мало.', uk: 'Друг каже, що у вас є трохи кіноа. Скажи, що гречки у вас лишилося мало.' }, accepted: ['We have little buckwheat left.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c4-13', type: 'fix', grammarPoint: 'l17c4_any', wrong: 'Do you have a travel insurance?', accepted: ['Do you have any travel insurance?'] },
    { id: 'l17c4-14', type: 'fix', grammarPoint: 'l17c4_any', wrong: "We don't have some sick notes.", accepted: ["We don't have any sick notes."] },
    { id: 'l17c4-15', type: 'fix', grammarPoint: 'l17c4_any', wrong: "There aren't some road closures.", accepted: ["There aren't any road closures."] },
    { id: 'l17c4-16', type: 'fix', grammarPoint: 'l17c4_quantity', wrong: 'I have a few work experience.', accepted: ['I have a little work experience.'] },
  ],
};
