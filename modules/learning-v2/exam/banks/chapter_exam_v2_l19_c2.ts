// chapter_exam_v2_l19_c2.ts — банк экзамена v2: урок 19, глава 2 (эпизоды 9–16). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 2 — «At ten, I could read …» (умел в детстве), «I can read …» (умею сейчас) и планы «We are going to read …» / «We are meeting at the library tomorrow». Только слова и формы эпизодов 1–16 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C2: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l19c2_could_past', label: { ru: 'умел раньше: At ten, I could read / draw …', uk: 'умів раніше: At ten, I could read / draw …' }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l19c2_can_now', label: { ru: 'умею сейчас: I can read / check / draw …', uk: 'вмію зараз: I can read / check / draw …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l19c2_plans', label: { ru: 'планы: We are going to read … / We are meeting … tomorrow', uk: 'плани: We are going to read … / We are meeting … tomorrow' }, episodeOrdinals: [10, 11, 12, 13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c2-01', type: 'situation', grammarPoint: 'l19c2_could_past', situation: { ru: 'В десять лет ты уже читал бегло. Скажи об этом.', uk: 'У десять років ти вже читав бегло. Скажи про це.' }, accepted: ['At ten, I could read fluently.'] },
    { id: 'l19c2-02', type: 'situation', grammarPoint: 'l19c2_could_past', situation: { ru: 'В шесть лет ты уже умел рисовать круг. Скажи об этом.', uk: 'У шість років ти вже вмів малювати коло. Скажи про це.' }, accepted: ['At six, I could draw a circle.'] },
    { id: 'l19c2-03', type: 'situation', grammarPoint: 'l19c2_can_now', situation: { ru: 'Стихотворение тебе по силам и сейчас. Скажи, что можешь прочитать это стихотворение.', uk: 'Вірш тобі по силах і зараз. Скажи, що можеш прочитати цей вірш.' }, accepted: ['I can read this poem.'] },
    { id: 'l19c2-04', type: 'situation', grammarPoint: 'l19c2_can_now', situation: { ru: 'Ты внимательный. Скажи, что можешь проверить свою орфографию.', uk: 'Ти уважний. Скажи, що можеш перевірити свою орфографію.' }, accepted: ['I can check my spelling.'] },
    { id: 'l19c2-05', type: 'situation', grammarPoint: 'l19c2_plans', situation: { ru: 'Вы решили прочитать это объяснение. Скажи, что собираетесь его прочитать.', uk: 'Ви вирішили прочитати це пояснення. Скажи, що збираєтесь його прочитати.' }, accepted: ['We are going to read the explanation.'] },
    { id: 'l19c2-06', type: 'situation', grammarPoint: 'l19c2_plans', situation: { ru: 'Завтра вы встречаетесь в библиотеке — договорились. Скажи об этом.', uk: 'Завтра ви зустрічаєтесь у бібліотеці — домовилися. Скажи про це.' }, accepted: ['We are meeting at the library tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c2-07', type: 'dialogue', grammarPoint: 'l19c2_could_past', partnerLine: 'At twelve, she could speak confidently.', situation: { ru: 'Друг говорит, что в двенадцать лет она уже уверенно говорила. Скажи, что в двенадцать лет вы могли путешествовать самостоятельно.', uk: 'Друг каже, що у дванадцять років вона вже впевнено говорила. Скажи, що у дванадцять років ви могли подорожувати самостійно.' }, accepted: ['At twelve, we could travel independently.'] },
    { id: 'l19c2-08', type: 'dialogue', grammarPoint: 'l19c2_could_past', partnerLine: 'At ten, I could understand a cartoon.', situation: { ru: 'Друг говорит, что в десять лет он понимал мультфильм. Скажи, что в шесть лет ты мог запомнить стишок.', uk: 'Друг каже, що у десять років він розумів мультфільм. Скажи, що у шість років ти міг запам’ятати віршик.' }, accepted: ['At six, I could remember a rhyme.'] },
    { id: 'l19c2-09', type: 'dialogue', grammarPoint: 'l19c2_can_now', partnerLine: 'At ten, I could write a sentence.', situation: { ru: 'Друг говорит, что в десять лет умел писать предложение. Скажи, что сейчас ты можешь понять этот пример.', uk: 'Друг каже, що у десять років умів писати речення. Скажи, що зараз ти можеш зрозуміти цей приклад.' }, accepted: ['I can understand this example.'] },
    { id: 'l19c2-10', type: 'dialogue', grammarPoint: 'l19c2_can_now', partnerLine: 'At six, I could draw a triangle.', situation: { ru: 'Друг говорит, что в шесть лет умел рисовать треугольник. Скажи, что сейчас ты можешь нарисовать этот треугольник.', uk: 'Друг каже, що у шість років умів малювати трикутник. Скажи, що зараз ти можеш намалювати цей трикутник.' }, accepted: ['I can draw this triangle.'] },
    { id: 'l19c2-11', type: 'dialogue', grammarPoint: 'l19c2_plans', partnerLine: 'At ten, I could read a paragraph.', situation: { ru: 'Друг говорит, что в десять лет читал абзац. Скажи, что вы собираетесь прочитать этот абзац.', uk: 'Друг каже, що у десять років читав абзац. Скажи, що ви збираєтесь прочитати цей абзац.' }, accepted: ['We are going to read this paragraph.'] },
    { id: 'l19c2-12', type: 'dialogue', grammarPoint: 'l19c2_plans', partnerLine: 'At ten, I could measure the distance.', situation: { ru: 'Друг говорит, что в десять лет мог измерить расстояние. Скажи, что вы собираетесь проверить вес.', uk: 'Друг каже, що у десять років міг виміряти відстань. Скажи, що ви збираєтесь перевірити вагу.' }, accepted: ['We are going to check the weight.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c2-13', type: 'fix', grammarPoint: 'l19c2_could_past', wrong: 'At ten, I can read a poem.', accepted: ['At ten, I could read a poem.'] },
    { id: 'l19c2-14', type: 'fix', grammarPoint: 'l19c2_could_past', wrong: 'At twenty, I could to learn a new skill.', accepted: ['At twenty, I could learn a new skill.'] },
    { id: 'l19c2-15', type: 'fix', grammarPoint: 'l19c2_can_now', wrong: 'I can to change the volume.', accepted: ['I can change the volume.'] },
    { id: 'l19c2-16', type: 'fix', grammarPoint: 'l19c2_plans', wrong: 'We are going check the weight.', accepted: ['We are going to check the weight.'] },
  ],
};
