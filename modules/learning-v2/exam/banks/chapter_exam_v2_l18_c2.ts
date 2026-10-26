// chapter_exam_v2_l18_c2.ts — банк экзамена v2: урок 18, глава 2 (эпизоды 9–16). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 2 — «the cheapest / the largest» (самый), «nearer than» (сравнение из главы 1) и планы: «We are going to visit …» и «We are meeting … tomorrow». Только слова и формы эпизодов 1–16 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C2: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l18c2_superlative', label: { ru: 'самый: the nearest / the cheapest / the largest', uk: 'найбільш: the nearest / the cheapest / the largest' }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l18c2_er_than', label: { ru: 'сравниваем: nearer / faster / softer than …', uk: 'порівнюємо: nearer / faster / softer than …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 15, 16] },
    { id: 'l18c2_plans', label: { ru: 'планы: We are going to … / We are …ing tomorrow', uk: 'плани: We are going to … / We are …ing tomorrow' }, episodeOrdinals: [10, 11, 12, 13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c2-01', type: 'situation', grammarPoint: 'l18c2_superlative', situation: { ru: 'Этот местный магазин ближе всех остальных. Скажи об этом.', uk: 'Цей місцевий магазин ближчий за всі інші. Скажи про це.' }, accepted: ['This local shop is the nearest.'] },
    { id: 'l18c2-02', type: 'situation', grammarPoint: 'l18c2_superlative', situation: { ru: 'Из двух садов задний — самый большой. Скажи об этом.', uk: 'З двох садів задній — найбільший. Скажи про це.' }, accepted: ['This back garden is the largest.'] },
    { id: 'l18c2-03', type: 'situation', grammarPoint: 'l18c2_er_than', situation: { ru: 'Этот местный магазин ближе, чем тот. Скажи об этом.', uk: 'Цей місцевий магазин ближчий, ніж той. Скажи про це.' }, accepted: ['This local shop is nearer than that one.'] },
    { id: 'l18c2-04', type: 'situation', grammarPoint: 'l18c2_er_than', situation: { ru: 'Сушёные фрукты слаще простого йогурта. Скажи об этом.', uk: 'Сушені фрукти солодші за простий йогурт. Скажи про це.' }, accepted: ['The dried fruit is sweeter than the plain yoghurt.'] },
    { id: 'l18c2-05', type: 'situation', grammarPoint: 'l18c2_plans', situation: { ru: 'Вы решили зайти в местный магазин. Скажи, что собираетесь его посетить.', uk: 'Ви вирішили зайти в місцевий магазин. Скажи, що збираєтесь його відвідати.' }, accepted: ['We are going to visit the local shop.'] },
    { id: 'l18c2-06', type: 'situation', grammarPoint: 'l18c2_plans', situation: { ru: 'Завтра вы встречаетесь в заднем саду — договорились. Скажи об этом.', uk: 'Завтра ви зустрічаєтесь у задньому саду — домовилися. Скажи про це.' }, accepted: ['We are meeting in the back garden tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c2-07', type: 'dialogue', grammarPoint: 'l18c2_superlative', partnerLine: 'This online shop is the cheapest option.', situation: { ru: 'Друг говорит, что этот интернет-магазин самый дешёвый. Скажи, что обычная доставка здесь самая медленная.', uk: 'Друг каже, що цей інтернет-магазин найдешевший. Скажи, що звичайна доставка тут найповільніша.' }, accepted: ['Standard delivery is the slowest option here.'] },
    { id: 'l18c2-08', type: 'dialogue', grammarPoint: 'l18c2_superlative', partnerLine: 'This school bus is the oldest.', situation: { ru: 'Друг говорит, что этот школьный автобус самый старый. Скажи, что вход в школу самый безопасный.', uk: 'Друг каже, що цей шкільний автобус найстаріший. Скажи, що вхід до школи найбезпечніший.' }, accepted: ['This school entrance is the safest.'] },
    { id: 'l18c2-09', type: 'dialogue', grammarPoint: 'l18c2_er_than', partnerLine: 'Standard delivery is the slowest option here.', situation: { ru: 'Друг говорит, что обычная доставка здесь самая медленная. Скажи, что экспресс-доставка быстрее обычной.', uk: 'Друг каже, що звичайна доставка тут найповільніша. Скажи, що експрес-доставка швидша за звичайну.' }, accepted: ['Express delivery is faster than standard delivery.'] },
    { id: 'l18c2-10', type: 'dialogue', grammarPoint: 'l18c2_er_than', partnerLine: 'This dining table is the widest.', situation: { ru: 'Друг говорит, что этот обеденный стол самый широкий. Скажи, что этот офисный стул мягче твоего.', uk: 'Друг каже, що цей обідній стіл найширший. Скажи, що це офісне крісло м’якше за твоє.' }, accepted: ['This office chair is softer than mine.'] },
    { id: 'l18c2-11', type: 'dialogue', grammarPoint: 'l18c2_plans', partnerLine: 'This dining chair is the lightest.', situation: { ru: 'Друг говорит, что этот обеденный стул самый лёгкий. Скажи, что вы собираетесь купить кухонный стол.', uk: 'Друг каже, що цей обідній стілець найлегший. Скажи, що ви збираєтесь купити кухонний стіл.' }, accepted: ['We are going to buy a kitchen table.'] },
    { id: 'l18c2-12', type: 'dialogue', grammarPoint: 'l18c2_plans', partnerLine: 'We booked the latest dental appointment.', situation: { ru: 'Друг говорит, что вы записались на самое позднее время к зубному. Скажи, что завтра в четыре вы идёте к дантисту — договорились.', uk: 'Друг каже, що ви записалися на найпізніший час до зубного. Скажи, що завтра о четвертій ви йдете до дантиста — домовилися.' }, accepted: ['We are seeing the dentist at four tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c2-13', type: 'fix', grammarPoint: 'l18c2_superlative', wrong: 'This clinic has the longer waiting time.', accepted: ['This clinic has the longest waiting time.'] },
    { id: 'l18c2-14', type: 'fix', grammarPoint: 'l18c2_er_than', wrong: 'This phone appointment is shortest than mine.', accepted: ['This phone appointment is shorter than mine.'] },
    { id: 'l18c2-15', type: 'fix', grammarPoint: 'l18c2_plans', wrong: 'We are going choose standard delivery.', accepted: ['We are going to choose standard delivery.'] },
    { id: 'l18c2-16', type: 'fix', grammarPoint: 'l18c2_plans', wrong: 'We collecting our order at three tomorrow.', accepted: ['We are collecting our order at three tomorrow.'] },
  ],
};
