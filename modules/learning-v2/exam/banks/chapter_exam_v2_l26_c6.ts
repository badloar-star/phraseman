// chapter_exam_v2_l26_c6.ts — банк экзамена v2: урок 26, глава 6 (эпизоды 41–48). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–48 урока 26 — when / if + настоящее о будущем и просьбах, had … by the time. Ситуация и ответ
// сходятся по смыслу. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C6: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l26c6_when', label: { ru: 'когда — I will help when I finish', uk: 'коли — I will help when I finish' }, episodeOrdinals: [41, 43, 46] },
    { id: 'l26c6_if', label: { ru: 'если — we can walk if the path is clear', uk: 'якщо — we can walk if the path is clear' }, episodeOrdinals: [42, 43, 47] },
    { id: 'l26c6_by_the_time', label: { ru: 'к тому моменту уже — had … by the time', uk: 'на той момент уже — had … by the time' }, episodeOrdinals: [41, 42, 45] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c6-01', type: 'situation', grammarPoint: 'l26c6_when', situation: { ru: 'Подруга просит салфетку, а ты выходишь на кухню. Скажи, что принесёшь, когда вернёшься.', uk: 'Подруга просить серветку, а ти виходиш на кухню. Скажи, що принесеш, коли повернешся.' }, accepted: ['I will bring one when I come back.'] },
    { id: 'l26c6-02', type: 'situation', grammarPoint: 'l26c6_if', situation: { ru: 'После снегопада вы смотрите на дорожку. Скажи, что можно пойти пешком, если она свободна.', uk: 'Після снігопаду ви дивитеся на доріжку. Скажи, що можна піти пішки, якщо вона вільна.' }, accepted: ['We can walk if the path is clear.'] },
    { id: 'l26c6-03', type: 'situation', grammarPoint: 'l26c6_by_the_time', situation: { ru: 'Подруга позвонила, а бельё ты уже развесил. Расскажи об этом.', uk: 'Подруга подзвонила, а білизну ти вже розвісив. Розкажи про це.' }, accepted: ['I had hung up the washing by the time she called.'] },
    { id: 'l26c6-04', type: 'situation', grammarPoint: 'l26c6_when', situation: { ru: 'Друг просит помочь в саду, а ты занят своим делом. Скажи, что поможешь, когда закончишь.', uk: 'Друг просить допомогти в саду, а ти зайнятий своєю справою. Скажи, що допоможеш, коли закінчиш.' }, accepted: ['I will help when I finish.', 'I will help you when I finish.'] },
    { id: 'l26c6-05', type: 'situation', grammarPoint: 'l26c6_by_the_time', situation: { ru: 'Начался дождь, но инструменты уже были в сарае. Расскажи об этом.', uk: 'Почався дощ, але інструменти вже були в сараї. Розкажи про це.' }, accepted: ['We had put the tools away by the time it started raining.'] },
    { id: 'l26c6-06', type: 'situation', grammarPoint: 'l26c6_if', situation: { ru: 'Гость пришёл в мокрой обуви. Скажи, чтобы оставил её здесь, если она мокрая.', uk: 'Гість прийшов у мокрому взутті. Скажи, щоб залишив його тут, якщо воно мокре.' }, accepted: ['Leave them here if your shoes are wet.', 'If they are wet, leave them here.', 'If your shoes are wet, leave them here.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c6-07', type: 'dialogue', grammarPoint: 'l26c6_if', partnerLine: 'It is warm outside.', situation: { ru: 'Скажи, что можно посидеть на улице, если стулья сухие.', uk: 'Скажи, що можна посидіти надворі, якщо стільці сухі.' }, accepted: ['We can sit outside if the chairs are dry.'] },
    { id: 'l26c6-08', type: 'dialogue', grammarPoint: 'l26c6_when', partnerLine: 'I have no paper.', situation: { ru: 'Скажи, что принесёшь бумагу, когда вернёшься.', uk: 'Скажи, що принесеш папір, коли повернешся.' }, accepted: ['I will bring some paper when I come back.'] },
    { id: 'l26c6-09', type: 'dialogue', grammarPoint: 'l26c6_by_the_time', partnerLine: 'The snow is gone.', situation: { ru: 'Скажи, что снег растаял ещё к вашей встрече.', uk: 'Скажи, що сніг розтанув ще до вашої зустрічі.' }, accepted: ['The snow had melted by the time we met.'] },
    { id: 'l26c6-10', type: 'dialogue', grammarPoint: 'l26c6_by_the_time', partnerLine: 'He left early.', situation: { ru: 'Скажи, что ты успел написать записку до его ухода.', uk: 'Скажи, що ти встиг написати записку до його відходу.' }, accepted: ['I had written the note by the time he left.'] },
    { id: 'l26c6-11', type: 'dialogue', grammarPoint: 'l26c6_when', partnerLine: 'Thank you for lunch.', situation: { ru: 'Скажи, что помоешь посуду, когда вы закончите.', uk: 'Скажи, що помиєш посуд, коли ви закінчите.' }, accepted: ['I will wash up when we finish.'] },
    { id: 'l26c6-12', type: 'dialogue', grammarPoint: 'l26c6_by_the_time', partnerLine: 'We arrived.', situation: { ru: 'Скажи, что они убрали комнату к вашему приезду.', uk: 'Скажи, що вони прибрали кімнату до вашого приїзду.' }, accepted: ['They had cleaned the room by the time we arrived.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c6-13', type: 'fix', grammarPoint: 'l26c6_when', wrong: 'I will help when I will finish.', accepted: ['I will help when I finish.'] },
    { id: 'l26c6-14', type: 'fix', grammarPoint: 'l26c6_if', wrong: 'We can walk if the path will be clear.', accepted: ['We can walk if the path is clear.'] },
    { id: 'l26c6-15', type: 'fix', grammarPoint: 'l26c6_by_the_time', wrong: 'The snow has melted by the time we met.', accepted: ['The snow had melted by the time we met.'] },
    { id: 'l26c6-16', type: 'fix', grammarPoint: 'l26c6_when', wrong: 'I will wash up when we will finish.', accepted: ['I will wash up when we finish.'] },
  ],
};
