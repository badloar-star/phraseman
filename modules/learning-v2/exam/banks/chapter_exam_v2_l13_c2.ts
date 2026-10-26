// chapter_exam_v2_l13_c2.ts — банк экзамена v2: урок 13, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–16 урока 13
// (отрицание в прошедшем: I / he / she didn’t + глагол без -ed; вопросы с «?» сторож пока не пускает); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C2: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l13c2_didnt_i', label: { ru: 'я не сделал — I didn’t', uk: 'я не зробив — I didn’t' }, episodeOrdinals: [9, 11, 12] },
    { id: 'l13c2_didnt_she', label: { ru: 'он, она не сделали — didn’t', uk: 'він, вона не зробили — didn’t' }, episodeOrdinals: [9, 10, 13] },
    { id: 'l13c2_base', label: { ru: 'после didn’t — глагол без -ed', uk: 'після didn’t — дієслово без -ed' }, episodeOrdinals: [14, 15, 16] },
    { id: 'l13c2_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [9, 10, 15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c2-01', type: 'situation', grammarPoint: 'l13c2_didnt_i', situation: { ru: 'Друг ждёт свою книгу. Признайся, что ты её не вернул.', uk: 'Друг чекає свою книжку. Зізнайся, що ти її не повернув.' }, accepted: ['I didn’t give back the book.', 'I did not give back the book.'] },
    { id: 'l13c2-02', type: 'situation', grammarPoint: 'l13c2_didnt_she', situation: { ru: 'Мама думает, что сестра надела пальто. Скажи, что не надела.', uk: 'Мама думає, що сестра вдягла пальто. Скажи, що не вдягла.' }, accepted: ['She didn’t put on her coat.', 'She did not put on her coat.'] },
    { id: 'l13c2-03', type: 'situation', grammarPoint: 'l13c2_base', situation: { ru: 'Тебя просили записать адрес, а ты забыл. Скажи об этом.', uk: 'Тебе просили записати адресу, а ти забув. Скажи про це.' }, accepted: ['I didn’t write down the address.', 'I did not write down the address.'] },
    { id: 'l13c2-04', type: 'situation', grammarPoint: 'l13c2_ask', situation: { ru: 'Спроси друга, встал ли он рано.', uk: 'Запитай друга, чи встав він рано.' }, accepted: ['Did you get up early?'] },
    { id: 'l13c2-05', type: 'situation', grammarPoint: 'l13c2_ask', situation: { ru: 'Ты одолжил другу денег. Спроси, вернул ли он их.', uk: 'Ти позичив другові грошей. Запитай, чи повернув він їх.' }, accepted: ['Did you pay back the money?'] },
    { id: 'l13c2-06', type: 'situation', grammarPoint: 'l13c2_base', situation: { ru: 'Тебя спрашивают про анкету. Скажи, что ты её не заполнил.', uk: 'Тебе питають про анкету. Скажи, що ти її не заповнив.' }, accepted: ['I didn’t fill in the form.', 'I did not fill in the form.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c2-07', type: 'dialogue', grammarPoint: 'l13c2_didnt_i', partnerLine: 'We didn’t listen to the radio.', situation: { ru: 'Скажи, что ты не делал радио громче.', uk: 'Скажи, що ти не робив радіо гучніше.' }, accepted: ['I didn’t turn up the radio.', 'I did not turn up the radio.'] },
    { id: 'l13c2-08', type: 'dialogue', grammarPoint: 'l13c2_didnt_she', partnerLine: 'Did she take out the rubbish?', situation: { ru: 'Ответь, что не вынесла.', uk: 'Відповідай, що не винесла.' }, accepted: ['She didn’t take out the rubbish.', 'She did not take out the rubbish.'] },
    { id: 'l13c2-09', type: 'dialogue', grammarPoint: 'l13c2_base', partnerLine: 'I didn’t call back.', situation: { ru: 'Скажи, что она тоже не перезвонила.', uk: 'Скажи, що вона теж не передзвонила.' }, accepted: ['She didn’t call back.', 'She did not call back.'] },
    { id: 'l13c2-10', type: 'dialogue', grammarPoint: 'l13c2_didnt_i', partnerLine: 'We didn’t watch a film.', situation: { ru: 'Скажи, что ты не выходил из дома.', uk: 'Скажи, що ти не виходив із дому.' }, accepted: ['I didn’t go out.', 'I did not go out.'] },
    { id: 'l13c2-11', type: 'dialogue', grammarPoint: 'l13c2_didnt_she', partnerLine: 'Did he lock up the house?', situation: { ru: 'Ответь, что не запер.', uk: 'Відповідай, що не замкнув.' }, accepted: ['He didn’t lock up the house.', 'He did not lock up the house.'] },
    { id: 'l13c2-12', type: 'dialogue', grammarPoint: 'l13c2_base', partnerLine: 'He didn’t read the form.', situation: { ru: 'Скажи, что ты не узнал цену.', uk: 'Скажи, що ти не дізнався ціни.' }, accepted: ['I didn’t find out the price.', 'I did not find out the price.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c2-13', type: 'fix', grammarPoint: 'l13c2_didnt_i', wrong: 'I didn’t saved up for a bike.', accepted: ['I didn’t save up for a bike.'] },
    { id: 'l13c2-14', type: 'fix', grammarPoint: 'l13c2_ask', wrong: 'Did you gave away the clothes?', accepted: ['Did you give away the clothes?'] },
    { id: 'l13c2-15', type: 'fix', grammarPoint: 'l13c2_base', wrong: 'I didn’t woke up early.', accepted: ['I didn’t wake up early.', 'I did not wake up early.'] },
    { id: 'l13c2-16', type: 'fix', grammarPoint: 'l13c2_base', wrong: 'He didn’t left at eight.', accepted: ['He didn’t leave at eight.', 'He did not leave at eight.'] },
  ],
};
