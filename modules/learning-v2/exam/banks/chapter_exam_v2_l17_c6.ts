// chapter_exam_v2_l17_c6.ts — банк экзамена v2: урок 17, глава 6 (эпизоды 41–48). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 6 — «some» в утверждении и «any» в отрицании на словах про бумаги, адреса, платежи; плюс счёт единицами из главы 5 («two bags of …»). Только слова и формы эпизодов 1–48 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C6: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l17c6_some', label: { ru: 'в утверждении: some …', uk: 'у ствердженні: some …' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l17c6_any', label: { ru: 'в отрицании: not … any …', uk: 'у запереченні: not … any …' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l17c6_units', label: { ru: 'единицами: two bags / bottles / kilos of …', uk: 'одиницями: two bags / bottles / kilos of …' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c6-01', type: 'situation', grammarPoint: 'l17c6_some', situation: { ru: 'Вы сохранили несколько адресов доставки. Скажи об этом.', uk: 'Ви зберегли кілька адрес доставки. Скажи про це.' }, accepted: ['We saved some delivery addresses.'] },
    { id: 'l17c6-02', type: 'situation', grammarPoint: 'l17c6_some', situation: { ru: 'Вы проверили несколько разрешений на работу. Скажи об этом.', uk: 'Ви перевірили кілька дозволів на роботу. Скажи про це.' }, accepted: ['We checked some work permits.'] },
    { id: 'l17c6-03', type: 'situation', grammarPoint: 'l17c6_any', situation: { ru: 'Сопроводительных писем у вас нет. Скажи об этом.', uk: 'Супровідних листів у вас немає. Скажи про це.' }, accepted: ["We don't have any cover letters."] },
    { id: 'l17c6-04', type: 'situation', grammarPoint: 'l17c6_any', situation: { ru: 'Времени закрытия вы не знаете. Скажи об этом.', uk: 'Часу закриття ви не знаєте. Скажи про це.' }, accepted: ["We don't know any closing times."] },
    { id: 'l17c6-05', type: 'situation', grammarPoint: 'l17c6_units', situation: { ru: 'Вам нужны два пакета риса. Скажи об этом.', uk: 'Вам потрібні два пакети рису. Скажи про це.' }, accepted: ['We need two bags of rice.'] },
    { id: 'l17c6-06', type: 'situation', grammarPoint: 'l17c6_units', situation: { ru: 'Вчера ты купил две пачки макарон. Скажи об этом.', uk: 'Вчора ти купив дві пачки макаронів. Скажи про це.' }, accepted: ['I bought two packets of pasta yesterday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c6-07', type: 'dialogue', grammarPoint: 'l17c6_some', partnerLine: 'We need some references.', situation: { ru: 'Друг говорит, что вам нужны рекомендации. Скажи, что вам нужны обратные адреса.', uk: 'Друг каже, що вам потрібні рекомендації. Скажи, що вам потрібні зворотні адреси.' }, accepted: ['We need some return addresses.'] },
    { id: 'l17c6-08', type: 'dialogue', grammarPoint: 'l17c6_some', partnerLine: 'There are some entry fees.', situation: { ru: 'Друг говорит, что есть плата за вход. Скажи, что вы делаете ежемесячные платежи.', uk: 'Друг каже, що є плата за вхід. Скажи, що ви робите щомісячні платежі.' }, accepted: ['We make some monthly payments.'] },
    { id: 'l17c6-09', type: 'dialogue', grammarPoint: 'l17c6_any', partnerLine: 'We offer some payment plans.', situation: { ru: 'Друг говорит, что вы предлагаете планы платежей. Скажи, что штрафов за просрочку нет.', uk: 'Друг каже, що ви пропонуєте плани платежів. Скажи, що штрафів за прострочення немає.' }, accepted: ["There aren't any late fees."] },
    { id: 'l17c6-10', type: 'dialogue', grammarPoint: 'l17c6_any', partnerLine: 'We changed some opening times.', situation: { ru: 'Друг говорит, что вы изменили время открытия. Скажи, что платёжных адресов у вас нет.', uk: 'Друг каже, що ви змінили час відкриття. Скажи, що платіжних адрес у вас немає.' }, accepted: ["We don't have any billing addresses."] },
    { id: 'l17c6-11', type: 'dialogue', grammarPoint: 'l17c6_units', partnerLine: 'We checked some exchange rates.', situation: { ru: 'Друг говорит, что вы проверили курсы валют. Скажи, что вам нужны две бутылки масла.', uk: 'Друг каже, що ви перевірили курси валют. Скажи, що вам потрібні дві пляшки олії.' }, accepted: ['We need two bottles of oil.'] },
    { id: 'l17c6-12', type: 'dialogue', grammarPoint: 'l17c6_units', partnerLine: 'We compared some refund policies.', situation: { ru: 'Друг говорит, что вы сравнили правила возврата. Скажи, что завтра ты собираешься купить два килограмма риса.', uk: 'Друг каже, що ви порівняли правила повернення. Скажи, що завтра ти збираєшся купити два кілограми рису.' }, accepted: ['I am going to buy two kilos of rice tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c6-13', type: 'fix', grammarPoint: 'l17c6_some', wrong: 'We checked any work permits.', accepted: ['We checked some work permits.'] },
    { id: 'l17c6-14', type: 'fix', grammarPoint: 'l17c6_any', wrong: "There aren't some late fees.", accepted: ["There aren't any late fees."] },
    { id: 'l17c6-15', type: 'fix', grammarPoint: 'l17c6_any', wrong: "We don't have some residence permits.", accepted: ["We don't have any residence permits."] },
    { id: 'l17c6-16', type: 'fix', grammarPoint: 'l17c6_units', wrong: 'We need two bottle of oil.', accepted: ['We need two bottles of oil.'] },
  ],
};
