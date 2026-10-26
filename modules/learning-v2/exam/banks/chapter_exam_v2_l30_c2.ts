// chapter_exam_v2_l30_c2.ts — банк экзамена v2: урок 30, глава 2 (эпизоды 9–16). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 2 — пересказ вопросов («He asked where the station was», «He asked if the maze was open») с обычным порядком слов, плюс желание («I wish I knew …») и уточнение без «which» («The map you gave me helped»). Только слова и формы эпизодов 1–16 урока 30; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L30_C2: ChapterExamV2Bank = {
  lessonOrdinal: 30,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l30c2_asked_where', label: { ru: 'пересказ вопроса с where: He asked where the station was', uk: 'переказ питання з where: He asked where the station was' }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l30c2_asked_if', label: { ru: 'пересказ вопроса с if: He asked if the maze was open', uk: 'переказ питання з if: He asked if the maze was open' }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l30c2_wish_contact', label: { ru: 'желание и уточнение: I wish I knew … / The map you gave me', uk: 'бажання й уточнення: I wish I knew … / The map you gave me' }, episodeOrdinals: [10, 11, 12, 13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l30c2-01', type: 'situation', grammarPoint: 'l30c2_asked_where', situation: { ru: 'Приезжий искал вокзал. Передай его вопрос: он спросил, где станция.', uk: 'Приїжджий шукав вокзал. Перекажи його запитання: він запитав, де станція.' }, accepted: ['He asked where the station was.'] },
    { id: 'l30c2-02', type: 'situation', grammarPoint: 'l30c2_asked_where', situation: { ru: 'Турист искал вход. Передай его вопрос: он спросил, где вход.', uk: 'Турист шукав вхід. Перекажи його запитання: він запитав, де вхід.' }, accepted: ['He asked where the entrance was.'] },
    { id: 'l30c2-03', type: 'situation', grammarPoint: 'l30c2_asked_if', situation: { ru: 'Гость хотел зайти в лабиринт. Передай его вопрос: он спросил, открыт ли лабиринт.', uk: 'Гість хотів зайти в лабіринт. Перекажи його запитання: він запитав, чи відкритий лабіринт.' }, accepted: ['He asked if the maze was open.'] },
    { id: 'l30c2-04', type: 'situation', grammarPoint: 'l30c2_asked_if', situation: { ru: 'Тебя угощают сладким. Передай вопрос друга: он спросил, нравится ли тебе шоколад.', uk: 'Тебе пригощають солодким. Перекажи запитання друга: він запитав, чи подобається тобі шоколад.' }, accepted: ['He asked if I liked chocolate.'] },
    { id: 'l30c2-05', type: 'situation', grammarPoint: 'l30c2_wish_contact', situation: { ru: 'Адрес вылетел из головы. Скажи, что хотел бы знать адрес.', uk: 'Адреса вилетіла з голови. Скажи, що хотів би знати адресу.' }, accepted: ['I wish I knew the address.'] },
    { id: 'l30c2-06', type: 'situation', grammarPoint: 'l30c2_wish_contact', situation: { ru: 'Карта выручила. Скажи, что карта, которую ты мне дал, помогла.', uk: 'Мапа виручила. Скажи, що мапа, яку ти мені дав, допомогла.' }, accepted: ['The map you gave me helped.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l30c2-07', type: 'dialogue', grammarPoint: 'l30c2_asked_where', partnerLine: 'The bus goes via the station.', situation: { ru: 'Друг рассказывает про автобус. Скажи, что он спросил, где набережная.', uk: 'Друг розповідає про автобус. Скажи, що він запитав, де набережна.' }, accepted: ['He asked where the promenade was.'] },
    { id: 'l30c2-08', type: 'dialogue', grammarPoint: 'l30c2_asked_where', partnerLine: 'The location is convenient.', situation: { ru: 'Друг хвалит расположение. Скажи, что она спросила, где чайная.', uk: 'Друг хвалить розташування. Скажи, що вона запитала, де чайна.' }, accepted: ['She asked where the tearoom was.'] },
    { id: 'l30c2-09', type: 'dialogue', grammarPoint: 'l30c2_asked_if', partnerLine: 'She asked where the viewpoint was.', situation: { ru: 'Друг пересказывает вопрос о смотровой площадке. Скажи, что она спросила, открыта ли аркада.', uk: 'Друг переказує запитання про оглядовий майданчик. Скажи, що вона запитала, чи відкрита аркада.' }, accepted: ['She asked if the arcade was open.'] },
    { id: 'l30c2-10', type: 'dialogue', grammarPoint: 'l30c2_asked_if', partnerLine: 'She asked what I preferred.', situation: { ru: 'Друг пересказывает её вопрос о предпочтениях. Скажи, что он спросил, нравится ли тебе ирис.', uk: 'Друг переказує її запитання про вподобання. Скажи, що він запитав, чи подобається тобі іриска.' }, accepted: ['He asked if I liked toffee.'] },
    { id: 'l30c2-11', type: 'dialogue', grammarPoint: 'l30c2_wish_contact', partnerLine: 'He said he enjoyed the food.', situation: { ru: 'Друг говорит, что ему понравилась еда. Скажи, что хотел бы хорошо готовить.', uk: 'Друг каже, що йому сподобалася їжа. Скажи, що хотів би добре готувати.' }, accepted: ['I wish I could cook well.'] },
    { id: 'l30c2-12', type: 'dialogue', grammarPoint: 'l30c2_wish_contact', partnerLine: 'The restaurant you chose is nearby.', situation: { ru: 'Друг хвалит ресторан. Скажи, что рецепт, который ты мне прислал, был простым.', uk: 'Друг хвалить ресторан. Скажи, що рецепт, який ти мені надіслав, був простим.' }, accepted: ['The recipe you sent me was easy.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l30c2-13', type: 'fix', grammarPoint: 'l30c2_asked_where', wrong: 'He asked where was the exit.', accepted: ['He asked where the exit was.'] },
    { id: 'l30c2-14', type: 'fix', grammarPoint: 'l30c2_asked_if', wrong: 'She asked if was the arcade open.', accepted: ['She asked if the arcade was open.'] },
    { id: 'l30c2-15', type: 'fix', grammarPoint: 'l30c2_asked_if', wrong: 'He asked if I like toffee.', accepted: ['He asked if I liked toffee.'] },
    { id: 'l30c2-16', type: 'fix', grammarPoint: 'l30c2_wish_contact', wrong: 'I wish I know the address.', accepted: ['I wish I knew the address.'] },
  ],
};
