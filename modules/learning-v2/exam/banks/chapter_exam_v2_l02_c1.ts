// chapter_exam_v2_l02_c1.ts — банк экзамена v2: урок 2, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 1 урока 2 вводит not после am / is / are (1–8).
// Эталон — полной формой, как в эпизодах; короткие I'm not / it's not / we're not засчитываются. Вопросы вводит глава 2 — здесь их нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C1: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l02c1_am_not', label: { ru: 'я не — I am not', uk: 'я не — I am not' }, episodeOrdinals: [1, 2, 3] },
    { id: 'l02c1_is_not', label: { ru: 'он / она / оно не — is not', uk: 'він / вона / воно не — is not' }, episodeOrdinals: [1, 4, 7] },
    { id: 'l02c1_are_not', label: { ru: 'ты / мы / они не — are not', uk: 'ти / ми / вони не — are not' }, episodeOrdinals: [1, 2, 5] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c1-01', type: 'situation', grammarPoint: 'l02c1_am_not', situation: { ru: 'Друг зовёт тебя на неделю в горы. Ты сомневаешься. Скажи, что ты не уверен.', uk: 'Друг кличе тебе на тиждень у гори. Ти вагаєшся. Скажи, що ти не впевнений.' }, accepted: ['I am not sure.', "I'm not sure."] },
    { id: 'l02c1-02', type: 'situation', grammarPoint: 'l02c1_is_not', situation: { ru: 'Подруга хочет вызвать такси до вокзала. Скажи, что это недалеко.', uk: 'Подруга хоче викликати таксі до вокзалу. Скажи, що це недалеко.' }, accepted: ['It is not far.', "It's not far."] },
    { id: 'l02c1-03', type: 'situation', grammarPoint: 'l02c1_are_not', situation: { ru: 'В гостинице жёсткая кровать и шумно. Напиши сестре, что вам с мужем неудобно.', uk: 'У готелі тверде ліжко й шумно. Напиши сестрі, що вам із чоловіком незручно.' }, accepted: ['We are not comfortable.', "We're not comfortable."] },
    { id: 'l02c1-04', type: 'situation', grammarPoint: 'l02c1_is_not', situation: { ru: 'В счёте за номер нет завтрака — за него платят отдельно. Скажи, что он не включён.', uk: 'У рахунку за номер немає сніданку — за нього платять окремо. Скажи, що він не включений.' }, accepted: ['It is not included.', "It's not included."] },
    { id: 'l02c1-05', type: 'situation', grammarPoint: 'l02c1_am_not', situation: { ru: 'Коллега клянётся, что новый план точно сработает. Скажи, что ты не убеждён.', uk: 'Колега присягається, що новий план точно спрацює. Скажи, що ти не переконаний.' }, accepted: ['I am not convinced.', "I'm not convinced."] },
    { id: 'l02c1-06', type: 'situation', grammarPoint: 'l02c1_are_not', situation: { ru: 'Внуки отодвигают тарелки с кашей. Скажи бабушке, что они не голодные.', uk: 'Онуки відсувають тарілки з кашею. Скажи бабусі, що вони не голодні.' }, accepted: ['They are not hungry.', "They're not hungry."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c1-07', type: 'dialogue', grammarPoint: 'l02c1_is_not', partnerLine: 'It is broken.', situation: { ru: 'Возрази: ноутбук не сломан, он просто разряжен.', uk: 'Заперечи: ноутбук не зламаний, він просто розряджений.' }, accepted: ['It is not broken.', "It's not broken."] },
    { id: 'l02c1-08', type: 'dialogue', grammarPoint: 'l02c1_are_not', partnerLine: 'We are late.', situation: { ru: 'Жена паникует у входа в театр. Возрази: до начала десять минут — вы не опоздали.', uk: 'Дружина панікує біля входу до театру. Заперечи: до початку десять хвилин — ви не запізнилися.' }, accepted: ['We are not late.', "We're not late."] },
    { id: 'l02c1-09', type: 'dialogue', grammarPoint: 'l02c1_am_not', partnerLine: 'She is not ready.', situation: { ru: 'Муж ворчит, что сестра всё ещё собирается. Признайся, что ты сам не готов.', uk: 'Чоловік бурчить, що сестра досі збирається. Зізнайся, що ти сам не готовий.' }, accepted: ['I am not ready.', "I'm not ready."] },
    { id: 'l02c1-10', type: 'dialogue', grammarPoint: 'l02c1_is_not', partnerLine: 'She is nervous.', situation: { ru: 'Возрази: сестра перед экзаменом спокойна — она не волнуется.', uk: 'Заперечи: сестра перед іспитом спокійна — вона не хвилюється.' }, accepted: ['She is not nervous.', "She's not nervous.", 'She is calm.', "She's calm."] },
    { id: 'l02c1-11', type: 'dialogue', grammarPoint: 'l02c1_are_not', partnerLine: 'They are fake.', situation: { ru: 'Возрази: цветы в вазе не искусственные.', uk: 'Заперечи: квіти у вазі не штучні.' }, accepted: ['They are not fake.', "They're not fake.", 'They are real.', "They're real."] },
    { id: 'l02c1-12', type: 'dialogue', grammarPoint: 'l02c1_am_not', partnerLine: 'They are scared.', situation: { ru: 'Дети боятся спускаться в тёмный подвал. Скажи, что тебе не страшно.', uk: 'Діти бояться спускатися в темний підвал. Скажи, що тобі не страшно.' }, accepted: ['I am not scared.', "I'm not scared."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c1-13', type: 'fix', grammarPoint: 'l02c1_am_not', wrong: 'I not am sure.', accepted: ['I am not sure.', "I'm not sure."] },
    { id: 'l02c1-14', type: 'fix', grammarPoint: 'l02c1_is_not', wrong: 'It not is clear.', accepted: ['It is not clear.', "It's not clear."] },
    { id: 'l02c1-15', type: 'fix', grammarPoint: 'l02c1_are_not', wrong: 'They not are fresh.', accepted: ['They are not fresh.', "They're not fresh."] },
    { id: 'l02c1-16', type: 'fix', grammarPoint: 'l02c1_is_not', wrong: 'She not is interested.', accepted: ['She is not interested.', "She's not interested."] },
  ],
};
