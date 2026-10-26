// chapter_exam_v2_l30_c1.ts — банк экзамена v2: урок 30, глава 1 (эпизоды 1–8). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 1 — пересказ чужих слов («He said he was tired»), желание о настоящем («I wish I had more time») и уточнение без «which / that» («The match we watched was disappointing»). Только слова и формы эпизодов 1–8 урока 30; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L30_C1: ChapterExamV2Bank = {
  lessonOrdinal: 30,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l30c1_said', label: { ru: 'пересказ: He said he was tired / She said she needed help', uk: 'переказ: He said he was tired / She said she needed help' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'l30c1_wish', label: { ru: 'желание о настоящем: I wish I had / were …', uk: 'бажання про теперішнє: I wish I had / were …' }, episodeOrdinals: [2, 3, 4, 5, 6, 7, 8] },
    { id: 'l30c1_contact', label: { ru: 'уточнение: The match we watched / The photo he took', uk: 'уточнення: The match we watched / The photo he took' }, episodeOrdinals: [2, 3, 4, 5, 6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l30c1-01', type: 'situation', grammarPoint: 'l30c1_said', situation: { ru: 'Друг вымотан. Передай его слова: он сказал, что устал.', uk: 'Друг виснажений. Перекажи його слова: він сказав, що втомився.' }, accepted: ['He said he was tired.', 'He said that he was tired.'] },
    { id: 'l30c1-02', type: 'situation', grammarPoint: 'l30c1_said', situation: { ru: 'Сестра просила тебя о помощи. Передай её слова: она сказала, что ей нужна помощь.', uk: 'Сестра просила тебе про допомогу. Перекажи її слова: вона сказала, що їй потрібна допомога.' }, accepted: ['She said she needed help.', 'She said that she needed help.'] },
    { id: 'l30c1-03', type: 'situation', grammarPoint: 'l30c1_wish', situation: { ru: 'Времени вечно не хватает. Скажи, что хотел бы иметь больше времени.', uk: 'Часу вічно бракує. Скажи, що хотів би мати більше часу.' }, accepted: ['I wish I had more time.'] },
    { id: 'l30c1-04', type: 'situation', grammarPoint: 'l30c1_wish', situation: { ru: 'Ты сорвался на близких. Скажи, что хотел бы быть спокойнее.', uk: 'Ти зірвався на рідних. Скажи, що хотів би бути спокійнішим.' }, accepted: ['I wish I were calmer.'] },
    { id: 'l30c1-05', type: 'situation', grammarPoint: 'l30c1_contact', situation: { ru: 'Вы смотрели матч, и он разочаровал. Скажи, что матч, который вы смотрели, разочаровывающий.', uk: 'Ви дивилися матч, і він розчарував. Скажи, що матч, який ви дивилися, розчаровуючий.' }, accepted: ['The match we watched was disappointing.'] },
    { id: 'l30c1-06', type: 'situation', grammarPoint: 'l30c1_contact', situation: { ru: 'Друг сделал красивый снимок. Скажи, что фото, которое он сделал, прекрасное.', uk: 'Друг зробив гарний знімок. Скажи, що фото, яке він зробив, чудове.' }, accepted: ['The photo he took is lovely.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l30c1-07', type: 'dialogue', grammarPoint: 'l30c1_said', partnerLine: 'He said he was not ready.', situation: { ru: 'Друг пересказывает чужие слова. Скажи, что она сказала, что ей стало лучше.', uk: 'Друг переказує чужі слова. Скажи, що вона сказала, що їй стало краще.' }, accepted: ['She said she felt better.', 'She said that she felt better.'] },
    { id: 'l30c1-08', type: 'dialogue', grammarPoint: 'l30c1_said', partnerLine: 'She said she felt a sense of anticipation.', situation: { ru: 'Друг пересказывает её слова. Скажи, что он сказал, что ему нужен перерыв.', uk: 'Друг переказує її слова. Скажи, що він сказав, що йому потрібна перерва.' }, accepted: ['He said he needed a break.', 'He said that he needed a break.'] },
    { id: 'l30c1-09', type: 'dialogue', grammarPoint: 'l30c1_wish', partnerLine: 'He said he was disappointed.', situation: { ru: 'Друг пересказывает слова о разочаровании. Скажи, что хотел бы быть терпеливее.', uk: 'Друг переказує слова про розчарування. Скажи, що хотів би бути терплячішим.' }, accepted: ['I wish I were more patient.'] },
    { id: 'l30c1-10', type: 'dialogue', grammarPoint: 'l30c1_wish', partnerLine: 'She said she was overwhelmed with grief.', situation: { ru: 'Друг пересказывает слова о горе. Скажи, что хотел бы жить ближе.', uk: 'Друг переказує слова про горе. Скажи, що хотів би жити ближче.' }, accepted: ['I wish I lived closer.', 'I wish we lived closer.'] },
    { id: 'l30c1-11', type: 'dialogue', grammarPoint: 'l30c1_contact', partnerLine: 'The soup you made was delicious.', situation: { ru: 'Друг хвалит твой суп. Скажи, что сообщение, которое ты отправил, помогло.', uk: 'Друг хвалить твій суп. Скажи, що повідомлення, яке ти надіслав, допомогло.' }, accepted: ['The message you sent helped.'] },
    { id: 'l30c1-12', type: 'dialogue', grammarPoint: 'l30c1_contact', partnerLine: 'The conversation we had was useful.', situation: { ru: 'Друг говорит, что разговор был полезным. Скажи, что коттедж, который вы посетили, был маленьким.', uk: 'Друг каже, що розмова була корисною. Скажи, що котедж, який ви відвідали, був маленьким.' }, accepted: ['The cottage we visited was small.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l30c1-13', type: 'fix', grammarPoint: 'l30c1_said', wrong: 'He said he is tired.', accepted: ['He said he was tired.', 'He said that he was tired.'] },
    { id: 'l30c1-14', type: 'fix', grammarPoint: 'l30c1_wish', wrong: 'I wish I have more time.', accepted: ['I wish I had more time.'] },
    { id: 'l30c1-15', type: 'fix', grammarPoint: 'l30c1_contact', wrong: 'The match we watched it was disappointing.', accepted: ['The match we watched was disappointing.'] },
    { id: 'l30c1-16', type: 'fix', grammarPoint: 'l30c1_contact', wrong: 'The photo he took are lovely.', accepted: ['The photo he took is lovely.'] },
  ],
};
