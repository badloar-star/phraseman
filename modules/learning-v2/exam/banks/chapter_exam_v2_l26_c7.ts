// chapter_exam_v2_l26_c7.ts — банк экзамена v2: урок 26, глава 7 (эпизоды 49–56). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–56 урока 26 — повтор урока: when / if + настоящее (обещания, просьбы, советы) и had … by the time.
// Ситуация и ответ сходятся по смыслу. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C7: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l26c7_when', label: { ru: 'когда — I will listen when you are ready', uk: 'коли — I will listen when you are ready' }, episodeOrdinals: [49, 50, 52] },
    { id: 'l26c7_if', label: { ru: 'если — tell me if you need help', uk: 'якщо — tell me if you need help' }, episodeOrdinals: [49, 51, 54] },
    { id: 'l26c7_by_the_time', label: { ru: 'к тому моменту уже — had … by the time', uk: 'на той момент уже — had … by the time' }, episodeOrdinals: [49, 51, 52] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c7-01', type: 'situation', grammarPoint: 'l26c7_when', situation: { ru: 'Друг расстроен и пока не хочет говорить. Скажи, что выслушаешь, когда он будет готов.', uk: 'Друг засмучений і поки не хоче говорити. Скажи, що вислухаєш, коли він буде готовий.' }, accepted: ['I will listen when you are ready.'] },
    { id: 'l26c7-02', type: 'situation', grammarPoint: 'l26c7_if', situation: { ru: 'Ты уходишь, а друг остаётся с ремонтом. Попроси сказать, если ему нужна помощь.', uk: 'Ти йдеш, а друг лишається з ремонтом. Попроси сказати, якщо йому потрібна допомога.' }, accepted: ['Tell me if you need help.'] },
    { id: 'l26c7-03', type: 'situation', grammarPoint: 'l26c7_by_the_time', situation: { ru: 'Утром вы поссорились, а к ужину уже помирились. Расскажи об этом.', uk: 'Уранці ви посварилися, а до вечері вже помирилися. Розкажи про це.' }, accepted: ['We had made up by the time dinner was ready.'] },
    { id: 'l26c7-04', type: 'situation', grammarPoint: 'l26c7_when', situation: { ru: 'Ты механик. Скажи клиенту, что позвонишь, когда машина будет готова.', uk: 'Ти механік. Скажи клієнтові, що подзвониш, коли машина буде готова.' }, accepted: ['I will call you when it is ready.', 'I will call you when the car is ready.'] },
    { id: 'l26c7-05', type: 'situation', grammarPoint: 'l26c7_if', situation: { ru: 'Друг лезет под кровать за мячом. Скажи, чтобы взял фонарик, если там темно.', uk: 'Друг лізе під ліжко по м’яч. Скажи, щоб узяв ліхтарик, якщо там темно.' }, accepted: ['Use the torch if it is dark.'] },
    { id: 'l26c7-06', type: 'situation', grammarPoint: 'l26c7_by_the_time', situation: { ru: 'Ты позвонил в парикмахерскую, но она уже не работала. Расскажи об этом.', uk: 'Ти подзвонив до перукарні, але вона вже не працювала. Розкажи про це.' }, accepted: ['The barbershop had closed by the time I called.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c7-07', type: 'dialogue', grammarPoint: 'l26c7_if', partnerLine: 'This blazer is too small.', situation: { ru: 'Посоветуй примерить другой размер.', uk: 'Порадь приміряти інший розмір.' }, accepted: ['Try another size if it is too small.', 'Try another size.'] },
    { id: 'l26c7-08', type: 'dialogue', grammarPoint: 'l26c7_when', partnerLine: 'Sit down, please.', situation: { ru: 'На стуле сумка. Скажи, что сядешь, когда он её уберёт.', uk: 'На стільці сумка. Скажи, що сядеш, коли він її прибере.' }, accepted: ['I will sit down when you move the bag.'] },
    { id: 'l26c7-09', type: 'dialogue', grammarPoint: 'l26c7_by_the_time', partnerLine: 'Our guests arrived.', situation: { ru: 'Скажи, что ты убрал сумки к их приходу.', uk: 'Скажи, що ти прибрав сумки до їхнього приходу.' }, accepted: ['I had put the bags away by the time our guests arrived.', 'I had put the bags away by the time they arrived.'] },
    { id: 'l26c7-10', type: 'dialogue', grammarPoint: 'l26c7_if', partnerLine: 'I am hungry.', situation: { ru: 'Предложи ему супа.', uk: 'Запропонуй йому супу.' }, accepted: ['Have some soup if you are hungry.', 'Have some soup.'] },
    { id: 'l26c7-11', type: 'dialogue', grammarPoint: 'l26c7_if', partnerLine: 'He is tired.', situation: { ru: 'Скажи: пусть отдохнёт, если устал.', uk: 'Скажи: хай відпочине, якщо втомився.' }, accepted: ['Let him rest if he is tired.', 'Let him rest.'] },
    { id: 'l26c7-12', type: 'dialogue', grammarPoint: 'l26c7_by_the_time', partnerLine: 'She called you.', situation: { ru: 'Скажи, что ты уже ушёл из салона к тому времени.', uk: 'Скажи, що ти вже пішов із салону на той час.' }, accepted: ['I had left the salon by the time she called.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c7-13', type: 'fix', grammarPoint: 'l26c7_when', wrong: 'I will listen when you will be ready.', accepted: ['I will listen when you are ready.'] },
    { id: 'l26c7-14', type: 'fix', grammarPoint: 'l26c7_if', wrong: 'Use the torch if it will be dark.', accepted: ['Use the torch if it is dark.'] },
    { id: 'l26c7-15', type: 'fix', grammarPoint: 'l26c7_by_the_time', wrong: 'She has arrived by the time I called.', accepted: ['She had arrived by the time I called.'] },
    { id: 'l26c7-16', type: 'fix', grammarPoint: 'l26c7_when', wrong: 'I will call you when I will reach the bridge.', accepted: ['I will call you when I reach the bridge.'] },
  ],
};
