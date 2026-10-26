// chapter_exam_v2_l09_c3.ts — банк экзамена v2: урок 9, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–24 — как я себя чувствую сейчас (shivering, sweating, sighing), кто что делает is (not) + -ing, мы маршируем we are + -ing; вопросы Is / Are … -ing? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C3: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l09c3_feel', label: { ru: 'как я сейчас — I am (not) + -ing', uk: 'як я зараз — I am (not) + -ing' }, episodeOrdinals: [18, 19, 21] },
    { id: 'l09c3_watch', label: { ru: 'кто что делает — is (not) + -ing', uk: 'хто що робить — is (not) + -ing' }, episodeOrdinals: [20, 22, 24] },
    { id: 'l09c3_we', label: { ru: 'мы сейчас — we are + -ing', uk: 'ми зараз — we are + -ing' }, episodeOrdinals: [23] },
    { id: 'l09c3_ask', label: { ru: 'спросить, что происходит, — Is / Are … -ing?', uk: 'запитати, що відбувається, — Is / Are … -ing?' }, episodeOrdinals: [17, 18, 20, 22, 23] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c3-01', type: 'situation', grammarPoint: 'l09c3_feel', situation: { ru: 'На морозе друг видит, что ты дрожишь. Скажи, что тебя трясёт от холода.', uk: 'На морозі друг бачить, що ти тремтиш. Скажи, що тебе трусить від холоду.' }, accepted: ['I am shivering.', "I'm shivering."] },
    { id: 'l09c3-02', type: 'situation', grammarPoint: 'l09c3_ask', situation: { ru: 'Друг стоит на ветру без куртки. Спроси, не дрожит ли он.', uk: 'Друг стоїть на вітрі без куртки. Запитай, чи не тремтить він.' }, accepted: ['Are you shivering?'] },
    { id: 'l09c3-03', type: 'situation', grammarPoint: 'l09c3_watch', situation: { ru: 'Сын показывает на жука на странице книги. Скажи, что жук ползёт.', uk: 'Син показує на жука на сторінці книжки. Скажи, що жук повзе.' }, accepted: ['The beetle is crawling.'] },
    { id: 'l09c3-04', type: 'situation', grammarPoint: 'l09c3_we', situation: { ru: 'Вы с детьми шагаете в такт по двору. Напиши, что вы маршируете.', uk: 'Ви з дітьми крокуєте в такт подвір’ям. Напиши, що ви маршируєте.' }, accepted: ['We are marching.', "We're marching."] },
    { id: 'l09c3-05', type: 'situation', grammarPoint: 'l09c3_ask', situation: { ru: 'На фото лицо друга закрыто шарфом. Спроси, улыбается ли он.', uk: 'На фото обличчя друга закрите шарфом. Запитай, чи всміхається він.' }, accepted: ['Is he grinning?'] },
    { id: 'l09c3-06', type: 'situation', grammarPoint: 'l09c3_feel', situation: { ru: 'После тренировки ты совсем не устал. Скажи, что ты не потеешь.', uk: 'Після тренування ти зовсім не втомився. Скажи, що ти не пітнієш.' }, accepted: ['I am not sweating.', "I'm not sweating."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c3-07', type: 'dialogue', grammarPoint: 'l09c3_feel', partnerLine: 'Are you shivering?', situation: { ru: 'Тебе тепло. Скажи, что ты не дрожишь.', uk: 'Тобі тепло. Скажи, що ти не тремтиш.' }, accepted: ['I am not shivering.', "I'm not shivering."] },
    { id: 'l09c3-08', type: 'dialogue', grammarPoint: 'l09c3_watch', partnerLine: 'The snail is crawling.', situation: { ru: 'Скажи, что кролик у норы не ползёт.', uk: 'Скажи, що кролик біля нори не повзе.' }, accepted: ['The rabbit is not crawling.', "The rabbit isn't crawling."] },
    { id: 'l09c3-09', type: 'dialogue', grammarPoint: 'l09c3_we', partnerLine: 'The drummer is not marching.', situation: { ru: 'Скажи, что зато вы все маршируете.', uk: 'Скажи, що натомість ви всі маршируєте.' }, accepted: ['We are marching.', "We're marching."] },
    { id: 'l09c3-10', type: 'dialogue', grammarPoint: 'l09c3_ask', partnerLine: 'The snail is crawling.', situation: { ru: 'Спроси, ползёт ли жук.', uk: 'Запитай, чи повзе жук.' }, accepted: ['Is the beetle crawling?'] },
    { id: 'l09c3-11', type: 'dialogue', grammarPoint: 'l09c3_feel', partnerLine: 'There is a delay.', situation: { ru: 'Поезд снова задерживается. Скажи, что ты вздыхаешь.', uk: 'Потяг знову затримується. Скажи, що ти зітхаєш.' }, accepted: ['I am sighing.', "I'm sighing."] },
    { id: 'l09c3-12', type: 'dialogue', grammarPoint: 'l09c3_we', partnerLine: 'They are marching.', situation: { ru: 'Скажи, что вы сейчас не маршируете.', uk: 'Скажи, що ви зараз не маршируєте.' }, accepted: ['We are not marching.', "We aren't marching."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c3-13', type: 'fix', grammarPoint: 'l09c3_feel', wrong: 'I shivering.', accepted: ['I am shivering.', "I'm shivering."] },
    { id: 'l09c3-14', type: 'fix', grammarPoint: 'l09c3_watch', wrong: 'The beetle are crawling.', accepted: ['The beetle is crawling.'] },
    { id: 'l09c3-15', type: 'fix', grammarPoint: 'l09c3_we', wrong: 'We is marching.', accepted: ['We are marching.', "We're marching."] },
    { id: 'l09c3-16', type: 'fix', grammarPoint: 'l09c3_ask', wrong: 'Is they marching?', accepted: ['Are they marching?'] },
  ],
};
