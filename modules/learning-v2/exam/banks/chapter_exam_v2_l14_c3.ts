// chapter_exam_v2_l14_c3.ts — банк экзамена v2: урок 14, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–24 урока 14
// (длительное прошедшее как фон истории: It was raining, The baby was sleeping, was / were + -ing на кухне); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C3: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l14c3_background', label: { ru: 'фон истории — It was raining', uk: 'тло історії — It was raining' }, episodeOrdinals: [17, 20, 23] },
    { id: 'l14c3_kitchen', label: { ru: 'что делали на кухне — was / were + …ing', uk: 'що робили на кухні — was / were + …ing' }, episodeOrdinals: [18, 19, 22] },
    { id: 'l14c3_adding', label: { ru: 'добавлял, отмерял — adding, measuring', uk: 'додавав, відміряв — adding, measuring' }, episodeOrdinals: [22, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c3-01', type: 'situation', grammarPoint: 'l14c3_background', situation: { ru: 'Ты рассказываешь, как менял колесо. Начни с погоды: в то утро шёл дождь.', uk: 'Ти розповідаєш, як міняв колесо. Почни з погоди: того ранку йшов дощ.' }, accepted: ['It was raining that morning.'] },
    { id: 'l14c3-02', type: 'situation', grammarPoint: 'l14c3_kitchen', situation: { ru: 'Расскажи, что вчера в шесть ты готовил спаржу.', uk: 'Розкажи, що вчора о шостій ти готував спаржу.' }, accepted: ['I was cooking asparagus at six yesterday.', 'I was cooking asparagus.'] },
    { id: 'l14c3-03', type: 'situation', grammarPoint: 'l14c3_adding', situation: { ru: 'Ты пёк пирог. Расскажи, что отмерял обычную муку.', uk: 'Ти пік пиріг. Розкажи, що відміряв звичайне борошно.' }, accepted: ['I was measuring plain flour.'] },
    { id: 'l14c3-04', type: 'situation', grammarPoint: 'l14c3_background', situation: { ru: 'Вы собирались на прогулку. Скажи, что малыш в это время спал.', uk: 'Ви збиралися на прогулянку. Скажи, що малюк у цей час спав.' }, accepted: ['The baby was sleeping.'] },
    { id: 'l14c3-05', type: 'situation', grammarPoint: 'l14c3_kitchen', situation: { ru: 'Пришёл друг, а вы с сестрой резали красную капусту. Расскажи об этом.', uk: 'Прийшов друг, а ви з сестрою різали червону капусту. Розкажи про це.' }, accepted: ['We were cutting red cabbage.'] },
    { id: 'l14c3-06', type: 'situation', grammarPoint: 'l14c3_adding', situation: { ru: 'Ты рассказываешь, как готовил ужин: в тот момент ты добавлял соевый соус.', uk: 'Ти розповідаєш, як готував вечерю: у той момент ти додавав соєвий соус.' }, accepted: ['I was adding soy sauce.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c3-07', type: 'dialogue', grammarPoint: 'l14c3_background', partnerLine: 'Everyone was helping.', situation: { ru: 'Скажи, что пирог в это время пёкся.', uk: 'Скажи, що пиріг у цей час пікся.' }, accepted: ['The cake was baking.'] },
    { id: 'l14c3-08', type: 'dialogue', grammarPoint: 'l14c3_kitchen', partnerLine: 'Everyone was working in the kitchen.', situation: { ru: 'Скажи, что ты готовил ужин.', uk: 'Скажи, що ти готував вечерю.' }, accepted: ['I was cooking dinner.'] },
    { id: 'l14c3-09', type: 'dialogue', grammarPoint: 'l14c3_adding', partnerLine: 'I was reading the recipe.', situation: { ru: 'Скажи, что они отмеряли мелкий сахар.', uk: 'Скажи, що вони відміряли дрібний цукор.' }, accepted: ['They were measuring caster sugar.'] },
    { id: 'l14c3-10', type: 'dialogue', grammarPoint: 'l14c3_background', partnerLine: 'I was changing a flat tyre.', situation: { ru: 'Скажи, что люди ждали на улице.', uk: 'Скажи, що люди чекали надворі.' }, accepted: ['People were waiting outside.'] },
    { id: 'l14c3-11', type: 'dialogue', grammarPoint: 'l14c3_kitchen', partnerLine: 'She was peeling a lychee.', situation: { ru: 'Скажи, что вы резали питахайю.', uk: 'Скажи, що ви різали пітахаю.' }, accepted: ['We were cutting a dragon fruit.'] },
    { id: 'l14c3-12', type: 'dialogue', grammarPoint: 'l14c3_adding', partnerLine: 'Dinner was cooking.', situation: { ru: 'Скажи, что вы добавляли томатную пасту.', uk: 'Скажи, що ви додавали томатну пасту.' }, accepted: ['We were adding tomato paste.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c3-13', type: 'fix', grammarPoint: 'l14c3_background', wrong: 'It were raining that morning.', accepted: ['It was raining that morning.'] },
    { id: 'l14c3-14', type: 'fix', grammarPoint: 'l14c3_kitchen', wrong: 'She were washing spinach.', accepted: ['She was washing spinach.'] },
    { id: 'l14c3-15', type: 'fix', grammarPoint: 'l14c3_adding', wrong: 'I adding brown sugar.', accepted: ['I was adding brown sugar.'] },
    { id: 'l14c3-16', type: 'fix', grammarPoint: 'l14c3_background', wrong: 'The baby were sleeping.', accepted: ['The baby was sleeping.'] },
  ],
};
