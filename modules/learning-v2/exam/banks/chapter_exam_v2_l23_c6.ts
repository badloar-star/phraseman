// chapter_exam_v2_l23_c6.ts — банк экзамена v2: урок 23, глава 6 (эпизоды 41–48).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–48 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 6 — перемены в жизни (эпизоды 43–45), кухня и врач (46, 47), люди и места (41, 42, 48).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C6: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l23c6_life_change', label: { ru: 'перемены — I have adopted, he has quit', uk: 'зміни — I have adopted, he has quit' }, episodeOrdinals: [43, 44, 45] },
    { id: 'l23c6_kitchen_body', label: { ru: 'кухня и врач — I have made, I have donated', uk: 'кухня й лікар — I have made, I have donated' }, episodeOrdinals: [46, 47] },
    { id: 'l23c6_people_places', label: { ru: 'люди и места — I have found, I have crossed', uk: 'люди й місця — I have found, I have crossed' }, episodeOrdinals: [41, 42, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c6-01', type: 'situation', grammarPoint: 'l23c6_life_change', situation: { ru: 'Дочь принесла котёнка из приюта. Расскажи бабушке, что вы взяли кошку.', uk: 'Донька принесла кошеня з притулку. Розкажи бабусі, що ви взяли кішку.' }, accepted: ['We have adopted a cat.'] },
    { id: 'l23c6-02', type: 'situation', grammarPoint: 'l23c6_life_change', situation: { ru: 'Отец больше не курит. Похвастайся друзьям.', uk: 'Батько більше не курить. Похвалися друзям.' }, accepted: ['He has quit smoking.'] },
    { id: 'l23c6-03', type: 'situation', grammarPoint: 'l23c6_life_change', situation: { ru: 'Рядом с работой ты нашёл уютное новое кафе. Расскажи коллегам.', uk: 'Біля роботи ти знайшов затишне нове кафе. Розкажи колегам.' }, accepted: ['I have discovered a new cafe.'] },
    { id: 'l23c6-04', type: 'situation', grammarPoint: 'l23c6_kitchen_body', situation: { ru: 'Ты печёшь пирог, и тесто уже готово. Скажи маме.', uk: 'Ти печеш пиріг, і тісто вже готове. Скажи мамі.' }, accepted: ['I have made pastry.', 'I have made the pastry.', 'I have already made the pastry.'] },
    { id: 'l23c6-05', type: 'situation', grammarPoint: 'l23c6_kitchen_body', situation: { ru: 'Коллега видит пластырь у тебя на руке. Объясни, что ты сдал кровь.', uk: 'Колега бачить пластир у тебе на руці. Поясни, що ти здав кров.' }, accepted: ['I have donated blood.'] },
    { id: 'l23c6-06', type: 'situation', grammarPoint: 'l23c6_people_places', situation: { ru: 'Ты продаёшь машину, и наконец нашёлся покупатель. Скажи жене.', uk: 'Ти продаєш машину, і нарешті знайшовся покупець. Скажи дружині.' }, accepted: ['I have found a buyer.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c6-07', type: 'dialogue', grammarPoint: 'l23c6_life_change', partnerLine: "You mustn't leave the dog alone.", situation: { ru: 'Соседка недовольна новой собакой во дворе. Объясни, что твоя дочь спасла её с улицы.', uk: 'Сусідка невдоволена новим собакою у дворі. Поясни, що твоя донька врятувала його з вулиці.' }, accepted: ['She has rescued a dog.', 'She has rescued the dog.'] },
    { id: 'l23c6-08', type: 'dialogue', grammarPoint: 'l23c6_life_change', partnerLine: 'We need a good idea.', situation: { ru: 'Друзьям скучно на даче. Скажи, что твой сын придумал игру.', uk: 'Друзям нудно на дачі. Скажи, що твій син вигадав гру.' }, accepted: ['He has invented a game.'] },
    { id: 'l23c6-09', type: 'dialogue', grammarPoint: 'l23c6_kitchen_body', partnerLine: 'We need yeast.', situation: { ru: 'Бабушка ищет дрожжи для теста. Скажи, что ты их уже добавил.', uk: 'Бабуся шукає дріжджі для тіста. Скажи, що ти їх уже додав.' }, accepted: ['I have already added yeast.', 'I have added yeast.', 'I have already added the yeast.', 'I have added the yeast.'] },
    { id: 'l23c6-10', type: 'dialogue', grammarPoint: 'l23c6_kitchen_body', partnerLine: 'I need to check your toe.', situation: { ru: 'Врач видит, что ты хромаешь. Объясни, что ушиб палец на ноге.', uk: 'Лікар бачить, що ти кульгаєш. Поясни, що забив палець на нозі.' }, accepted: ['I have hurt my toe.'] },
    { id: 'l23c6-11', type: 'dialogue', grammarPoint: 'l23c6_people_places', partnerLine: 'The painter is not here.', situation: { ru: 'Ремонт стоит: маляра нет. Скажи, что жена ему уже позвонила.', uk: 'Ремонт стоїть: маляра немає. Скажи, що дружина йому вже зателефонувала.' }, accepted: ['She has already called the painter.', 'She has called the painter.'] },
    { id: 'l23c6-12', type: 'dialogue', grammarPoint: 'l23c6_people_places', partnerLine: 'The champion is here.', situation: { ru: 'На турнире брат показывает на чемпиона. Скажи, что ты с ним уже познакомился.', uk: 'На турнірі брат показує на чемпіона. Скажи, що ти з ним уже познайомився.' }, accepted: ['I have already met the champion.', 'I have met the champion.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c6-13', type: 'fix', grammarPoint: 'l23c6_life_change', wrong: 'We have survive a storm.', accepted: ['We have survived a storm.'] },
    { id: 'l23c6-14', type: 'fix', grammarPoint: 'l23c6_kitchen_body', wrong: 'She have cooked oats.', accepted: ['She has cooked oats.'] },
    { id: 'l23c6-15', type: 'fix', grammarPoint: 'l23c6_people_places', wrong: 'He has cross a field.', accepted: ['He has crossed a field.'] },
    { id: 'l23c6-16', type: 'fix', grammarPoint: 'l23c6_life_change', wrong: 'He has became a citizen.', accepted: ['He has become a citizen.'] },
  ],
};
