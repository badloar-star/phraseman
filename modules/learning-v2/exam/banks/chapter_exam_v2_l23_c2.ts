// chapter_exam_v2_l23_c2.ts — банк экзамена v2: урок 23, глава 2 (эпизоды 9–16).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–16 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 2 — опыт жизни: I have visited / seen / been (эпизоды 9–16). Отрицаний и вопросов ещё нет.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C2: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l23c2_travel', label: { ru: 'поездки — I have visited, I have been on', uk: 'подорожі — I have visited, I have been on' }, episodeOrdinals: [9, 10] },
    { id: 'l23c2_tried', label: { ru: 'пробовал и видел — I have tried, I have seen', uk: 'куштував і бачив — I have tried, I have seen' }, episodeOrdinals: [11, 12] },
    { id: 'l23c2_animals', label: { ru: 'животные — I have seen, I have ridden', uk: 'тварини — I have seen, I have ridden' }, episodeOrdinals: [13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c2-01', type: 'situation', grammarPoint: 'l23c2_travel', situation: { ru: 'Друзья спорят, кто бывал в пустыне. Скажи, что ты бывал.', uk: 'Друзі сперечаються, хто бував у пустелі. Скажи, що ти бував.' }, accepted: ['I have visited a desert.'] },
    { id: 'l23c2-02', type: 'situation', grammarPoint: 'l23c2_travel', situation: { ru: 'Подруга вернулась из Кении. Расскажи коллегам, что она была на сафари.', uk: 'Подруга повернулася з Кенії. Розкажи колегам, що вона була на сафарі.' }, accepted: ['She has been on a safari.'] },
    { id: 'l23c2-03', type: 'situation', grammarPoint: 'l23c2_tried', situation: { ru: 'Официант советует лобстера, а ты его уже ел. Скажи об этом.', uk: 'Офіціант радить лобстера, а ти його вже їв. Скажи про це.' }, accepted: ['I have eaten lobster.', 'I have tried lobster.'] },
    { id: 'l23c2-04', type: 'situation', grammarPoint: 'l23c2_tried', situation: { ru: 'Друг думает, что ты никогда не был в опере. Скажи, что ты оперу уже видел.', uk: 'Друг думає, що ти ніколи не був в опері. Скажи, що ти оперу вже бачив.' }, accepted: ['I have seen an opera.', 'I have been to an opera.'] },
    { id: 'l23c2-05', type: 'situation', grammarPoint: 'l23c2_animals', situation: { ru: 'Сын расспрашивает про зоопарк. Скажи, что ты видел слона.', uk: 'Син розпитує про зоопарк. Скажи, що ти бачив слона.' }, accepted: ['I have seen an elephant.'] },
    { id: 'l23c2-06', type: 'situation', grammarPoint: 'l23c2_animals', situation: { ru: 'На ферме тебе предлагают урок верховой езды. Скажи, что ты уже ездил на лошади.', uk: 'На фермі тобі пропонують урок верхової їзди. Скажи, що ти вже їздив на коні.' }, accepted: ['I have ridden a horse.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c2-07', type: 'dialogue', grammarPoint: 'l23c2_travel', partnerLine: 'I have been on a cruise.', situation: { ru: 'Скажи, что вы с женой тоже были в круизе.', uk: 'Скажи, що ви з дружиною теж були в круїзі.' }, accepted: ['We have been on a cruise.'] },
    { id: 'l23c2-08', type: 'dialogue', grammarPoint: 'l23c2_travel', partnerLine: "You mustn't leave the path.", situation: { ru: 'Гид в джунглях волнуется за вас. Успокой его: вы уже ходили по джунглям.', uk: 'Гід у джунглях хвилюється за вас. Заспокой його: ви вже ходили джунглями.' }, accepted: ['We have walked through the jungle.'] },
    { id: 'l23c2-09', type: 'dialogue', grammarPoint: 'l23c2_tried', partnerLine: 'Try the seafood.', situation: { ru: 'Друг советует морепродукты. Скажи, что ты их уже пробовал.', uk: 'Друг радить морепродукти. Скажи, що ти їх уже куштував.' }, accepted: ['I have tried seafood.', 'I have tried the seafood.', 'I have eaten seafood.'] },
    { id: 'l23c2-10', type: 'dialogue', grammarPoint: 'l23c2_tried', partnerLine: 'The orchestra is here.', situation: { ru: 'Брат зовёт маму на концерт. Скажи, что она этот оркестр уже слышала.', uk: 'Брат кличе маму на концерт. Скажи, що вона цей оркестр уже чула.' }, accepted: ['She has heard this orchestra.', 'She has heard the orchestra.'] },
    { id: 'l23c2-11', type: 'dialogue', grammarPoint: 'l23c2_animals', partnerLine: 'The other animals are in the field.', situation: { ru: 'На ферме дочь хочет покормить корову. Скажи, что ты её уже покормил.', uk: 'На фермі донька хоче погодувати корову. Скажи, що ти її вже погодував.' }, accepted: ['I have fed the cow.'] },
    { id: 'l23c2-12', type: 'dialogue', grammarPoint: 'l23c2_animals', partnerLine: 'The tiger is here.', situation: { ru: 'В зоопарке сын зовёт к тигру. Скажи, что вы его уже видели.', uk: 'У зоопарку син кличе до тигра. Скажи, що ви його вже бачили.' }, accepted: ['We have seen the tiger.', 'We have watched the tiger.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c2-13', type: 'fix', grammarPoint: 'l23c2_travel', wrong: 'He has stay at a campsite.', accepted: ['He has stayed at a campsite.'] },
    { id: 'l23c2-14', type: 'fix', grammarPoint: 'l23c2_tried', wrong: 'We have eat lobster.', accepted: ['We have eaten lobster.'] },
    { id: 'l23c2-15', type: 'fix', grammarPoint: 'l23c2_animals', wrong: 'She has took a photo of a lion.', accepted: ['She has taken a photo of a lion.'] },
    { id: 'l23c2-16', type: 'fix', grammarPoint: 'l23c2_animals', wrong: 'He have drawn a giraffe.', accepted: ['He has drawn a giraffe.'] },
  ],
};
