// chapter_exam_v2_l18_c5.ts — банк экзамена v2: урок 18, глава 5 (эпизоды 33–40). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 5 — «so kind» (так, без существительного) и «such a helpful person» (такой, с существительным), плюс планы «We are going to …» и «We are having … tonight». Только слова и формы эпизодов 1–40 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C5: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l18c5_so', label: { ru: 'так: so kind / so loud / so nice', uk: 'так: so kind / so loud / so nice' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
    { id: 'l18c5_such', label: { ru: 'такой: such a helpful person / such a waste of time', uk: 'такий: such a helpful person / such a waste of time' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
    { id: 'l18c5_plans', label: { ru: 'планы: We are going to … / We are having … tonight', uk: 'плани: We are going to … / We are having … tonight' }, episodeOrdinals: [34, 35, 36, 37, 38, 39, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c5-01', type: 'situation', grammarPoint: 'l18c5_so', situation: { ru: 'Твой близкий друг очень добрый. Скажи, что он такой добрый.', uk: 'Твій близький друг дуже добрий. Скажи, що він такий добрий.' }, accepted: ['My close friend is so kind.'] },
    { id: 'l18c5-02', type: 'situation', grammarPoint: 'l18c5_so', situation: { ru: 'Сильный дождь за окном очень шумный. Скажи, что он такой шумный.', uk: 'Сильний дощ за вікном дуже гучний. Скажи, що він такий гучний.' }, accepted: ['The heavy rain is so loud.'] },
    { id: 'l18c5-03', type: 'situation', grammarPoint: 'l18c5_such', situation: { ru: 'Ваш общий друг всегда готов помочь. Скажи, что он такой отзывчивый человек.', uk: 'Ваш спільний друг завжди готовий допомогти. Скажи, що він така відповідальна людина.' }, accepted: ['Our mutual friend is such a helpful person.'] },
    { id: 'l18c5-04', type: 'situation', grammarPoint: 'l18c5_such', situation: { ru: 'Ты потратил время зря. Скажи, что это такая трата времени.', uk: 'Ти витратив час даремно. Скажи, що це така втрата часу.' }, accepted: ['This is such a waste of time.'] },
    { id: 'l18c5-05', type: 'situation', grammarPoint: 'l18c5_plans', situation: { ru: 'Вы решили устроить день рождения. Скажи, что собираетесь его спланировать.', uk: 'Ви вирішили влаштувати день народження. Скажи, що збираєтесь його спланувати.' }, accepted: ['We are going to plan a birthday party.'] },
    { id: 'l18c5-06', type: 'situation', grammarPoint: 'l18c5_plans', situation: { ru: 'Сегодня вечером у вас семейный ужин — договорились. Скажи об этом.', uk: 'Сьогодні ввечері у вас сімейна вечеря — домовилися. Скажи про це.' }, accepted: ['We are having a family dinner tonight.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c5-07', type: 'dialogue', grammarPoint: 'l18c5_so', partnerLine: 'The birthday party is so noisy.', situation: { ru: 'Друг говорит, что праздник такой шумный. Скажи, что семейный ужин такой приятный.', uk: 'Друг каже, що свято таке шумне. Скажи, що сімейна вечеря така приємна.' }, accepted: ['This family dinner is so lovely.'] },
    { id: 'l18c5-08', type: 'dialogue', grammarPoint: 'l18c5_so', partnerLine: 'The street performance is so funny.', situation: { ru: 'Друг говорит, что уличное представление такое смешное. Скажи, что свежий воздух такой приятный.', uk: 'Друг каже, що вуличне видовище таке смішне. Скажи, що свіже повітря таке приємне.' }, accepted: ['The fresh air is so nice.'] },
    { id: 'l18c5-09', type: 'dialogue', grammarPoint: 'l18c5_such', partnerLine: 'We received such a warm welcome.', situation: { ru: 'Друг говорит, что вас тепло встретили. Скажи, что у тебя такая большая улыбка.', uk: 'Друг каже, що вас тепло зустріли. Скажи, що в тебе така велика усмішка.' }, accepted: ['You have such a big smile.'] },
    { id: 'l18c5-10', type: 'dialogue', grammarPoint: 'l18c5_such', partnerLine: 'This is such a big music festival.', situation: { ru: 'Друг говорит, что это такой большой музыкальный фестиваль. Скажи, что вы на таком отличном живом концерте.', uk: 'Друг каже, що це такий великий музичний фестиваль. Скажи, що ви на такому чудовому живому концерті.' }, accepted: ['We are at such a great live concert.'] },
    { id: 'l18c5-11', type: 'dialogue', grammarPoint: 'l18c5_plans', partnerLine: 'The heavy rain is so loud.', situation: { ru: 'Друг говорит, что сильный дождь такой громкий. Скажи, что вы собираетесь остаться дома в сильный дождь.', uk: 'Друг каже, що сильний дощ такий гучний. Скажи, що ви збираєтесь залишитися вдома під сильним дощем.' }, accepted: ['We are going to stay home in the heavy rain.'] },
    { id: 'l18c5-12', type: 'dialogue', grammarPoint: 'l18c5_plans', partnerLine: 'Free parking is such a great help.', situation: { ru: 'Друг говорит, что бесплатная парковка — такая большая помощь. Скажи, что вы собираетесь посетить благотворительное мероприятие.', uk: 'Друг каже, що безкоштовна парковка — така велика допомога. Скажи, що ви збираєтесь відвідати благодійний захід.' }, accepted: ['We are going to visit the charity event.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c5-13', type: 'fix', grammarPoint: 'l18c5_so', wrong: 'My close friend is such kind.', accepted: ['My close friend is so kind.'] },
    { id: 'l18c5-14', type: 'fix', grammarPoint: 'l18c5_such', wrong: 'Our mutual friend is such helpful person.', accepted: ['Our mutual friend is such a helpful person.'] },
    { id: 'l18c5-15', type: 'fix', grammarPoint: 'l18c5_such', wrong: 'My next-door neighbour is so a kind person.', accepted: ['My next-door neighbour is such a kind person.'] },
    { id: 'l18c5-16', type: 'fix', grammarPoint: 'l18c5_plans', wrong: 'We having a family dinner tonight.', accepted: ['We are having a family dinner tonight.'] },
  ],
};
