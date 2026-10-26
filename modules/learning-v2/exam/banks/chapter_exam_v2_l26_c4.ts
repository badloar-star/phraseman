// chapter_exam_v2_l26_c4.ts — банк экзамена v2: урок 26, глава 4 (эпизоды 25–32). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–32 урока 26 — unless (если не…), when / before о будущем и had … by the time. После unless,
// when, before — настоящее. Плюс вопрос «Have you … yet?» из эпизодов 29–30 (с 92b29de96 «?» запрещён только в уроке 1, координатор
// 26.10). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C4: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l26c4_unless', label: { ru: 'если не — unless it rains', uk: 'якщо не — unless it rains' }, episodeOrdinals: [25, 27, 29] },
    { id: 'l26c4_when', label: { ru: 'когда / перед — when, before', uk: 'коли / перед — when, before' }, episodeOrdinals: [26, 29, 30] },
    { id: 'l26c4_by_the_time', label: { ru: 'к тому моменту уже — had … by the time', uk: 'на той момент уже — had … by the time' }, episodeOrdinals: [26, 31, 32] },
    { id: 'l26c4_question', label: { ru: 'уже сделал? — Have you … yet?', uk: 'уже зробив? — Have you … yet?' }, episodeOrdinals: [29, 30] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c4-01', type: 'situation', grammarPoint: 'l26c4_unless', situation: { ru: 'Вы планируете обед во дворе. Скажи, что поедите на улице, если не пойдёт дождь.', uk: 'Ви плануєте обід у дворі. Скажи, що поїсте надворі, якщо не піде дощ.' }, accepted: ['We will eat outside unless it rains.'] },
    { id: 'l26c4-02', type: 'situation', grammarPoint: 'l26c4_unless', situation: { ru: 'Друг зовёт на ужин. Скажи, что придёшь, если не придётся работать.', uk: 'Друг кличе на вечерю. Скажи, що прийдеш, якщо не доведеться працювати.' }, accepted: ['I will come unless I have to work.'] },
    { id: 'l26c4-03', type: 'situation', grammarPoint: 'l26c4_when', situation: { ru: 'Ты едешь к другу. Скажи, что позвонишь, когда дойдёшь до его дома.', uk: 'Ти їдеш до друга. Скажи, що подзвониш, коли дійдеш до його будинку.' }, accepted: ['I will call when I reach your building.', 'I will call you when I reach your building.'] },
    { id: 'l26c4-04', type: 'situation', grammarPoint: 'l26c4_by_the_time', situation: { ru: 'Папа вернулся, а карман уже зашит. Скажи, что ты починил его к возвращению папы.', uk: 'Тато повернувся, а кишеня вже зашита. Скажи, що ти полагодив її до повернення тата.' }, accepted: ['I had repaired it by the time Dad came home.', 'I had repaired the pocket by the time Dad came home.'] },
    { id: 'l26c4-05', type: 'situation', grammarPoint: 'l26c4_unless', situation: { ru: 'Ребёнок тянется к коробке с подарком. Скажи, чтобы не открывал её, пока ты не разрешишь.', uk: 'Дитина тягнеться до коробки з подарунком. Скажи, щоб не відкривала її, поки ти не дозволиш.' }, accepted: ['Do not open it unless I say so.', "Don't open it unless I say so."] },
    { id: 'l26c4-06', type: 'situation', grammarPoint: 'l26c4_by_the_time', situation: { ru: 'В дороге телефон не сел. Скажи, что ты зарядил его к отъезду.', uk: 'У дорозі телефон не розрядився. Скажи, що ти зарядив його до від’їзду.' }, accepted: ['I had charged it by the time we left.', 'I had charged my phone by the time we left.', 'I had charged my cellphone by the time we left.'] },
    { id: 'l26c4-16', type: 'situation', grammarPoint: 'l26c4_question', situation: { ru: 'Мусорное ведро полное. Спроси соседа по квартире, вынес ли он уже мусор.', uk: 'Сміттєве відро повне. Запитай сусіда по квартирі, чи виніс він уже сміття.' }, accepted: ['Have you taken out the garbage yet?', 'Have you taken out the trash yet?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c4-07', type: 'dialogue', grammarPoint: 'l26c4_unless', partnerLine: 'Let us take the freeway.', situation: { ru: 'Согласись: поедете по трассе, если она не закрыта.', uk: 'Погодься: поїдете трасою, якщо вона не закрита.' }, accepted: ['We will take the freeway unless it is closed.'] },
    { id: 'l26c4-08', type: 'dialogue', grammarPoint: 'l26c4_when', partnerLine: 'I am busy now.', situation: { ru: 'Скажи, что встретишься с ним, когда он закончит.', uk: 'Скажи, що зустрінешся з ним, коли він закінчить.' }, accepted: ['I will meet you when you finish.'] },
    { id: 'l26c4-09', type: 'dialogue', grammarPoint: 'l26c4_question', partnerLine: 'The kids want candy.', situation: { ru: 'Спроси подругу, купила ли она уже конфеты.', uk: 'Запитай подругу, чи купила вона вже цукерки.' }, accepted: ['Have you bought any candy yet?'] },
    { id: 'l26c4-10', type: 'dialogue', grammarPoint: 'l26c4_by_the_time', partnerLine: 'The shop closed at nine.', situation: { ru: 'Скажи, что ты успел заплатить до закрытия.', uk: 'Скажи, що ти встиг заплатити до закриття.' }, accepted: ['I had paid by the time the shop closed.'] },
    { id: 'l26c4-11', type: 'dialogue', grammarPoint: 'l26c4_when', partnerLine: 'We are leaving.', situation: { ru: 'Скажи, что закроешь кран перед выходом.', uk: 'Скажи, що закрутиш кран перед виходом.' }, accepted: ['I will turn off the faucet before we leave.', 'I will turn off the tap before we leave.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c4-12', type: 'fix', grammarPoint: 'l26c4_unless', wrong: 'We will eat outside unless it will rain.', accepted: ['We will eat outside unless it rains.'] },
    { id: 'l26c4-13', type: 'fix', grammarPoint: 'l26c4_question', wrong: 'Have you buy any candy yet?', accepted: ['Have you bought any candy yet?'] },
    { id: 'l26c4-14', type: 'fix', grammarPoint: 'l26c4_when', wrong: 'I will call you when I will get home.', accepted: ['I will call you when I get home.'] },
    { id: 'l26c4-15', type: 'fix', grammarPoint: 'l26c4_by_the_time', wrong: 'I have charged it by the time we left.', accepted: ['I had charged it by the time we left.'] },
  ],
};
