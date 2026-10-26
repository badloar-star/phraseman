// chapter_exam_v2_l25_c6.ts — банк экзамена v2: урок 25, глава 6 (эпизоды 41–48). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–48 урока 25 — used to be (каким был), would (что делали питомцы), had … before / by the time.
// Ситуация и ответ сходятся по смыслу. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C6: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l25c6_used_to', label: { ru: 'каким был раньше — used to be', uk: 'яким був раніше — used to be' }, episodeOrdinals: [41, 46, 47] },
    { id: 'l25c6_would', label: { ru: 'что делали тогда — would purr', uk: 'що робили тоді — would purr' }, episodeOrdinals: [42] },
    { id: 'l25c6_had', label: { ru: 'уже раньше — had … before / by the time', uk: 'уже раніше — had … before / by the time' }, episodeOrdinals: [44, 45] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c6-01', type: 'situation', grammarPoint: 'l25c6_used_to', situation: { ru: 'Друг удивляется, что ты боишься высоты. Скажи, что в детстве ты был бесстрашным.', uk: 'Друг дивується, що ти боїшся висоти. Скажи, що в дитинстві ти був безстрашним.' }, accepted: ['I used to be fearless as a child.'] },
    { id: 'l25c6-02', type: 'situation', grammarPoint: 'l25c6_would', situation: { ru: 'Вспомни вашего кота: каждый вечер он мурлыкал рядом с тобой.', uk: 'Згадай вашого кота: щовечора він муркотів поруч із тобою.' }, accepted: ['Our cat would purr beside me every evening.'] },
    { id: 'l25c6-03', type: 'situation', grammarPoint: 'l25c6_had', situation: { ru: 'Подруга позвонила сказать тебе оценку. Скажи, что ты уже посмотрел её к её звонку.', uk: 'Подруга подзвонила сказати тобі оцінку. Скажи, що ти вже подивився її на час її дзвінка.' }, accepted: ['I had checked my grade by the time she called.'] },
    { id: 'l25c6-04', type: 'situation', grammarPoint: 'l25c6_used_to', situation: { ru: 'Расскажи о детстве: у вашего дома вы кормили бездомную кошку.', uk: 'Розкажи про дитинство: біля вашого будинку ви годували бездомну кішку.' }, accepted: ['We used to feed a stray cat.'] },
    { id: 'l25c6-05', type: 'situation', grammarPoint: 'l25c6_would', situation: { ru: 'Вспомни собаку из детства: по ночам она выла.', uk: 'Згадай собаку з дитинства: ночами вона вила.' }, accepted: ['The dog would howl at night.', 'Our dog would howl at night.'] },
    { id: 'l25c6-06', type: 'situation', grammarPoint: 'l25c6_had', situation: { ru: 'Вы поехали на такси, потому что друг настоял. Скажи, что он настоял на такси ещё до выхода.', uk: 'Ви поїхали таксі, бо друг наполіг. Скажи, що він наполіг на таксі ще до виходу.' }, accepted: ['He had insisted on a taxi before we left.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c6-07', type: 'dialogue', grammarPoint: 'l25c6_used_to', partnerLine: 'You are very tolerant.', situation: { ru: 'Скажи, что раньше ты был менее терпимым к шуму.', uk: 'Скажи, що раніше ти був менш терпимим до шуму.' }, accepted: ['I used to be less tolerant of noise.'] },
    { id: 'l25c6-08', type: 'dialogue', grammarPoint: 'l25c6_would', partnerLine: 'Our dog is very friendly.', situation: { ru: 'Скажи, что ваша собака раньше рычала на других собак.', uk: 'Скажи, що ваш собака раніше гарчав на інших собак.' }, accepted: ['Our dog would growl at other dogs.', 'Our dog used to growl at other dogs.'] },
    { id: 'l25c6-09', type: 'dialogue', grammarPoint: 'l25c6_had', partnerLine: 'It was raining all day.', situation: { ru: 'Скажи, что она предсказала дождь ещё до вашего выхода.', uk: 'Скажи, що вона передбачила дощ ще до вашого виходу.' }, accepted: ['She had predicted rain before we left.'] },
    { id: 'l25c6-10', type: 'dialogue', grammarPoint: 'l25c6_used_to', partnerLine: 'You live near the school.', situation: { ru: 'Скажи, что раньше ты жил прямо напротив школы.', uk: 'Скажи, що раніше ти жив прямо навпроти школи.' }, accepted: ['I used to live opposite the school.'] },
    { id: 'l25c6-11', type: 'dialogue', grammarPoint: 'l25c6_had', partnerLine: 'She spoke to him first.', situation: { ru: 'Скажи, что он вспомнил её имя ещё до того, как она заговорила.', uk: 'Скажи, що він згадав її ім’я ще до того, як вона заговорила.' }, accepted: ['He had recalled her name before she spoke.'] },
    { id: 'l25c6-12', type: 'dialogue', grammarPoint: 'l25c6_used_to', partnerLine: 'The cat is sleeping on the sofa.', situation: { ru: 'Вспомни: раньше кошка точила когти на улице.', uk: 'Згадай: раніше кішка гострила кігті надворі.' }, accepted: ['The cat used to sharpen its claws outside.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c6-13', type: 'fix', grammarPoint: 'l25c6_used_to', wrong: 'I used to has a tame rabbit.', accepted: ['I used to have a tame rabbit.'] },
    { id: 'l25c6-14', type: 'fix', grammarPoint: 'l25c6_would', wrong: 'Our cat would purred beside me every evening.', accepted: ['Our cat would purr beside me every evening.'] },
    { id: 'l25c6-15', type: 'fix', grammarPoint: 'l25c6_had', wrong: 'We have sent the request before the lesson began.', accepted: ['We had sent the request before the lesson began.'] },
    { id: 'l25c6-16', type: 'fix', grammarPoint: 'l25c6_used_to', wrong: 'She used to seemed mature for her age.', accepted: ['She used to seem mature for her age.'] },
  ],
};
