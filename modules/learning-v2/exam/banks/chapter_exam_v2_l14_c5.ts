// chapter_exam_v2_l14_c5.ts — банк экзамена v2: урок 14, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–40 урока 14
// (while + длительное действие, when + событие; просьбы Please look up / step back); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C5: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l14c5_while', label: { ru: 'пока — while you were talking', uk: 'поки — while you were talking' }, episodeOrdinals: [33, 34, 37] },
    { id: 'l14c5_when', label: { ru: 'когда случилось — when the bus stopped', uk: 'коли сталося — when the bus stopped' }, episodeOrdinals: [35, 36, 38] },
    { id: 'l14c5_please', label: { ru: 'просьба — Please step back', uk: 'прохання — Please step back' }, episodeOrdinals: [33, 34, 35] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c5-01', type: 'situation', grammarPoint: 'l14c5_please', situation: { ru: 'Ты фотографируешь друга и хочешь снять его лицом к себе. Попроси его повернуться.', uk: 'Ти фотографуєш друга й хочеш зняти його обличчям до себе. Попроси його обернутися.' }, accepted: ['Please turn around.'] },
    { id: 'l14c5-02', type: 'situation', grammarPoint: 'l14c5_while', situation: { ru: 'Расскажи: ты сидел, а друг всё это время стоял.', uk: 'Розкажи: ти сидів, а друг увесь цей час стояв.' }, accepted: ['I was sitting while you were standing.'] },
    { id: 'l14c5-03', type: 'situation', grammarPoint: 'l14c5_when', situation: { ru: 'Ты стоял в автобусе, и вдруг автобус остановился. Расскажи.', uk: 'Ти стояв в автобусі, і раптом автобус зупинився. Розкажи.' }, accepted: ['I was standing when the bus stopped.'] },
    { id: 'l14c5-04', type: 'situation', grammarPoint: 'l14c5_please', situation: { ru: 'В узком проходе человек мешает пройти. Вежливо попроси его отойти в сторону.', uk: 'У вузькому проході людина заважає пройти. Ввічливо попроси її відійти вбік.' }, accepted: ['Please move aside.'] },
    { id: 'l14c5-05', type: 'situation', grammarPoint: 'l14c5_while', situation: { ru: 'Пока ты делал фото, подруга стояла неподвижно. Расскажи.', uk: 'Поки ти робив фото, подруга стояла нерухомо. Розкажи.' }, accepted: ['She was standing still while I was taking a photo.'] },
    { id: 'l14c5-06', type: 'situation', grammarPoint: 'l14c5_when', situation: { ru: 'Ты нюхал цветы, и тут пришла подруга. Расскажи.', uk: 'Ти нюхав квіти, і тут прийшла подруга. Розкажи.' }, accepted: ['I was sniffing the flowers when she arrived.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c5-07', type: 'dialogue', grammarPoint: 'l14c5_please', partnerLine: 'I was standing when the bus stopped.', situation: { ru: 'Попроси держаться за поручень.', uk: 'Попроси триматися за поручень.' }, accepted: ['Please hold on to the rail.'] },
    { id: 'l14c5-08', type: 'dialogue', grammarPoint: 'l14c5_while', partnerLine: 'They were laughing when she arrived.', situation: { ru: 'Скажи другу, что ты улыбался, пока он говорил.', uk: 'Скажи другові, що ти усміхався, поки він говорив.' }, accepted: ['I was smiling while you were talking.'] },
    { id: 'l14c5-09', type: 'dialogue', grammarPoint: 'l14c5_when', partnerLine: 'I was taking photos while she was drawing.', situation: { ru: 'Скажи другу, что вы смотрели на животных, когда он позвонил.', uk: 'Скажи другові, що ви дивилися на тварин, коли він зателефонував.' }, accepted: ['We were watching the animals when you called.'] },
    { id: 'l14c5-10', type: 'dialogue', grammarPoint: 'l14c5_please', partnerLine: 'You can lean back.', situation: { ru: 'Попроси наоборот наклониться вперёд.', uk: 'Попроси навпаки нахилитися вперед.' }, accepted: ['Please lean forward.'] },
    { id: 'l14c5-11', type: 'dialogue', grammarPoint: 'l14c5_while', partnerLine: 'She was giggling while I was telling the story.', situation: { ru: 'Скажи другу, что ты шёл, пока он говорил.', uk: 'Скажи другові, що ти йшов, поки він говорив.' }, accepted: ['I was walking while you were talking.'] },
    { id: 'l14c5-12', type: 'dialogue', grammarPoint: 'l14c5_when', partnerLine: 'They were working when we arrived.', situation: { ru: 'Скажи, что ты носил сено, когда она пришла.', uk: 'Скажи, що ти носив сіно, коли вона прийшла.' }, accepted: ['I was carrying hay when she arrived.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c5-13', type: 'fix', grammarPoint: 'l14c5_when', wrong: 'She was reaching for her bag while the doors opened.', accepted: ['She was reaching for her bag when the doors opened.'] },
    { id: 'l14c5-14', type: 'fix', grammarPoint: 'l14c5_when', wrong: 'I were standing when the bus stopped.', accepted: ['I was standing when the bus stopped.'] },
    { id: 'l14c5-15', type: 'fix', grammarPoint: 'l14c5_please', wrong: 'Please to step back.', accepted: ['Please step back.'] },
    { id: 'l14c5-16', type: 'fix', grammarPoint: 'l14c5_while', wrong: 'I was sitting while you was standing.', accepted: ['I was sitting while you were standing.'] },
  ],
};
