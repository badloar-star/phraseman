// chapter_exam_v2_l12_c6.ts — банк экзамена v2: урок 12, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–48 урока 12
// (прошедшее время о повседневных делах: closed, washed, checked, watched, noticed, enjoyed, cooked, used, visited; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C6: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l12c6_closed', label: { ru: 'закрыл, помыл, проверил — closed, washed, checked', uk: 'зачинив, помив, перевірив — closed, washed, checked' }, episodeOrdinals: [41, 45, 48] },
    { id: 'l12c6_watched', label: { ru: 'смотрел, заметил, понравилось — watched, noticed, enjoyed', uk: 'дивився, помітив, сподобалося — watched, noticed, enjoyed' }, episodeOrdinals: [42, 46, 47] },
    { id: 'l12c6_cooked', label: { ru: 'приготовил, побывал — cooked, used, visited', uk: 'приготував, побував — cooked, used, visited' }, episodeOrdinals: [43, 44] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c6-01', type: 'situation', grammarPoint: 'l12c6_closed', situation: { ru: 'Перед поездкой ты закрыл багажник. Скажи водителю.', uk: 'Перед поїздкою ти зачинив багажник. Скажи водієві.' }, accepted: ['I closed the car boot.'] },
    { id: 'l12c6-02', type: 'situation', grammarPoint: 'l12c6_watched', situation: { ru: 'Вчера вечером ты смотрел на грозу из окна. Расскажи об этом.', uk: 'Учора ввечері ти дивився на грозу з вікна. Розкажи про це.' }, accepted: ['I watched the thunderstorm from the window.', 'I watched the thunderstorm.'] },
    { id: 'l12c6-03', type: 'situation', grammarPoint: 'l12c6_cooked', situation: { ru: 'Гости хвалят салат. Скажи, что ты приготовил для него нут.', uk: 'Гості хвалять салат. Скажи, що ти приготував для нього нут.' }, accepted: ['I cooked the chickpeas for the salad.', 'I cooked the chickpeas.'] },
    { id: 'l12c6-04', type: 'situation', grammarPoint: 'l12c6_cooked', situation: { ru: 'Расскажи, что вы зашли в магазин одежды у вокзала.', uk: 'Розкажи, що ви зайшли до магазину одягу біля вокзалу.' }, accepted: ['We visited a clothes shop near the station.'] },
    { id: 'l12c6-05', type: 'situation', grammarPoint: 'l12c6_closed', situation: { ru: 'На вокзале ты сверил номер платформы. Скажи другу, что проверил его.', uk: 'На вокзалі ти звірив номер платформи. Скажи другові, що перевірив його.' }, accepted: ['I checked the platform number.'] },
    { id: 'l12c6-06', type: 'situation', grammarPoint: 'l12c6_watched', situation: { ru: 'Ты собирался открыть коробку, но заметил на ней предупреждение. Скажи об этом.', uk: 'Ти збирався відкрити коробку, але помітив на ній попередження. Скажи про це.' }, accepted: ['I noticed a warning on the box.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c6-07', type: 'dialogue', grammarPoint: 'l12c6_watched', partnerLine: 'The guinea pig was in the garden yesterday.', situation: { ru: 'Скажи, что ты наблюдал за ней.', uk: 'Скажи, що ти спостерігав за нею.' }, accepted: ['I watched the guinea pig.'] },
    { id: 'l12c6-08', type: 'dialogue', grammarPoint: 'l12c6_closed', partnerLine: 'The car bonnet was dirty yesterday.', situation: { ru: 'Скажи, что вы его помыли.', uk: 'Скажи, що ви його помили.' }, accepted: ['We washed the car bonnet.'] },
    { id: 'l12c6-09', type: 'dialogue', grammarPoint: 'l12c6_closed', partnerLine: 'She checked the price tag.', situation: { ru: 'Скажи, что ты проверил свой размер обуви.', uk: 'Скажи, що ти перевірив свій розмір взуття.' }, accepted: ['I checked my shoe size.'] },
    { id: 'l12c6-10', type: 'dialogue', grammarPoint: 'l12c6_cooked', partnerLine: 'We used the salad bowl.', situation: { ru: 'Скажи, что ты положил в салат сладкую кукурузу.', uk: 'Скажи, що ти поклав у салат солодку кукурудзу.' }, accepted: ['I used sweetcorn in the salad.'] },
    { id: 'l12c6-11', type: 'dialogue', grammarPoint: 'l12c6_watched', partnerLine: 'We visited the park after lunch.', situation: { ru: 'Скажи, что тебе понравилось солнце в саду.', uk: 'Скажи, що тобі сподобалося сонце в саду.' }, accepted: ['I enjoyed the sunshine in the garden.', 'I enjoyed the sunshine.'] },
    { id: 'l12c6-12', type: 'dialogue', grammarPoint: 'l12c6_closed', partnerLine: 'We packed the suitcase.', situation: { ru: 'Скажи, что ты проверил багажную бирку.', uk: 'Скажи, що ти перевірив багажну бирку.' }, accepted: ['I checked the luggage tag.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c6-13', type: 'fix', grammarPoint: 'l12c6_closed', wrong: 'I close the car door yesterday.', accepted: ['I closed the car door yesterday.'] },
    { id: 'l12c6-14', type: 'fix', grammarPoint: 'l12c6_watched', wrong: 'We watch the budgie yesterday.', accepted: ['We watched the budgie yesterday.'] },
    { id: 'l12c6-15', type: 'fix', grammarPoint: 'l12c6_cooked', wrong: 'I cook the kidney beans yesterday.', accepted: ['I cooked the kidney beans yesterday.'] },
    { id: 'l12c6-16', type: 'fix', grammarPoint: 'l12c6_cooked', wrong: 'The shoe shop were closed yesterday.', accepted: ['The shoe shop was closed yesterday.'] },
  ],
};
