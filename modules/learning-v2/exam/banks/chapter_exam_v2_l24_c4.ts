// chapter_exam_v2_l24_c4.ts — банк экзамена v2: урок 24, глава 4 (эпизоды 25–32). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–32 урока 24 — have / has + результат сейчас против прошлого с yesterday / last week / last year.
// Ситуация подсказывает выбор: важен результат сейчас или названо время в прошлом. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C4: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l24c4_result', label: { ru: 'результат сейчас — I have found', uk: 'результат зараз — I have found' }, episodeOrdinals: [25, 27, 31] },
    { id: 'l24c4_when', label: { ru: 'названо время — found yesterday', uk: 'названо час — found yesterday' }, episodeOrdinals: [25, 26, 28] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c4-01', type: 'situation', grammarPoint: 'l24c4_result', situation: { ru: 'Ты поднял с тротуара доллар и держишь его в руке. Скажи другу, что нашёл доллар.', uk: 'Ти підняв із тротуару долар і тримаєш його в руці. Скажи другові, що знайшов долар.' }, accepted: ['I have found a dollar.'] },
    { id: 'l24c4-02', type: 'situation', grammarPoint: 'l24c4_when', situation: { ru: 'Друг спрашивает, откуда у тебя новые книги. Скажи, что вчера купил несколько книг.', uk: 'Друг питає, звідки в тебе нові книжки. Скажи, що вчора купив кілька книжок.' }, accepted: ['I bought several books yesterday.'] },
    { id: 'l24c4-03', type: 'situation', grammarPoint: 'l24c4_result', situation: { ru: 'На столе пустая тарелка из-под торта. Признайся, что съел весь торт.', uk: 'На столі порожня тарілка з-під торта. Зізнайся, що з’їв увесь торт.' }, accepted: ['I have eaten the whole cake.', "I've eaten the whole cake."] },
    { id: 'l24c4-04', type: 'situation', grammarPoint: 'l24c4_when', situation: { ru: 'Расскажи о вчерашней прогулке: было довольно холодно.', uk: 'Розкажи про вчорашню прогулянку: було досить холодно.' }, accepted: ['It was rather cold yesterday.'] },
    { id: 'l24c4-05', type: 'situation', grammarPoint: 'l24c4_when', situation: { ru: 'Коллега спрашивает про выходные. Скажи, что вчера вы ездили в исторический замок.', uk: 'Колега питає про вихідні. Скажи, що вчора ви їздили до історичного замку.' }, accepted: ['We visited a historic castle yesterday.'] },
    { id: 'l24c4-06', type: 'situation', grammarPoint: 'l24c4_result', situation: { ru: 'Учитель замечает, что ты стал говорить чище. Скажи, что ты улучшил произношение.', uk: 'Учитель помічає, що ти став говорити чистіше. Скажи, що ти покращив вимову.' }, accepted: ['I have improved my pronunciation.', "I've improved my pronunciation."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c4-07', type: 'dialogue', grammarPoint: 'l24c4_when', partnerLine: 'The police have caught the burglar.', situation: { ru: 'Скажи, что ты видел этого преступника вчера.', uk: 'Скажи, що ти бачив цього злочинця вчора.' }, accepted: ['I saw the criminal yesterday.'] },
    { id: 'l24c4-08', type: 'dialogue', grammarPoint: 'l24c4_result', partnerLine: 'She played cricket yesterday.', situation: { ru: 'Скажи, что ты уже пробовал бокс.', uk: 'Скажи, що ти вже пробував бокс.' }, accepted: ['I have tried boxing.', "I've tried boxing.", 'I have already tried boxing.', "I've already tried boxing."] },
    { id: 'l24c4-09', type: 'dialogue', grammarPoint: 'l24c4_when', partnerLine: 'I have checked the score.', situation: { ru: 'Скажи, что ты проверил счёт ещё вчера.', uk: 'Скажи, що ти перевірив рахунок ще вчора.' }, accepted: ['I checked the score yesterday.'] },
    { id: 'l24c4-10', type: 'dialogue', grammarPoint: 'l24c4_result', partnerLine: 'She spent a pound yesterday.', situation: { ru: 'Похвастайся: ты сберёг каждый цент.', uk: 'Похвалися: ти зберіг кожен цент.' }, accepted: ['I have saved every cent.', "I've saved every cent."] },
    { id: 'l24c4-11', type: 'dialogue', grammarPoint: 'l24c4_when', partnerLine: 'We have heard a strange noise.', situation: { ru: 'Скажи, что ты слышал странный шум вчера.', uk: 'Скажи, що ти чув дивний шум учора.' }, accepted: ['I heard a strange noise yesterday.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c4-12', type: 'fix', grammarPoint: 'l24c4_when', wrong: 'I have found a dollar yesterday.', accepted: ['I found a dollar yesterday.'] },
    { id: 'l24c4-13', type: 'fix', grammarPoint: 'l24c4_when', wrong: 'She has bought several books yesterday.', accepted: ['She bought several books yesterday.'] },
    { id: 'l24c4-14', type: 'fix', grammarPoint: 'l24c4_result', wrong: 'We have eat the whole cake.', accepted: ['We have eaten the whole cake.'] },
    { id: 'l24c4-15', type: 'fix', grammarPoint: 'l24c4_when', wrong: 'He go to prison last year.', accepted: ['He went to prison last year.'] },
  ],
};
