// chapter_exam_v2_l26_c2.ts — банк экзамена v2: урок 26, глава 2 (эпизоды 9–16). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–16 урока 26 — if + настоящее, will (что сделаю, если…), just / already, had … by the time
// и вопрос «Have you packed … yet?» из эпизодов 12 и 14 (с 92b29de96 «?» запрещён только в уроке 1, координатор 26.10).
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C2: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l26c2_if_will', label: { ru: 'если …, то сделаю — if …, I will', uk: 'якщо …, то зроблю — if …, I will' }, episodeOrdinals: [9, 11, 15] },
    { id: 'l26c2_just_already', label: { ru: 'только что / уже — just, already', uk: 'щойно / вже — just, already' }, episodeOrdinals: [10, 13, 14] },
    { id: 'l26c2_by_the_time', label: { ru: 'к тому моменту уже — had … by the time', uk: 'на той момент уже — had … by the time' }, episodeOrdinals: [11, 12, 15] },
    { id: 'l26c2_question', label: { ru: 'уже сделал? — Have you … yet?', uk: 'уже зробив? — Have you … yet?' }, episodeOrdinals: [12, 14] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c2-01', type: 'situation', grammarPoint: 'l26c2_if_will', situation: { ru: 'Вы собираетесь в поход. Скажи, что соберёшь свои вещи, если вы выезжаете рано.', uk: 'Ви збираєтеся в похід. Скажи, що збереш свої речі, якщо ви виїжджаєте рано.' }, accepted: ['I will pack my stuff if we leave early.'] },
    { id: 'l26c2-02', type: 'situation', grammarPoint: 'l26c2_question', situation: { ru: 'Вы собираете малыша в поездку. Спроси мужа, положил ли он уже соску.', uk: 'Ви збираєте малюка в поїздку. Запитай чоловіка, чи поклав він уже соску.' }, accepted: ['Have you packed the dummy yet?'] },
    { id: 'l26c2-03', type: 'situation', grammarPoint: 'l26c2_just_already', situation: { ru: 'Ты хромаешь и держишься за ногу. Скажи, что только что ударил голень.', uk: 'Ти кульгаєш і тримаєшся за ногу. Скажи, що щойно вдарив гомілку.' }, accepted: ['I have just hit my shin.'] },
    { id: 'l26c2-04', type: 'situation', grammarPoint: 'l26c2_just_already', situation: { ru: 'Мама волнуется, что гостям нечего пить. Скажи, что уже наполнил чашки.', uk: 'Мама хвилюється, що гостям нічого пити. Скажи, що вже наповнив чашки.' }, accepted: ['I have already filled the cups.'] },
    { id: 'l26c2-05', type: 'situation', grammarPoint: 'l26c2_by_the_time', situation: { ru: 'Мама позвонила напомнить про врача, а ты уже записался. Расскажи об этом.', uk: 'Мама подзвонила нагадати про лікаря, а ти вже записався. Розкажи про це.' }, accepted: ['I had booked an appointment by the time Mum called.'] },
    { id: 'l26c2-06', type: 'situation', grammarPoint: 'l26c2_if_will', situation: { ru: 'Друг предлагает помочь с переездом. Скажи, что позвонишь, если тебе понадобится помощь.', uk: 'Друг пропонує допомогти з переїздом. Скажи, що подзвониш, якщо тобі знадобиться допомога.' }, accepted: ['I will call you if I need help.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c2-07', type: 'dialogue', grammarPoint: 'l26c2_question', partnerLine: 'The taxi is here.', situation: { ru: 'Сестра едет с ночёвкой. Спроси, собрала ли она уже ночную рубашку.', uk: 'Сестра їде з ночівлею. Запитай, чи зібрала вона вже нічну сорочку.' }, accepted: ['Have you packed your nightie yet?'] },
    { id: 'l26c2-08', type: 'dialogue', grammarPoint: 'l26c2_if_will', partnerLine: 'Oops!', situation: { ru: 'Подруга опрокинула стакан воды. Предложи принести тряпку, если нужно.', uk: 'Подруга перекинула склянку води. Запропонуй принести ганчірку, якщо треба.' }, accepted: ['I will get a cloth if you need one.'] },
    { id: 'l26c2-09', type: 'dialogue', grammarPoint: 'l26c2_just_already', partnerLine: 'I am hungry.', situation: { ru: 'Скажи, что ты только что сварил овсянку.', uk: 'Скажи, що ти щойно зварив вівсянку.' }, accepted: ['I have just made oatmeal.'] },
    { id: 'l26c2-10', type: 'dialogue', grammarPoint: 'l26c2_by_the_time', partnerLine: 'The taxi arrived.', situation: { ru: 'Скажи, что ты успел сложить коляску к его приезду.', uk: 'Скажи, що ти встиг скласти візок до його приїзду.' }, accepted: ['I had folded the buggy by the time the taxi arrived.'] },
    { id: 'l26c2-11', type: 'dialogue', grammarPoint: 'l26c2_by_the_time', partnerLine: 'Anna arrived.', situation: { ru: 'Скажи, что ты успел умыться к её приходу.', uk: 'Скажи, що ти встиг умитися до її приходу.' }, accepted: ['I had washed my face by the time Anna arrived.'] },
    { id: 'l26c2-12', type: 'dialogue', grammarPoint: 'l26c2_just_already', partnerLine: 'Please sort out the junk.', situation: { ru: 'Скажи, что ты уже разобрал хлам.', uk: 'Скажи, що ти вже розібрав мотлох.' }, accepted: ['I have already sorted out the junk.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c2-13', type: 'fix', grammarPoint: 'l26c2_if_will', wrong: 'I will pack my stuff if we will leave early.', accepted: ['I will pack my stuff if we leave early.'] },
    { id: 'l26c2-14', type: 'fix', grammarPoint: 'l26c2_just_already', wrong: 'I have just hitted my shin.', accepted: ['I have just hit my shin.'] },
    { id: 'l26c2-15', type: 'fix', grammarPoint: 'l26c2_by_the_time', wrong: 'I had change the diaper by the time the taxi arrived.', accepted: ['I had changed the diaper by the time the taxi arrived.'] },
    { id: 'l26c2-16', type: 'fix', grammarPoint: 'l26c2_question', wrong: 'Have you pack the dummy yet?', accepted: ['Have you packed the dummy yet?'] },
  ],
};
