// chapter_exam_v2_l02_c5.ts — банк экзамена v2: урок 2, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 5 урока 2 закрепляет всё, что урок уже дал — сказать,
// сказать с not, спросить «да / нет» и спросить who / what / where — на новых словах о погоде, поломках, еде и жилье (33–40).
// Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C5: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l02c5_statement', label: { ru: 'сказать и сказать с not', uk: 'сказати й сказати з not' }, episodeOrdinals: [34, 37, 38] },
    { id: 'l02c5_yes_no_question', label: { ru: 'вопрос: Is it / Are you …?', uk: 'питання: Is it / Are you …?' }, episodeOrdinals: [33, 35, 36] },
    { id: 'l02c5_wh_question', label: { ru: 'вопрос: Who / What / Where …?', uk: 'питання: Who / What / Where …?' }, episodeOrdinals: [34, 35, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c5-01', type: 'situation', grammarPoint: 'l02c5_statement', situation: { ru: 'Ты открыл шторы, а улицы не видно. Скажи, что туманно.', uk: 'Ти відкрив штори, а вулиці не видно. Скажи, що туманно.' }, accepted: ['It is foggy.', "It's foggy."] },
    { id: 'l02c5-02', type: 'situation', grammarPoint: 'l02c5_yes_no_question', situation: { ru: 'В приглашении на свадьбу упомянут галстук. Спроси, обязательно ли это.', uk: 'У запрошенні на весілля згадано краватку. Запитай, чи це обов’язково.' }, accepted: ['Is it required?'] },
    { id: 'l02c5-03', type: 'situation', grammarPoint: 'l02c5_wh_question', situation: { ru: 'Ты помогаешь готовить праздник, но списка гостей не видел. Спроси, кто приглашён.', uk: 'Ти допомагаєш готувати свято, але списку гостей не бачив. Запитай, хто запрошений.' }, accepted: ['Who is invited?'] },
    { id: 'l02c5-04', type: 'situation', grammarPoint: 'l02c5_statement', situation: { ru: 'Под раковиной на кухне лужа. Скажи мастеру, что кран протекает.', uk: 'Під раковиною на кухні калюжа. Скажи майстрові, що кран протікає.' }, accepted: ['It is leaky.', "It's leaky."] },
    { id: 'l02c5-05', type: 'situation', grammarPoint: 'l02c5_yes_no_question', situation: { ru: 'Ты не ешь мясо. Спроси официанта, вегетарианское ли это блюдо.', uk: 'Ти не їси м’яса. Запитай офіціанта, чи ця страва вегетаріанська.' }, accepted: ['Is it vegetarian?'] },
    { id: 'l02c5-06', type: 'situation', grammarPoint: 'l02c5_statement', situation: { ru: 'В комнате общежития еле помещаются кровать и стол. Напиши маме, что тут тесно.', uk: 'У кімнаті гуртожитку ледь уміщаються ліжко й стіл. Напиши мамі, що тут тісно.' }, accepted: ['It is cramped.', "It's cramped."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c5-07', type: 'dialogue', grammarPoint: 'l02c5_wh_question', partnerLine: 'It is wobbly.', situation: { ru: 'Гость жалуется на мебель. Спроси, что именно шатается.', uk: 'Гість скаржиться на меблі. Запитай, що саме хитається.' }, accepted: ['What is wobbly?'] },
    { id: 'l02c5-08', type: 'dialogue', grammarPoint: 'l02c5_yes_no_question', partnerLine: 'I am tired.', situation: { ru: 'Друг остановился посреди пробежки. Спроси, задыхается ли он.', uk: 'Друг зупинився посеред пробіжки. Запитай, чи він задихається.' }, accepted: ['Are you breathless?'] },
    { id: 'l02c5-09', type: 'dialogue', grammarPoint: 'l02c5_statement', partnerLine: 'It is safe.', situation: { ru: 'Возрази: старый мост гнилой — он опасный.', uk: 'Заперечи: старий міст гнилий — він небезпечний.' }, accepted: ['It is unsafe.', "It's unsafe.", 'It is not safe.', "It's not safe."] },
    { id: 'l02c5-10', type: 'dialogue', grammarPoint: 'l02c5_wh_question', partnerLine: 'He is ill.', situation: { ru: 'Коллега сообщает, что начальник заболел. Спроси, где он.', uk: 'Колега повідомляє, що начальник захворів. Запитай, де він.' }, accepted: ['Where is he?'] },
    { id: 'l02c5-11', type: 'dialogue', grammarPoint: 'l02c5_yes_no_question', partnerLine: 'It is tender.', situation: { ru: 'Повар хвалит своё мясо. Спроси, вкусное ли оно.', uk: 'Кухар хвалить своє м’ясо. Запитай, чи воно смачне.' }, accepted: ['Is it tasty?'] },
    { id: 'l02c5-12', type: 'dialogue', grammarPoint: 'l02c5_statement', partnerLine: 'It is snug.', situation: { ru: 'Возрази: диван в гостинице старый и потёртый.', uk: 'Заперечи: диван у готелі старий і потертий.' }, accepted: ['It is shabby.', "It's shabby."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c5-13', type: 'fix', grammarPoint: 'l02c5_wh_question', wrong: 'Who invited is?', accepted: ['Who is invited?'] },
    { id: 'l02c5-14', type: 'fix', grammarPoint: 'l02c5_yes_no_question', wrong: 'Are it optional?', accepted: ['Is it optional?'] },
    { id: 'l02c5-15', type: 'fix', grammarPoint: 'l02c5_statement', wrong: 'It not is icy.', accepted: ['It is not icy.', "It's not icy."] },
    { id: 'l02c5-16', type: 'fix', grammarPoint: 'l02c5_yes_no_question', wrong: 'Is you breathless?', accepted: ['Are you breathless?'] },
  ],
};
