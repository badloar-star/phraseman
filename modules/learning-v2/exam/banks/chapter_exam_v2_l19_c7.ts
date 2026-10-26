// chapter_exam_v2_l19_c7.ts — банк экзамена v2: урок 19, глава 7 (эпизоды 49–56). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 7 — итог урока: «can» с устойчивыми выражениями («by chance», «for free»), «can» с глаголами-партнёрами («work out», «take over») и «so / such» с «will be able to». Только слова и формы эпизодов 1–56 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C7: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l19c7_can_phrases', label: { ru: 'могу + выражение: by chance / for free / by myself', uk: 'можу + вираз: by chance / for free / by myself' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
    { id: 'l19c7_phrasal', label: { ru: 'могу + work out / take over / keep up …', uk: 'можу + work out / take over / keep up …' }, episodeOrdinals: [54, 55, 56] },
    { id: 'l19c7_will_so', label: { ru: 'смогу, так и такой: will be able to / so quiet / such a useful …', uk: 'зможу, так і такий: will be able to / so quiet / such a useful …' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c7-01', type: 'situation', grammarPoint: 'l19c7_can_phrases', situation: { ru: 'Люди иногда знакомятся случайно. Скажи, что люди могут встретиться случайно.', uk: 'Люди іноді знайомляться випадково. Скажи, що люди можуть зустрітися випадково.' }, accepted: ['People can meet by chance.'] },
    { id: 'l19c7-02', type: 'situation', grammarPoint: 'l19c7_can_phrases', situation: { ru: 'Вход открыт для всех. Скажи, что вы можете войти бесплатно.', uk: 'Вхід відкритий для всіх. Скажи, що ви можете увійти безкоштовно.' }, accepted: ['We can enter for free.'] },
    { id: 'l19c7-03', type: 'situation', grammarPoint: 'l19c7_phrasal', situation: { ru: 'Нужно посчитать расходы. Скажи, что вы можете вычислить стоимость.', uk: 'Потрібно порахувати витрати. Скажи, що ви можете вирахувати вартість.' }, accepted: ['We can work out the cost.'] },
    { id: 'l19c7-04', type: 'situation', grammarPoint: 'l19c7_phrasal', situation: { ru: 'Друг устал стоять у плиты. Скажи, что ты можешь взять готовку на себя.', uk: 'Друг втомився стояти біля плити. Скажи, що ти можеш узяти готування на себе.' }, accepted: ['I can take over the cooking.'] },
    { id: 'l19c7-05', type: 'situation', grammarPoint: 'l19c7_will_so', situation: { ru: 'В комнате почти нет шума. Скажи, что в этой комнате так тихо.', uk: 'У кімнаті майже немає шуму. Скажи, що в цій кімнаті так тихо.' }, accepted: ['This room is so quiet.'] },
    { id: 'l19c7-06', type: 'situation', grammarPoint: 'l19c7_will_so', situation: { ru: 'Объяснение тебя выручило. Скажи, что это такое полезное объяснение.', uk: 'Пояснення тебе виручило. Скажи, що це таке корисне пояснення.' }, accepted: ['This is such a useful explanation.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c7-07', type: 'dialogue', grammarPoint: 'l19c7_can_phrases', partnerLine: 'Anyone can break a glass by accident.', situation: { ru: 'Друг говорит, что любой может нечаянно разбить стакан. Скажи, что ты можешь пойти сам.', uk: 'Друг каже, що будь-хто може ненавмисно розбити склянку. Скажи, що ти можеш піти сам.' }, accepted: ['I can go by myself.'] },
    { id: 'l19c7-08', type: 'dialogue', grammarPoint: 'l19c7_can_phrases', partnerLine: 'Music can put me in a good mood.', situation: { ru: 'Друг говорит, что музыка поднимает ему настроение. Скажи, что вы можете помочь животному в опасности.', uk: 'Друг каже, що музика піднімає йому настрій. Скажи, що ви можете допомогти тварині в небезпеці.' }, accepted: ['We can help an animal in danger.'] },
    { id: 'l19c7-09', type: 'dialogue', grammarPoint: 'l19c7_phrasal', partnerLine: 'She can point out the mistake.', situation: { ru: 'Друг говорит, что она может указать на ошибку. Скажи, что ты можешь пропустить эту деталь.', uk: 'Друг каже, що вона може вказати на помилку. Скажи, що ти можеш пропустити цю деталь.' }, accepted: ['I can leave out this detail.'] },
    { id: 'l19c7-10', type: 'dialogue', grammarPoint: 'l19c7_phrasal', partnerLine: 'I can get over this disappointment.', situation: { ru: 'Друг говорит, что справится с этим разочарованием. Скажи, что ты можешь не отставать от друга.', uk: 'Друг каже, що впорається з цим розчаруванням. Скажи, що ти можеш не відставати від друга.' }, accepted: ['I can keep up with you.'] },
    { id: 'l19c7-11', type: 'dialogue', grammarPoint: 'l19c7_will_so', partnerLine: 'I can explain it in detail.', situation: { ru: 'Друг говорит, что может объяснить это подробно. Скажи, что ты сможешь это объяснить.', uk: 'Друг каже, що може пояснити це докладно. Скажи, що ти зможеш це пояснити.' }, accepted: ['I will be able to explain this.'] },
    { id: 'l19c7-12', type: 'dialogue', grammarPoint: 'l19c7_will_so', partnerLine: 'I can join you in a minute.', situation: { ru: 'Друг говорит, что присоединится через минуту. Скажи, что завтра вы сможете помочь.', uk: 'Друг каже, що приєднається за хвилину. Скажи, що завтра ви зможете допомогти.' }, accepted: ['We will be able to help tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c7-13', type: 'fix', grammarPoint: 'l19c7_can_phrases', wrong: 'I can explain it on detail.', accepted: ['I can explain it in detail.'] },
    { id: 'l19c7-14', type: 'fix', grammarPoint: 'l19c7_phrasal', wrong: 'You can come across at old photos here.', accepted: ['You can come across old photos here.'] },
    { id: 'l19c7-15', type: 'fix', grammarPoint: 'l19c7_phrasal', wrong: 'We can out work the cost.', accepted: ['We can work out the cost.'] },
    { id: 'l19c7-16', type: 'fix', grammarPoint: 'l19c7_will_so', wrong: 'This is so useful explanation.', accepted: ['This is such a useful explanation.'] },
  ],
};
