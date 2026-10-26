// chapter_exam_v2_l10_c6.ts — банк экзамена v2: урок 10, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–48 — наверное perhaps / probably / quite, какое блюдо mild / creamy / hard / nearly ready, делаю сейчас I am chopping / peeling / washing; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L10_C6: ChapterExamV2Bank = {
  lessonOrdinal: 10,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l10c6_maybe', label: { ru: 'наверное — perhaps, probably, quite', uk: 'мабуть — perhaps, probably, quite' }, episodeOrdinals: [41] },
    { id: 'l10c6_taste', label: { ru: 'какое блюдо — mild, creamy, hard, nearly ready', uk: 'яка страва — mild, creamy, hard, nearly ready' }, episodeOrdinals: [43, 48] },
    { id: 'l10c6_doing', label: { ru: 'делаю сейчас — I am chopping, peeling, washing', uk: 'роблю зараз — I am chopping, peeling, washing' }, episodeOrdinals: [46, 47, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l10c6-01', type: 'situation', grammarPoint: 'l10c6_maybe', situation: { ru: 'Друг не отвечает на сообщения. Скажи: может быть, он в автобусе.', uk: 'Друг не відповідає на повідомлення. Скажи: можливо, він в автобусі.' }, accepted: ['Perhaps he is on the bus.'] },
    { id: 'l10c6-02', type: 'situation', grammarPoint: 'l10c6_taste', situation: { ru: 'Гость боится острого. Скажи, что этот соус неострый.', uk: 'Гість боїться гострого. Скажи, що цей соус негострий.' }, accepted: ['This sauce is mild.'] },
    { id: 'l10c6-03', type: 'situation', grammarPoint: 'l10c6_doing', situation: { ru: 'Ты готовишь ужин и режешь чеснок. Скажи, что режешь чеснок.', uk: 'Ти готуєш вечерю й ріжеш часник. Скажи, що ріжеш часник.' }, accepted: ['I am chopping garlic.'] },
    { id: 'l10c6-04', type: 'situation', grammarPoint: 'l10c6_maybe', situation: { ru: 'Брат не берёт трубку. Скажи, что он, скорее всего, дома.', uk: 'Брат не бере слухавку. Скажи, що він, найімовірніше, удома.' }, accepted: ['He is probably at home.'] },
    { id: 'l10c6-05', type: 'situation', grammarPoint: 'l10c6_taste', situation: { ru: 'Суп получился со сливками. Скажи, что суп сливочный.', uk: 'Суп вийшов із вершками. Скажи, що суп вершковий.' }, accepted: ['The soup is creamy.'] },
    { id: 'l10c6-06', type: 'situation', grammarPoint: 'l10c6_doing', situation: { ru: 'Ты чистишь грейпфрут к завтраку. Скажи об этом.', uk: 'Ти чистиш грейпфрут до сніданку. Скажи про це.' }, accepted: ['I am peeling a grapefruit.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c6-07', type: 'dialogue', grammarPoint: 'l10c6_maybe', partnerLine: 'It is quite warm.', situation: { ru: 'Скажи, что здесь довольно холодно.', uk: 'Скажи, що тут досить холодно.' }, accepted: ['It is quite cold.'] },
    { id: 'l10c6-08', type: 'dialogue', grammarPoint: 'l10c6_taste', partnerLine: 'This apricot is sweet.', situation: { ru: 'Скажи, что этот сыр твёрдый.', uk: 'Скажи, що цей сир твердий.' }, accepted: ['This cheese is hard.'] },
    { id: 'l10c6-09', type: 'dialogue', grammarPoint: 'l10c6_doing', partnerLine: 'The lentils are ready.', situation: { ru: 'Скажи, что ты моешь цветную капусту.', uk: 'Скажи, що ти миєш цвітну капусту.' }, accepted: ['I am washing the cauliflower.'] },
    { id: 'l10c6-10', type: 'dialogue', grammarPoint: 'l10c6_maybe', partnerLine: 'Perhaps she is at work.', situation: { ru: 'Скажи, что они, скорее всего, на работе.', uk: 'Скажи, що вони, найімовірніше, на роботі.' }, accepted: ['They are probably at work.'] },
    { id: 'l10c6-11', type: 'dialogue', grammarPoint: 'l10c6_taste', partnerLine: 'We have enough milk.', situation: { ru: 'Скажи, что завтрак почти готов.', uk: 'Скажи, що сніданок майже готовий.' }, accepted: ['Breakfast is nearly ready.'] },
    { id: 'l10c6-12', type: 'dialogue', grammarPoint: 'l10c6_doing', partnerLine: 'I am chopping parsley.', situation: { ru: 'Скажи, что вы моете редиску.', uk: 'Скажи, що ви миєте редиску.' }, accepted: ['We are washing radishes.', 'We are washing the radishes.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l10c6-13', type: 'fix', grammarPoint: 'l10c6_maybe', wrong: 'Perhaps he on the bus.', accepted: ['Perhaps he is on the bus.'] },
    { id: 'l10c6-14', type: 'fix', grammarPoint: 'l10c6_taste', wrong: 'This sauce are mild.', accepted: ['This sauce is mild.'] },
    { id: 'l10c6-15', type: 'fix', grammarPoint: 'l10c6_doing', wrong: 'I am chop garlic.', accepted: ['I am chopping garlic.'] },
    { id: 'l10c6-16', type: 'fix', grammarPoint: 'l10c6_doing', wrong: 'I peeling a grapefruit.', accepted: ['I am peeling a grapefruit.'] },
  ],
};
