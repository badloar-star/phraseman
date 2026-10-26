// chapter_exam_v2_l18_c3.ts — банк экзамена v2: урок 18, глава 3 (эпизоды 17–24). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 3 — «as strong as yours» (одинаково), «cheaper than» из главы 1 и планы «We are going to buy …» / «We are meeting … at five». Только слова и формы эпизодов 1–24 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C3: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l18c3_as_as', label: { ru: 'одинаково: as strong / cheap / large as …', uk: 'однаково: as strong / cheap / large as …' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24] },
    { id: 'l18c3_er_than', label: { ru: 'сравниваем: cheaper / lighter / longer than …', uk: 'порівнюємо: cheaper / lighter / longer than …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 24] },
    { id: 'l18c3_plans', label: { ru: 'планы: We are going to buy … / We are meeting … at five', uk: 'плани: We are going to buy … / We are meeting … at five' }, episodeOrdinals: [18, 19, 20, 21, 22, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c3-01', type: 'situation', grammarPoint: 'l18c3_as_as', situation: { ru: 'Твой растворимый кофе такой же крепкий, как ваш. Скажи об этом.', uk: 'Твоя розчинна кава така ж міцна, як ваша. Скажи про це.' }, accepted: ['This instant coffee is as strong as yours.'] },
    { id: 'l18c3-02', type: 'situation', grammarPoint: 'l18c3_as_as', situation: { ru: 'Этот стеклянный кувшин такой же большой, как ваш. Скажи об этом.', uk: 'Цей скляний глечик такий же великий, як ваш. Скажи про це.' }, accepted: ['This glass jar is as large as yours.'] },
    { id: 'l18c3-03', type: 'situation', grammarPoint: 'l18c3_er_than', situation: { ru: 'Это пятновыводитель дешевле того. Скажи об этом.', uk: 'Цей плямовивідник дешевший за той. Скажи про це.' }, accepted: ['This stain remover is cheaper than that one.'] },
    { id: 'l18c3-04', type: 'situation', grammarPoint: 'l18c3_er_than', situation: { ru: 'Эти очки для чтения легче моих. Скажи об этом.', uk: 'Ці окуляри для читання легші за мої. Скажи про це.' }, accepted: ['These reading glasses are lighter than mine.'] },
    { id: 'l18c3-05', type: 'situation', grammarPoint: 'l18c3_plans', situation: { ru: 'Вы решили купить средство для стирки. Скажи, что вы собираетесь его купить.', uk: 'Ви вирішили купити засіб для прання. Скажи, що ви збираєтесь його купити.' }, accepted: ['We are going to buy laundry detergent.'] },
    { id: 'l18c3-06', type: 'situation', grammarPoint: 'l18c3_plans', situation: { ru: 'В пять вы встречаетесь в магазине — договорились. Скажи об этом.', uk: 'О п’ятій ви зустрічаєтесь у магазині — домовилися. Скажи про це.' }, accepted: ['We are meeting at the shop at five.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c3-07', type: 'dialogue', grammarPoint: 'l18c3_as_as', partnerLine: 'This black tea is as hot as yours.', situation: { ru: 'Друг говорит, что этот чёрный чай такой же горячий, как ваш. Скажи, что этот электрический чайник такой же быстрый, как ваш.', uk: 'Друг каже, що цей чорний чай такий же гарячий, як ваш. Скажи, що цей електричний чайник такий же швидкий, як ваш.' }, accepted: ['This electric kettle is as fast as ours.'] },
    { id: 'l18c3-08', type: 'dialogue', grammarPoint: 'l18c3_as_as', partnerLine: 'These contact lenses are as cheap as mine.', situation: { ru: 'Друг говорит, что эти линзы такие же дешёвые, как его. Скажи, что этот футляр для очков такой же мягкий, как твой.', uk: 'Друг каже, що ці лінзи такі ж дешеві, як його. Скажи, що цей футляр для окулярів такий же м’який, як твій.' }, accepted: ['This glasses case is as soft as mine.'] },
    { id: 'l18c3-09', type: 'dialogue', grammarPoint: 'l18c3_er_than', partnerLine: 'The daily special is as fresh as the salad.', situation: { ru: 'Друг говорит, что блюдо дня такое же свежее, как салат. Скажи, что блюдо дня дешевле салата.', uk: 'Друг каже, що страва дня така ж свіжа, як салат. Скажи, що страва дня дешевша за салат.' }, accepted: ['The daily special is cheaper than the salad.'] },
    { id: 'l18c3-10', type: 'dialogue', grammarPoint: 'l18c3_er_than', partnerLine: 'Your weekend break is as long as ours.', situation: { ru: 'Друг говорит, что его выходные такие же длинные, как ваши. Скажи, что этот уикенд длиннее его.', uk: 'Друг каже, що його вихідні такі ж довгі, як ваші. Скажи, що цей вікенд довший за його.' }, accepted: ['This weekend break is longer than ours.'] },
    { id: 'l18c3-11', type: 'dialogue', grammarPoint: 'l18c3_plans', partnerLine: 'This litter tray is as wide as ours.', situation: { ru: 'Друг говорит, что этот лоток такой же широкий, как ваш. Скажи, что вы собираетесь купить лоток.', uk: 'Друг каже, що цей лоток такий же широкий, як ваш. Скажи, що ви збираєтесь купити лоток.' }, accepted: ['We are going to buy a litter tray.'] },
    { id: 'l18c3-12', type: 'dialogue', grammarPoint: 'l18c3_plans', partnerLine: 'This takeaway meal is as hot as yours.', situation: { ru: 'Друг говорит, что это блюдо с собой такое же горячее, как ваше. Скажи, что в час вы обедаете с друзьями — договорились.', uk: 'Друг каже, що ця страва з собою така ж гаряча, як ваша. Скажи, що о першій ви обідаєте з друзями — домовилися.' }, accepted: ['We are having lunch with friends at one.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c3-13', type: 'fix', grammarPoint: 'l18c3_as_as', wrong: 'This lunch menu is as cheap that one.', accepted: ['This lunch menu is as cheap as that one.'] },
    { id: 'l18c3-14', type: 'fix', grammarPoint: 'l18c3_er_than', wrong: 'This water jug is more heavy than mine.', accepted: ['This water jug is heavier than mine.'] },
    { id: 'l18c3-15', type: 'fix', grammarPoint: 'l18c3_plans', wrong: 'We are going buy a storage box.', accepted: ['We are going to buy a storage box.'] },
    { id: 'l18c3-16', type: 'fix', grammarPoint: 'l18c3_plans', wrong: 'We leaving for our camping trip on Friday.', accepted: ['We are leaving for our camping trip on Friday.'] },
  ],
};
