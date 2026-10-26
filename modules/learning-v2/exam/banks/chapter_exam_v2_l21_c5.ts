// chapter_exam_v2_l21_c5.ts — банк экзамена v2: урок 21, глава 5 (эпизоды 33–40).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–40 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 5 — действие + to, чтобы сказать «зачем» (эпизоды 33–40). Ошибка на «for + действие» — частая у русскоязычных («для»).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C5: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l21c5_study', label: { ru: 'зачем — учёба и спорт: I join … to …', uk: 'навіщо — навчання і спорт: I join … to …' }, episodeOrdinals: [33, 34] },
    { id: 'l21c5_home_money', label: { ru: 'зачем — дом и деньги: I walk to save money', uk: 'навіщо — дім і гроші: I walk to save money' }, episodeOrdinals: [35, 36, 40] },
    { id: 'l21c5_weather_plans', label: { ru: 'зачем — погода, друзья, память', uk: 'навіщо — погода, друзі, памʼять' }, episodeOrdinals: [37, 38, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c5-01', type: 'situation', grammarPoint: 'l21c5_study', situation: { ru: 'Друг спрашивает, зачем ты ходишь на вечерние курсы. Скажи, что учишь там английский.', uk: 'Друг питає, навіщо ти ходиш на вечірні курси. Скажи, що вчиш там англійську.' }, accepted: ['I attend an evening class to improve my English.', 'I attend an evening class to learn English.'] },
    { id: 'l21c5-02', type: 'situation', grammarPoint: 'l21c5_study', situation: { ru: 'Ты записался в беговой клуб. Объясни, что хочешь стать выносливее.', uk: 'Ти записався в біговий клуб. Поясни, що хочеш стати витривалішим.' }, accepted: ['I join a running club to improve my fitness.'] },
    { id: 'l21c5-03', type: 'situation', grammarPoint: 'l21c5_home_money', situation: { ru: 'Коллега удивляется, что ты ходишь на работу пешком. Объясни: так ты экономишь деньги.', uk: 'Колега дивується, що ти ходиш на роботу пішки. Поясни: так ти заощаджуєш гроші.' }, accepted: ['I walk to save money.'] },
    { id: 'l21c5-04', type: 'situation', grammarPoint: 'l21c5_home_money', situation: { ru: 'При переезде ты подписываешь каждую коробку. Объясни, что так быстро найдёшь вещи.', uk: 'Під час переїзду ти підписуєш кожну коробку. Поясни, що так швидко знайдеш речі.' }, accepted: ['I label the boxes to find things quickly.'] },
    { id: 'l21c5-05', type: 'situation', grammarPoint: 'l21c5_weather_plans', situation: { ru: 'На улице жара. Скажи, что садишься в тень, чтобы не перегреться.', uk: 'Надворі спека. Скажи, що сідаєш у затінок, щоб не перегрітися.' }, accepted: ['I sit in the shade to keep cool.'] },
    { id: 'l21c5-06', type: 'situation', grammarPoint: 'l21c5_weather_plans', situation: { ru: 'На встрече ты всё записываешь. Объясни, что так запомнишь идеи.', uk: 'На зустрічі ти все записуєш. Поясни, що так запамʼятаєш ідеї.' }, accepted: ['I take notes to remember the ideas.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c5-07', type: 'dialogue', grammarPoint: 'l21c5_home_money', partnerLine: 'I buy tickets today.', situation: { ru: 'Друг покупает билеты в последний день. Скажи, что покупаешь их заранее, чтобы не стоять в очередях.', uk: 'Друг купує квитки в останній день. Скажи, що купуєш їх заздалегідь, щоб не стояти в чергах.' }, accepted: ['I buy tickets in advance to avoid queues.'] },
    { id: 'l21c5-08', type: 'dialogue', grammarPoint: 'l21c5_weather_plans', partnerLine: 'You must keep warm.', situation: { ru: 'Мама просит тебя не замёрзнуть. Скажи, что надеваешь пальто, чтобы было тепло.', uk: 'Мама просить тебе не змерзнути. Скажи, що вдягаєш пальто, щоб було тепло.' }, accepted: ['I wear a coat to keep warm.'] },
    { id: 'l21c5-09', type: 'dialogue', grammarPoint: 'l21c5_study', partnerLine: 'You are always with your study partner.', situation: { ru: 'Друг шутит, что ты всё время с напарником по учёбе. Объясни, что вы встречаетесь, чтобы повторять материал.', uk: 'Друг жартує, що ти весь час із напарником по навчанню. Поясни, що ви зустрічаєтеся, щоб повторювати матеріал.' }, accepted: ['I meet my study partner to revise.'] },
    { id: 'l21c5-10', type: 'dialogue', grammarPoint: 'l21c5_weather_plans', partnerLine: 'You always plan ahead.', situation: { ru: 'Друг смеётся, что ты всё планируешь заранее. Объясни, что так не спешишь по утрам.', uk: 'Друг сміється, що ти все плануєш заздалегідь. Поясни, що так не поспішаєш уранці.' }, accepted: ['I plan ahead to avoid rushing.'] },
    { id: 'l21c5-11', type: 'dialogue', grammarPoint: 'l21c5_home_money', partnerLine: 'Your old clothes are good.', situation: { ru: 'Друг видит пакет с твоей старой одеждой. Скажи, что отдаёшь одежду, чтобы помочь другим.', uk: 'Друг бачить пакет із твоїм старим одягом. Скажи, що віддаєш одяг, щоб допомогти іншим.' }, accepted: ['I donate clothes to help others.', 'I donate my old clothes to help others.', 'I donate my clothes to help others.'] },
    { id: 'l21c5-12', type: 'dialogue', grammarPoint: 'l21c5_weather_plans', partnerLine: 'You have a guest list.', situation: { ru: 'Подруга видит у тебя список гостей. Объясни, что пишешь его, чтобы никого не забыть.', uk: 'Подруга бачить у тебе список гостей. Поясни, що пишеш його, щоб нікого не забути.' }, accepted: ['I write a guest list to remember everyone.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c5-13', type: 'fix', grammarPoint: 'l21c5_study', wrong: 'I join a study group for learn English.', accepted: ['I join a study group to learn English.'] },
    { id: 'l21c5-14', type: 'fix', grammarPoint: 'l21c5_home_money', wrong: 'I book online for saving time.', accepted: ['I book online to save time.'] },
    { id: 'l21c5-15', type: 'fix', grammarPoint: 'l21c5_weather_plans', wrong: 'I go inside for take shelter.', accepted: ['I go inside to take shelter.'] },
    { id: 'l21c5-16', type: 'fix', grammarPoint: 'l21c5_home_money', wrong: 'I stack the plates for save space.', accepted: ['I stack the plates to save space.'] },
  ],
};
