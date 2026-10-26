// chapter_exam_v2_l13_c6.ts — банк экзамена v2: урок 13, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–48 урока 13
// (порядок событий: First…, Then…; в итоге не взял — didn’t + глагол); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C6: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l13c6_first', label: { ru: 'сначала — First', uk: 'спочатку — First' }, episodeOrdinals: [42, 43, 44] },
    { id: 'l13c6_then', label: { ru: 'потом — Then', uk: 'потім — Then' }, episodeOrdinals: [41, 45, 46] },
    { id: 'l13c6_didnt', label: { ru: 'не взял, не купил — didn’t', uk: 'не взяв, не купив — didn’t' }, episodeOrdinals: [42, 43] },
    { id: 'l13c6_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [43, 46, 47] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c6-01', type: 'situation', grammarPoint: 'l13c6_first', situation: { ru: 'Ты собирался в спортзал. Расскажи, что сначала собрал спортивную сумку.', uk: 'Ти збирався до спортзалу. Розкажи, що спочатку зібрав спортивну сумку.' }, accepted: ['First I packed my sports bag.'] },
    { id: 'l13c6-02', type: 'situation', grammarPoint: 'l13c6_then', situation: { ru: 'Продолжи рассказ: потом ты погладил собаку.', uk: 'Продовж розповідь: потім ти погладив собаку.' }, accepted: ['Then I patted the dog.'] },
    { id: 'l13c6-03', type: 'situation', grammarPoint: 'l13c6_didnt', situation: { ru: 'Закончи рассказ: в итоге ты не взял сумку через плечо.', uk: 'Закінчи розповідь: зрештою ти не взяв сумку через плече.' }, accepted: ['In the end, I didn’t take my shoulder bag.', 'In the end, I did not take my shoulder bag.'] },
    { id: 'l13c6-04', type: 'situation', grammarPoint: 'l13c6_ask', situation: { ru: 'Спроси друга, попробовал ли он вафлю.', uk: 'Запитай друга, чи скуштував він вафлю.' }, accepted: ['Did you try a waffle?'] },
    { id: 'l13c6-05', type: 'situation', grammarPoint: 'l13c6_ask', situation: { ru: 'Друг гулял вечером в парке. Спроси, видел ли он ежа.', uk: 'Друг гуляв увечері в парку. Запитай, чи бачив він їжака.' }, accepted: ['Did you see a hedgehog?'] },
    { id: 'l13c6-06', type: 'situation', grammarPoint: 'l13c6_didnt', situation: { ru: 'Скажи, что вчера ты не писал перьевой ручкой.', uk: 'Скажи, що вчора ти не писав пір’яною ручкою.' }, accepted: ['I didn’t use a fountain pen yesterday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c6-07', type: 'dialogue', grammarPoint: 'l13c6_first', partnerLine: 'Then I wrote the address.', situation: { ru: 'Скажи, что сначала ты нашёл шариковую ручку.', uk: 'Скажи, що спочатку ти знайшов кулькову ручку.' }, accepted: ['First I found a ballpoint pen.'] },
    { id: 'l13c6-08', type: 'dialogue', grammarPoint: 'l13c6_then', partnerLine: 'First I opened the gate.', situation: { ru: 'Скажи, что потом ты полил тюльпан.', uk: 'Скажи, що потім ти полив тюльпан.' }, accepted: ['Then I watered the tulip.'] },
    { id: 'l13c6-09', type: 'dialogue', grammarPoint: 'l13c6_didnt', partnerLine: 'Did you use a felt-tip pen?', situation: { ru: 'Ответь, что нет.', uk: 'Відповідай, що ні.' }, accepted: ['I didn’t use a felt-tip pen.'] },
    { id: 'l13c6-10', type: 'dialogue', grammarPoint: 'l13c6_first', partnerLine: 'Then we walked to the lake.', situation: { ru: 'Скажи, что сначала ты увидел сосновую шишку.', uk: 'Скажи, що спочатку ти побачив соснову шишку.' }, accepted: ['First I saw a pine cone.'] },
    { id: 'l13c6-11', type: 'dialogue', grammarPoint: 'l13c6_then', partnerLine: 'First we saw a squirrel.', situation: { ru: 'Скажи, что потом вы увидели лису.', uk: 'Скажи, що потім ви побачили лисицю.' }, accepted: ['Then we saw a fox.'] },
    { id: 'l13c6-12', type: 'dialogue', grammarPoint: 'l13c6_didnt', partnerLine: 'First I bought cream cheese.', situation: { ru: 'Скажи, что сметану ты не купил.', uk: 'Скажи, що сметани ти не купив.' }, accepted: ['I didn’t buy sour cream.', 'I did not buy sour cream.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c6-13', type: 'fix', grammarPoint: 'l13c6_first', wrong: 'First I buy a baguette.', accepted: ['First I bought a baguette.'] },
    { id: 'l13c6-14', type: 'fix', grammarPoint: 'l13c6_then', wrong: 'Then she stroke the cat.', accepted: ['Then she stroked the cat.'] },
    { id: 'l13c6-15', type: 'fix', grammarPoint: 'l13c6_ask', wrong: 'Did you found an acorn?', accepted: ['Did you find an acorn?'] },
    { id: 'l13c6-16', type: 'fix', grammarPoint: 'l13c6_then', wrong: 'Then she find an acorn.', accepted: ['Then she found an acorn.'] },
  ],
};
