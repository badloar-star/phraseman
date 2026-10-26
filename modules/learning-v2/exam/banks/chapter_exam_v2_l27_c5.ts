// chapter_exam_v2_l27_c5.ts — банк экзамена v2: урок 27, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 5 урока 27 — разговоры о чувствах и бытовых
// договорённостях: «я бы …, если бы …» (I would feel better if we shared the chores), «уже сделал» и вежливая просьба Could you …?
// (33–40). Обе части условия засчитываются в любом порядке. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L27_C5: ChapterExamV2Bank = {
  lessonOrdinal: 27,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l27c5_would_if', label: { ru: 'я бы …, если бы … — would + if', uk: 'я б …, якби … — would + if' }, episodeOrdinals: [33, 34, 35] },
    { id: 'l27c5_have_done', label: { ru: 'уже сделал — have + done', uk: 'уже зробив — have + done' }, episodeOrdinals: [34, 35, 37] },
    { id: 'l27c5_could_you', label: { ru: 'вежливая просьба — Could you …?', uk: 'ввічливе прохання — Could you …?' }, episodeOrdinals: [34, 36, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l27c5-01', type: 'situation', grammarPoint: 'l27c5_would_if', situation: { ru: 'Подруга весь вечер грустная, но молчит. Скажи, что выслушал бы её, если бы она хотела поговорить.', uk: 'Подруга весь вечір сумна, але мовчить. Скажи, що вислухав би її, якби вона хотіла поговорити.' }, accepted: ['I would listen if you wanted to talk.', 'If you wanted to talk, I would listen.'] },
    { id: 'l27c5-02', type: 'situation', grammarPoint: 'l27c5_have_done', situation: { ru: 'Коллега спрашивает, видел ли ты её письмо. Скажи, что уже прочитал её сообщение.', uk: 'Колега питає, чи бачив ти її листа. Скажи, що вже прочитав її повідомлення.' }, accepted: ['I have already read your message.'] },
    { id: 'l27c5-03', type: 'situation', grammarPoint: 'l27c5_would_if', situation: { ru: 'Вы каждый раз мчитесь в аэропорт в последний момент. Скажи, что ты был бы спокойнее, если бы вы выезжали раньше.', uk: 'Ви щоразу мчите до аеропорту в останню мить. Скажи, що ти був би спокійніший, якби ви виїжджали раніше.' }, accepted: ['I would feel calmer if we left earlier.', 'If we left earlier, I would feel calmer.'] },
    { id: 'l27c5-04', type: 'situation', grammarPoint: 'l27c5_have_done', situation: { ru: 'Соседка по квартире предлагает разделить уборку. Скажи, что ты уже убрал кухню.', uk: 'Сусідка по квартирі пропонує поділити прибирання. Скажи, що ти вже прибрав кухню.' }, accepted: ['I have already cleaned the kitchen.'] },
    { id: 'l27c5-05', type: 'situation', grammarPoint: 'l27c5_would_if', situation: { ru: 'Вся уборка дома на тебе. Скажи мужу, что ты чувствовал бы себя лучше, если бы вы делили домашние дела.', uk: 'Усе прибирання вдома на тобі. Скажи чоловікові, що ти почувався б краще, якби ви ділили хатні справи.' }, accepted: ['I would feel better if we shared the chores.', 'If we shared the chores, I would feel better.'] },
    { id: 'l27c5-06', type: 'situation', grammarPoint: 'l27c5_could_you', situation: { ru: 'За стеной сосед включил музыку на всю. Вежливо попроси его сделать потише.', uk: 'За стіною сусід увімкнув музику на повну. Ввічливо попроси його зробити тихіше.' }, accepted: ['Could you turn the music down?', 'Could you turn the music down a little?'] },
    { id: 'l27c5-07', type: 'situation', grammarPoint: 'l27c5_could_you', situation: { ru: 'У тебя болит плечо, а сумка тяжёлая. Попроси друга понести её.', uk: 'У тебе болить плече, а сумка важка. Попроси друга понести її.' }, accepted: ['Could you carry this bag for me?', 'Could you carry this bag?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c5-08', type: 'dialogue', grammarPoint: 'l27c5_have_done', partnerLine: 'Where did you last see the tickets?', situation: { ru: 'Ты в панике ищешь билеты. Скажи, что уже проверил сумку.', uk: 'Ти в паніці шукаєш квитки. Скажи, що вже перевірив сумку.' }, accepted: ['I have already checked my bag.'] },
    { id: 'l27c5-09', type: 'dialogue', grammarPoint: 'l27c5_would_if', partnerLine: 'We still have ten minutes.', situation: { ru: 'Десяти минут на серьёзный разговор мало. Скажи, что вы бы поговорили на улице, если бы было больше времени.', uk: 'Десяти хвилин на серйозну розмову мало. Скажи, що ви б поговорили надворі, якби було більше часу.' }, accepted: ['We would talk outside if we had more time.', 'If we had more time, we would talk outside.'] },
    { id: 'l27c5-10', type: 'dialogue', grammarPoint: 'l27c5_have_done', partnerLine: 'We need some flexibility with the dates.', situation: { ru: 'Ты ещё вчера звонил в гостиницу. Скажи, что уже спрашивал о датах.', uk: 'Ти ще вчора дзвонив до готелю. Скажи, що вже питав про дати.' }, accepted: ['I have already asked about the dates.'] },
    { id: 'l27c5-11', type: 'dialogue', grammarPoint: 'l27c5_could_you', partnerLine: 'This room faces the street.', situation: { ru: 'С улицы шумно. Попроси показать вам комнату потише.', uk: 'З вулиці шумно. Попроси показати вам тихішу кімнату.' }, accepted: ['Could we see a quieter room?', 'Could you show us a quieter room?'] },
    { id: 'l27c5-12', type: 'dialogue', grammarPoint: 'l27c5_could_you', partnerLine: 'Could we stop for a few minutes?', situation: { ru: 'Ты отойдёшь за водой. Попроси друга подождать тебя у входа.', uk: 'Ти відійдеш по воду. Попроси друга почекати тебе біля входу.' }, accepted: ['Could you wait by the entrance?', 'Could you wait for me by the entrance?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c5-13', type: 'fix', grammarPoint: 'l27c5_would_if', wrong: 'I would listen if you want to talk.', accepted: ['I would listen if you wanted to talk.', 'If you wanted to talk, I would listen.'] },
    { id: 'l27c5-14', type: 'fix', grammarPoint: 'l27c5_would_if', wrong: 'I would feel calmer if we leave earlier.', accepted: ['I would feel calmer if we left earlier.', 'If we left earlier, I would feel calmer.'] },
    { id: 'l27c5-15', type: 'fix', grammarPoint: 'l27c5_have_done', wrong: 'I have already check my bag.', accepted: ['I have already checked my bag.'] },
    { id: 'l27c5-16', type: 'fix', grammarPoint: 'l27c5_could_you', wrong: 'Could you to turn the music down?', accepted: ['Could you turn the music down?'] },
  ],
};
