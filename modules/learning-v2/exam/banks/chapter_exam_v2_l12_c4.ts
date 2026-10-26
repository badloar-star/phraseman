// chapter_exam_v2_l12_c4.ts — банк экзамена v2: урок 12, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–32 урока 12
// (окончание -ed на слух: wanted, needed, washed, cleaned, packed, helped, loved, planted, watered; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C4: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l12c4_wanted', label: { ru: 'хотел, было нужно — wanted, needed', uk: 'хотів, було потрібно — wanted, needed' }, episodeOrdinals: [25, 26, 32] },
    { id: 'l12c4_home', label: { ru: 'помыл, почистил, помог — washed, cleaned, helped, packed', uk: 'помив, почистив, допоміг — washed, cleaned, helped, packed' }, episodeOrdinals: [25, 27, 32] },
    { id: 'l12c4_loved', label: { ru: 'понравилось, посадил, полил — loved, planted, watered', uk: 'сподобалося, посадив, полив — loved, planted, watered' }, episodeOrdinals: [29, 31] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c4-01', type: 'situation', grammarPoint: 'l12c4_wanted', situation: { ru: 'Мама спрашивает, зачем ты вчера ходил в магазин. Скажи, что тебе была нужна новая точилка.', uk: 'Мама питає, навіщо ти вчора ходив до магазину. Скажи, що тобі була потрібна нова стругачка.' }, accepted: ['I needed a new pencil sharpener.'] },
    { id: 'l12c4-02', type: 'situation', grammarPoint: 'l12c4_home', situation: { ru: 'Мама спрашивает, кто помыл миску для смешивания. Скажи, что ты, после обеда.', uk: 'Мама питає, хто помив миску для змішування. Скажи, що ти, після обіду.' }, accepted: ['I washed the mixing bowl after lunch.', 'I washed the mixing bowl.'] },
    { id: 'l12c4-03', type: 'situation', grammarPoint: 'l12c4_loved', situation: { ru: 'В кафе тебе очень понравилось песочное печенье. Расскажи другу.', uk: 'У кафе тобі дуже сподобалося пісочне печиво. Розкажи другові.' }, accepted: ['I loved the shortbread.', 'I loved the shortbread in the cafe.'] },
    { id: 'l12c4-04', type: 'situation', grammarPoint: 'l12c4_loved', situation: { ru: 'Напиши бабушке, что вчера вы посадили цветы.', uk: 'Напиши бабусі, що вчора ви посадили квіти.' }, accepted: ['We planted flowers yesterday.'] },
    { id: 'l12c4-05', type: 'situation', grammarPoint: 'l12c4_wanted', situation: { ru: 'Друг спрашивает, что ты хотел на завтрак. Скажи: мюсли.', uk: 'Друг питає, що ти хотів на сніданок. Скажи: мюслі.' }, accepted: ['I wanted muesli.'] },
    { id: 'l12c4-06', type: 'situation', grammarPoint: 'l12c4_home', situation: { ru: 'Расскажи, что сестра помогала на кухне.', uk: 'Розкажи, що сестра допомагала на кухні.' }, accepted: ['She helped in the kitchen.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c4-07', type: 'dialogue', grammarPoint: 'l12c4_home', partnerLine: 'The chopping board was dirty.', situation: { ru: 'Скажи, что ты её почистил.', uk: 'Скажи, що ти її почистив.' }, accepted: ['I cleaned the chopping board.'] },
    { id: 'l12c4-08', type: 'dialogue', grammarPoint: 'l12c4_loved', partnerLine: 'The tomato plant was small yesterday.', situation: { ru: 'Скажи, что ты его полил.', uk: 'Скажи, що ти його полив.' }, accepted: ['I watered the tomato plant.'] },
    { id: 'l12c4-09', type: 'dialogue', grammarPoint: 'l12c4_home', partnerLine: 'She packed her lunchbox.', situation: { ru: 'Скажи, что ты положил себе хлебную палочку.', uk: 'Скажи, що ти поклав собі хлібну паличку.' }, accepted: ['I packed a breadstick.'] },
    { id: 'l12c4-10', type: 'dialogue', grammarPoint: 'l12c4_wanted', partnerLine: 'We wanted fruit yoghurt.', situation: { ru: 'Скажи, что ты хотел пудинг.', uk: 'Скажи, що ти хотів пудинг.' }, accepted: ['I wanted the pudding.', 'I wanted pudding.'] },
    { id: 'l12c4-11', type: 'dialogue', grammarPoint: 'l12c4_wanted', partnerLine: 'I finished my homework yesterday.', situation: { ru: 'Скажи, что тебе была нужна тетрадь.', uk: 'Скажи, що тобі був потрібен зошит.' }, accepted: ['I needed an exercise book.'] },
    { id: 'l12c4-12', type: 'dialogue', grammarPoint: 'l12c4_loved', partnerLine: 'We had tea after lunch.', situation: { ru: 'Скажи, что тебе очень понравилась булочка к чаю.', uk: 'Скажи, що тобі дуже сподобалася булочка до чаю.' }, accepted: ['I loved the scone.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c4-13', type: 'fix', grammarPoint: 'l12c4_wanted', wrong: 'I want muesli yesterday.', accepted: ['I wanted muesli yesterday.'] },
    { id: 'l12c4-14', type: 'fix', grammarPoint: 'l12c4_home', wrong: 'She help in the kitchen yesterday.', accepted: ['She helped in the kitchen yesterday.'] },
    { id: 'l12c4-15', type: 'fix', grammarPoint: 'l12c4_loved', wrong: 'We plant a fruit tree yesterday.', accepted: ['We planted a fruit tree yesterday.'] },
    { id: 'l12c4-16', type: 'fix', grammarPoint: 'l12c4_home', wrong: 'The baking tray were hot yesterday.', accepted: ['The baking tray was hot yesterday.'] },
  ],
};
