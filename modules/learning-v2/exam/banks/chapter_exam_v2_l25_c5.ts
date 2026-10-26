// chapter_exam_v2_l25_c5.ts — банк экзамена v2: урок 25, глава 5 (эпизоды 33–40). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–40 урока 25 — had + форма с by the time: к моменту второго события первое уже случилось.
// Ситуация задаёт оба события. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C5: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l25c5_by_the_time', label: { ru: 'к тому моменту уже — had … by the time', uk: 'на той момент уже — had … by the time' }, episodeOrdinals: [33, 34, 35] },
    { id: 'l25c5_people', label: { ru: 'кто что успел — the traveller had packed', uk: 'хто що встиг — the traveller had packed' }, episodeOrdinals: [37, 38, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c5-01', type: 'situation', grammarPoint: 'l25c5_by_the_time', situation: { ru: 'Подруга подошла к двери, а ты уже вставил ключ в замок. Расскажи об этом.', uk: 'Подруга підійшла до дверей, а ти вже вставив ключ у замок. Розкажи про це.' }, accepted: ['I had inserted the key by the time she reached the door.'] },
    { id: 'l25c5-02', type: 'situation', grammarPoint: 'l25c5_by_the_time', situation: { ru: 'Ты узнал сплетню последним. Скажи, что слух уже разошёлся к тому моменту, как ты его услышал.', uk: 'Ти дізнався плітку останнім. Скажи, що чутка вже розійшлася на той момент, як ти її почув.' }, accepted: ['The rumour had spread by the time I heard it.'] },
    { id: 'l25c5-03', type: 'situation', grammarPoint: 'l25c5_by_the_time', situation: { ru: 'Медсестра пришла, но кровь из носа уже не шла. Расскажи об этом.', uk: 'Медсестра прийшла, але кров із носа вже не йшла. Розкажи про це.' }, accepted: ['My nostril had stopped bleeding by the time the nurse arrived.'] },
    { id: 'l25c5-04', type: 'situation', grammarPoint: 'l25c5_people', situation: { ru: 'Такси приехало, а путешественник уже собрал вещи. Расскажи об этом.', uk: 'Таксі приїхало, а мандрівник уже зібрав речі. Розкажи про це.' }, accepted: ['The traveller had packed by the time the taxi arrived.'] },
    { id: 'l25c5-05', type: 'situation', grammarPoint: 'l25c5_people', situation: { ru: 'Ты нашёл телефон, а звонивший уже оставил сообщение. Расскажи об этом.', uk: 'Ти знайшов телефон, а той, хто дзвонив, уже залишив повідомлення. Розкажи про це.' }, accepted: ['The caller had left a message by the time I found my phone.'] },
    { id: 'l25c5-06', type: 'situation', grammarPoint: 'l25c5_by_the_time', situation: { ru: 'Ты ударил руку по дороге, а дома костяшка уже опухла. Расскажи об этом.', uk: 'Ти вдарив руку дорогою, а вдома кісточка вже набрякла. Розкажи про це.' }, accepted: ['My knuckle had swollen by the time we got home.', 'My knuckle had swollen by the time I got home.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c5-07', type: 'dialogue', grammarPoint: 'l25c5_by_the_time', partnerLine: 'We arrived at the party.', situation: { ru: 'Скажи, что они уже спланировали розыгрыш к вашему приходу.', uk: 'Скажи, що вони вже спланували розіграш на ваш прихід.' }, accepted: ['They had planned the prank by the time we arrived.'] },
    { id: 'l25c5-08', type: 'dialogue', grammarPoint: 'l25c5_people', partnerLine: 'The film started.', situation: { ru: 'Скажи, что зритель уже переключил канал к тому времени.', uk: 'Скажи, що глядач уже перемкнув канал на той час.' }, accepted: ['The viewer had changed the channel by the time the film started.'] },
    { id: 'l25c5-09', type: 'dialogue', grammarPoint: 'l25c5_people', partnerLine: 'I reached the till.', situation: { ru: 'Скажи, что покупатель уже заплатил к тому моменту.', uk: 'Скажи, що покупець уже заплатив на той момент.' }, accepted: ['The shopper had paid by the time you reached the till.'] },
    { id: 'l25c5-10', type: 'dialogue', grammarPoint: 'l25c5_people', partnerLine: 'It started raining.', situation: { ru: 'Скажи, что пенсионер успел сесть на автобус до этого.', uk: 'Скажи, що пенсіонер устиг сісти на автобус до цього.' }, accepted: ['The pensioner had caught the bus by the time it started raining.'] },
    { id: 'l25c5-11', type: 'dialogue', grammarPoint: 'l25c5_by_the_time', partnerLine: 'I caught the tray.', situation: { ru: 'Скажи, что тарелки к тому моменту уже разбились об пол.', uk: 'Скажи, що тарілки на той момент уже розбилися об підлогу.' }, accepted: ['The plates had crashed to the floor by the time you caught the tray.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c5-12', type: 'fix', grammarPoint: 'l25c5_by_the_time', wrong: 'The rumour has spread by the time I heard it.', accepted: ['The rumour had spread by the time I heard it.'] },
    { id: 'l25c5-13', type: 'fix', grammarPoint: 'l25c5_by_the_time', wrong: 'She had undo the buttons by the time I found the needle.', accepted: ['She had undone the buttons by the time I found the needle.'] },
    { id: 'l25c5-14', type: 'fix', grammarPoint: 'l25c5_people', wrong: 'The listener heard the news by the time I called.', accepted: ['The listener had heard the news by the time I called.'] },
    { id: 'l25c5-15', type: 'fix', grammarPoint: 'l25c5_by_the_time', wrong: 'We have removed the obstacle by the time the bus arrived.', accepted: ['We had removed the obstacle by the time the bus arrived.'] },
  ],
};
