// chapter_exam_v2_l16_c5.ts — банк экзамена v2: урок 16, глава 5 (эпизоды 33–40). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 5 — три формы будущего: «I think … will be …» (предположение), «I am going to …» (план), «We are …ing tomorrow» (договорённость); слова — прилагательные о делах, вещах и поездках. Только слова и формы эпизодов 1–40 урока 16; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L16_C5: ChapterExamV2Bank = {
  lessonOrdinal: 16,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l16c5_will', label: { ru: 'предположение: I think … will be …', uk: 'припущення: I think … will be …' }, episodeOrdinals: [33, 34, 35, 38, 39] },
    { id: 'l16c5_going_to', label: { ru: 'план: I am going to …', uk: 'план: I am going to …' }, episodeOrdinals: [33, 34, 36, 37] },
    { id: 'l16c5_arranged', label: { ru: 'договорённость: We are …ing tomorrow', uk: 'домовленість: We are …ing tomorrow' }, episodeOrdinals: [33, 34, 38, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l16c5-01', type: 'situation', grammarPoint: 'l16c5_will', situation: { ru: 'Ты досмотрел трейлер скучного фильма. Скажи, что, по-твоему, фильм будет разочаровывающим.', uk: 'Ти додивився трейлер нудного фільму. Скажи, що, на твою думку, фільм буде розчаровуючим.' }, accepted: ['I think the film will be disappointing.'] },
    { id: 'l16c5-02', type: 'situation', grammarPoint: 'l16c5_will', situation: { ru: 'Ты поднял новый чемодан в магазине. Скажи, что, по-твоему, он будет лёгким в дороге.', uk: 'Ти підняв нову валізу в магазині. Скажи, що, на твою думку, вона буде легкою в дорозі.' }, accepted: ['I think the suitcase will be lightweight.'] },
    { id: 'l16c5-03', type: 'situation', grammarPoint: 'l16c5_going_to', situation: { ru: 'Тебя ждёт изнурительная поездка, и ты решил её избежать. Скажи о своём плане.', uk: 'Тебе чекає виснажлива поїздка, і ти вирішив її уникнути. Скажи про свій план.' }, accepted: ['I am going to avoid an exhausting trip.'] },
    { id: 'l16c5-04', type: 'situation', grammarPoint: 'l16c5_going_to', situation: { ru: 'Тебе нужны деньги на время. Скажи, что собираешься найти временную работу.', uk: 'Тобі потрібні гроші на певний час. Скажи, що збираєшся знайти тимчасову роботу.' }, accepted: ['I am going to find a temporary job.'] },
    { id: 'l16c5-05', type: 'situation', grammarPoint: 'l16c5_arranged', situation: { ru: 'Вы с другом договорились завтра пойти на освежающую прогулку. Скажи, что вы это делаете завтра.', uk: 'Ви з другом домовилися завтра піти на освіжальну прогулянку. Скажи, що ви це робите завтра.' }, accepted: ['We are taking a refreshing walk tomorrow.'] },
    { id: 'l16c5-06', type: 'situation', grammarPoint: 'l16c5_arranged', situation: { ru: 'Завтра вы забираете складной стол — всё уже решено. Скажи об этом.', uk: 'Завтра ви забираєте розкладний стіл — усе вже вирішено. Скажи про це.' }, accepted: ['We are collecting a foldable table tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l16c5-07', type: 'dialogue', grammarPoint: 'l16c5_will', partnerLine: 'I think the course will be demanding.', situation: { ru: 'Друг думает, что курс будет требовательным. Скажи, что опыт, по-твоему, будет стоящим.', uk: 'Друг думає, що курс буде вимогливим. Скажи, що досвід, на твою думку, буде вартим того.' }, accepted: ['I think the experience will be rewarding.'] },
    { id: 'l16c5-08', type: 'dialogue', grammarPoint: 'l16c5_will', partnerLine: 'I think the weather will be unpredictable.', situation: { ru: 'Друг говорит, что погода будет непредсказуемой. Скажи, что новая куртка, по-твоему, будет непродуваемой.', uk: 'Друг каже, що погода буде непередбачуваною. Скажи, що нова куртка, на твою думку, буде вітронепроникною.' }, accepted: ['I think the new jacket will be windproof.'] },
    { id: 'l16c5-09', type: 'dialogue', grammarPoint: 'l16c5_going_to', partnerLine: 'I think the trip will be exhausting.', situation: { ru: 'Друг думает, что поездка будет изнурительной. Скажи, что собираешься её избежать.', uk: 'Друг думає, що поїздка буде виснажливою. Скажи, що збираєшся її уникнути.' }, accepted: ['I am going to avoid an exhausting trip.', 'I am going to avoid the trip.'] },
    { id: 'l16c5-10', type: 'dialogue', grammarPoint: 'l16c5_going_to', partnerLine: 'I think the plates will be disposable.', situation: { ru: 'Друг думает, что тарелки будут одноразовыми. Скажи, что собираешься избегать одноразовых тарелок.', uk: 'Друг думає, що тарілки будуть одноразовими. Скажи, що збираєшся уникати одноразових тарілок.' }, accepted: ['I am going to avoid disposable plates.'] },
    { id: 'l16c5-11', type: 'dialogue', grammarPoint: 'l16c5_arranged', partnerLine: 'I think the chairs will be portable.', situation: { ru: 'Друг думает, что стулья будут переносными. Скажи, что завтра вы покупаете переносные стулья.', uk: 'Друг думає, що стільці будуть переносними. Скажи, що завтра ви купуєте переносні стільці.' }, accepted: ['We are buying portable chairs tomorrow.'] },
    { id: 'l16c5-12', type: 'dialogue', grammarPoint: 'l16c5_arranged', partnerLine: 'I think the visit will be last-minute.', situation: { ru: 'Друг думает, что визит будет в последний момент. Скажи, что завтра вы делаете такой визит — это уже решено.', uk: 'Друг думає, що візит буде в останню хвилину. Скажи, що завтра ви робите такий візит — це вже вирішено.' }, accepted: ['We are making a last-minute visit tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l16c5-13', type: 'fix', grammarPoint: 'l16c5_will', wrong: 'I think the task be manageable.', accepted: ['I think the task will be manageable.'] },
    { id: 'l16c5-14', type: 'fix', grammarPoint: 'l16c5_going_to', wrong: 'I going to find a temporary job.', accepted: ['I am going to find a temporary job.'] },
    { id: 'l16c5-15', type: 'fix', grammarPoint: 'l16c5_arranged', wrong: 'We taking a refreshing walk tomorrow.', accepted: ['We are taking a refreshing walk tomorrow.'] },
    { id: 'l16c5-16', type: 'fix', grammarPoint: 'l16c5_arranged', wrong: 'We are collecting foldable a table tomorrow.', accepted: ['We are collecting a foldable table tomorrow.'] },
  ],
};
