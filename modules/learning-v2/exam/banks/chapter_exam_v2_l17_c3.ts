// chapter_exam_v2_l17_c3.ts — банк экзамена v2: урок 17, глава 3 (эпизоды 17–24). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 3 — «a few / a little» (есть немного) и «few / little» (почти нет) с числимыми и с веществами; плюс «many / much» из главы 2. Только слова и формы эпизодов 1–24 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C3: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l17c3_a_few_a_little', label: { ru: 'есть немного: a few … / a little …', uk: 'є трохи: a few … / a little …' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24] },
    { id: 'l17c3_few_little', label: { ru: 'почти нет: few … / little …', uk: 'майже немає: few … / little …' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24] },
    { id: 'l17c3_many_much', label: { ru: 'не так много: many … / much …', uk: 'не так багато: many … / much …' }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c3-01', type: 'situation', grammarPoint: 'l17c3_a_few_a_little', situation: { ru: 'В вашей квартире живёт несколько соседей. Скажи, что у вас есть несколько соседей по квартире.', uk: 'У вашій квартирі живе кілька сусідів. Скажи, що у вас є кілька сусідів по квартирі.' }, accepted: ['We have a few housemates.'] },
    { id: 'l17c3-02', type: 'situation', grammarPoint: 'l17c3_a_few_a_little', situation: { ru: 'У тебя есть немного свободного времени. Скажи об этом.', uk: 'У тебе є трохи вільного часу. Скажи про це.' }, accepted: ['We have a little leisure time.'] },
    { id: 'l17c3-03', type: 'situation', grammarPoint: 'l17c3_few_little', situation: { ru: 'Знакомых здесь у вас почти нет. Скажи об этом.', uk: 'Знайомих тут у вас майже немає. Скажи про це.' }, accepted: ['We have few acquaintances here.'] },
    { id: 'l17c3-04', type: 'situation', grammarPoint: 'l17c3_few_little', situation: { ru: 'Личного пространства у вас почти нет. Скажи об этом.', uk: 'Особистого простору у вас майже немає. Скажи про це.' }, accepted: ['We have little privacy.'] },
    { id: 'l17c3-05', type: 'situation', grammarPoint: 'l17c3_many_much', situation: { ru: 'Сертификатов у вас не так много. Скажи об этом.', uk: 'Сертифікатів у вас не так багато. Скажи про це.' }, accepted: ["We don't have many certificates."] },
    { id: 'l17c3-06', type: 'situation', grammarPoint: 'l17c3_many_much', situation: { ru: 'Повторения вам нужно не так много. Скажи об этом.', uk: 'Повторення вам потрібно не так багато. Скажи про це.' }, accepted: ["We don't need much revision."] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c3-07', type: 'dialogue', grammarPoint: 'l17c3_a_few_a_little', partnerLine: 'We received a few compliments.', situation: { ru: 'Друг говорит, что вы получили несколько комплиментов. Скажи, что вы получили ещё и немного похвалы.', uk: 'Друг каже, що ви отримали кілька компліментів. Скажи, що ви отримали ще й трохи похвали.' }, accepted: ['We received a little praise.'] },
    { id: 'l17c3-08', type: 'dialogue', grammarPoint: 'l17c3_a_few_a_little', partnerLine: 'We have a few camp beds.', situation: { ru: 'Друг говорит, что у вас есть несколько раскладушек. Скажи, что у вас есть немного места для хранения.', uk: 'Друг каже, що у вас є кілька розкладачок. Скажи, що у вас є трохи місця для зберігання.' }, accepted: ['We have a little storage space.'] },
    { id: 'l17c3-09', type: 'dialogue', grammarPoint: 'l17c3_few_little', partnerLine: 'We received little encouragement.', situation: { ru: 'Друг говорит, что поддержки вы получили мало. Скажи, что предложений вы получили почти нет.', uk: 'Друг каже, що підтримки ви отримали мало. Скажи, що пропозицій ви отримали майже немає.' }, accepted: ['We received few suggestions.'] },
    { id: 'l17c3-10', type: 'dialogue', grammarPoint: 'l17c3_few_little', partnerLine: 'We have few guest rooms.', situation: { ru: 'Друг говорит, что гостевых комнат у вас почти нет. Скажи, что места на полу почти нет.', uk: 'Друг каже, що гостьових кімнат у вас майже немає. Скажи, що місця на підлозі майже немає.' }, accepted: ['We have little floor space.'] },
    { id: 'l17c3-11', type: 'dialogue', grammarPoint: 'l17c3_many_much', partnerLine: 'We have few acquaintances here.', situation: { ru: 'Друг говорит, что знакомых здесь у вас почти нет. Скажи, что спонсоров у вас не так много.', uk: 'Друг каже, що знайомих тут у вас майже немає. Скажи, що спонсорів у вас не так багато.' }, accepted: ["We don't have many sponsors."] },
    { id: 'l17c3-12', type: 'dialogue', grammarPoint: 'l17c3_many_much', partnerLine: 'We have little privacy.', situation: { ru: 'Друг говорит, что личного пространства у вас почти нет. Скажи, что им нужно не так много наставлений.', uk: 'Друг каже, що особистого простору у вас майже немає. Скажи, що їм потрібно не так багато настанов.' }, accepted: ["They don't need much guidance."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c3-13', type: 'fix', grammarPoint: 'l17c3_a_few_a_little', wrong: 'We have a few leisure time.', accepted: ['We have a little leisure time.'] },
    { id: 'l17c3-14', type: 'fix', grammarPoint: 'l17c3_few_little', wrong: 'We have few privacy.', accepted: ['We have little privacy.'] },
    { id: 'l17c3-15', type: 'fix', grammarPoint: 'l17c3_few_little', wrong: 'We have little housemates.', accepted: ['We have few housemates.'] },
    { id: 'l17c3-16', type: 'fix', grammarPoint: 'l17c3_many_much', wrong: "We don't have much sponsors.", accepted: ["We don't have many sponsors."] },
  ],
};
