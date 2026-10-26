// chapter_exam_v2_l14_c4.ts — банк экзамена v2: урок 14, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–32 урока 14
// (прерванное действие: was / were + -ing, when you called / when I arrived / when it started to rain); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C4: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l14c4_called', label: { ru: 'когда ты позвонил — when you called', uk: 'коли ти зателефонував — when you called' }, episodeOrdinals: [25, 30, 32] },
    { id: 'l14c4_arrived', label: { ru: 'когда я пришёл — when I arrived', uk: 'коли я прийшов — when I arrived' }, episodeOrdinals: [26, 29, 31] },
    { id: 'l14c4_rain', label: { ru: 'когда пошёл дождь — when it started to rain', uk: 'коли пішов дощ — when it started to rain' }, episodeOrdinals: [27] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c4-01', type: 'situation', grammarPoint: 'l14c4_called', situation: { ru: 'Друг обижен, что ты не ответил. Объясни: ты чистил ботильоны, когда он позвонил.', uk: 'Друг ображений, що ти не відповів. Поясни: ти чистив черевики, коли він зателефонував.' }, accepted: ['I was cleaning my ankle boots when you called.'] },
    { id: 'l14c4-02', type: 'situation', grammarPoint: 'l14c4_arrived', situation: { ru: 'Расскажи, что сестра собирала балетки, когда ты пришёл.', uk: 'Розкажи, що сестра збирала балетки, коли ти прийшов.' }, accepted: ['She was packing her ballet flats when I arrived.'] },
    { id: 'l14c4-03', type: 'situation', grammarPoint: 'l14c4_rain', situation: { ru: 'Вы шли к маяку, и тут пошёл дождь. Расскажи об этом.', uk: 'Ви йшли до маяка, і тут пішов дощ. Розкажи про це.' }, accepted: ['We were walking towards the lighthouse when it started to rain.'] },
    { id: 'l14c4-04', type: 'situation', grammarPoint: 'l14c4_called', situation: { ru: 'Объясни другу: ты гладил дорожку на стол, когда он позвонил.', uk: 'Поясни другові: ти прасував доріжку на стіл, коли він зателефонував.' }, accepted: ['I was ironing a table runner when you called.'] },
    { id: 'l14c4-05', type: 'situation', grammarPoint: 'l14c4_arrived', situation: { ru: 'Ты пришёл к друзьям, а они готовили. Расскажи об этом.', uk: 'Ти прийшов до друзів, а вони готували. Розкажи про це.' }, accepted: ['They were cooking when I arrived.'] },
    { id: 'l14c4-06', type: 'situation', grammarPoint: 'l14c4_rain', situation: { ru: 'Ты смотрел на водопад, и тут пошёл дождь. Расскажи.', uk: 'Ти дивився на водоспад, і тут пішов дощ. Розкажи.' }, accepted: ['I was watching a waterfall when it started to rain.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c4-07', type: 'dialogue', grammarPoint: 'l14c4_called', partnerLine: 'She was making tea when we arrived.', situation: { ru: 'Скажи другу, что ты накрывал на стол, когда он позвонил.', uk: 'Скажи другові, що ти накривав на стіл, коли він зателефонував.' }, accepted: ['I was setting the table when you called.'] },
    { id: 'l14c4-08', type: 'dialogue', grammarPoint: 'l14c4_arrived', partnerLine: 'I was unpacking when you called.', situation: { ru: 'Скажи, что они говорили о поездке, когда ты пришёл.', uk: 'Скажи, що вони говорили про поїздку, коли ти прийшов.' }, accepted: ['They were talking about the trip when I arrived.'] },
    { id: 'l14c4-09', type: 'dialogue', grammarPoint: 'l14c4_rain', partnerLine: 'They were taking photos when you called.', situation: { ru: 'Скажи, что ты гулял, когда пошёл дождь.', uk: 'Скажи, що ти гуляв, коли пішов дощ.' }, accepted: ['I was walking when it started to rain.'] },
    { id: 'l14c4-10', type: 'dialogue', grammarPoint: 'l14c4_called', partnerLine: 'I was drawing when she arrived.', situation: { ru: 'Скажи другу, что вы гуляли по пляжу, когда он позвонил.', uk: 'Скажи другові, що ви гуляли пляжем, коли він зателефонував.' }, accepted: ['We were walking on the beach when you called.'] },
    { id: 'l14c4-11', type: 'dialogue', grammarPoint: 'l14c4_arrived', partnerLine: 'I was making soup when you called.', situation: { ru: 'Скажи, что она читала рецепт, когда ты пришёл.', uk: 'Скажи, що вона читала рецепт, коли ти прийшов.' }, accepted: ['She was reading the recipe when I arrived.'] },
    { id: 'l14c4-12', type: 'dialogue', grammarPoint: 'l14c4_arrived', partnerLine: 'I was making a salad when you called.', situation: { ru: 'Скажи, что они собирали мяту, когда ты пришёл.', uk: 'Скажи, що вони збирали м’яту, коли ти прийшов.' }, accepted: ['They were picking mint when I arrived.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c4-13', type: 'fix', grammarPoint: 'l14c4_called', wrong: 'I was clean my ankle boots when you called.', accepted: ['I was cleaning my ankle boots when you called.'] },
    { id: 'l14c4-14', type: 'fix', grammarPoint: 'l14c4_arrived', wrong: 'She packing when I arrived.', accepted: ['She was packing when I arrived.'] },
    { id: 'l14c4-15', type: 'fix', grammarPoint: 'l14c4_rain', wrong: 'I were walking when it started to rain.', accepted: ['I was walking when it started to rain.'] },
    { id: 'l14c4-16', type: 'fix', grammarPoint: 'l14c4_called', wrong: 'We was looking for the tea cosy when you called.', accepted: ['We were looking for the tea cosy when you called.'] },
  ],
};
